import { createFileRoute } from "@tanstack/react-router";
import type Redis from "ioredis";
import type {
	AggregateCast,
	AggregateCredits,
	Cast,
	Credits,
	TMDB,
} from "tmdb-ts";

import type { NormalizedCast } from "~/types";

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 500; // Number of cast members to return per request
// TMDB serves roughly 40 req/s; past that it slows down and then answers 429.
// The limit is shared by every request in the process, since the client loads
// several pages of one title in parallel.
const MAX_CONCURRENT_PERSON_LOOKUPS = 30;
const CACHE_TTL_SECONDS = 86400; // 1 day
const DECEASED_PERSON_TTL_SECONDS = 30 * 86400; // A deathday doesn't change

// Cache helpers: Redis failures fall through to TMDB instead of failing the request
async function cacheGet(redis: Redis | null, key: string) {
	if (!redis) return null;
	try {
		return await redis.get(key);
	} catch (error) {
		console.warn(`Redis read failed for ${key}`, error);
		return null;
	}
}

async function cacheMget(redis: Redis | null, keys: string[]) {
	if (!redis || keys.length === 0) return keys.map(() => null);
	try {
		return await redis.mget(...keys);
	} catch (error) {
		console.warn("Redis batch read failed for credits cache", error);
		return keys.map(() => null);
	}
}

async function cacheSet(
	redis: Redis | null,
	key: string,
	value: unknown,
	ttlSeconds = CACHE_TTL_SECONDS,
) {
	if (!redis) return;
	try {
		await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
	} catch (error) {
		console.warn(`Redis write failed for ${key}`, error);
	}
}

type PersonDates = {
	birthday: string | null;
	deathday: string | null;
};

type CastEntry = Omit<NormalizedCast, "birthday" | "deathday">;

// Lookups currently in flight, shared so overlapping requests (two visitors
// opening the same title) only hit TMDB once per person
const pendingPersons = new Map<number, Promise<PersonDates | null>>();

function fetchPersonDates(
	personId: number,
	redis: Redis | null,
	tmdb: TMDB,
): Promise<PersonDates | null> {
	let pending = pendingPersons.get(personId);
	if (!pending) {
		pending = withPersonLookupSlot(() =>
			fetchPersonDatesUncached(personId, redis, tmdb),
		).finally(() => pendingPersons.delete(personId));
		pendingPersons.set(personId, pending);
	}
	return pending;
}

// Callers have already checked the cache with a batch MGET, so this goes
// straight to TMDB and only stores the fields we use
async function fetchPersonDatesUncached(
	personId: number,
	redis: Redis | null,
	tmdb: TMDB,
): Promise<PersonDates | null> {
	let dates: PersonDates;
	try {
		const person = await tmdb.people.details(personId);
		dates = {
			birthday: person.birthday ?? null,
			deathday: person.deathday ?? null,
		};
	} catch (error) {
		console.error("TMDB Person Details Error:", error);
		return null;
	}

	await cacheSet(
		redis,
		`person:${personId}`,
		dates,
		dates.deathday ? DECEASED_PERSON_TTL_SECONDS : CACHE_TTL_SECONDS,
	);

	return dates;
}

let activePersonLookups = 0;
const queuedPersonLookups: (() => void)[] = [];

async function withPersonLookupSlot<T>(fn: () => Promise<T>): Promise<T> {
	if (activePersonLookups >= MAX_CONCURRENT_PERSON_LOOKUPS) {
		await new Promise<void>((resolve) => queuedPersonLookups.push(resolve));
	} else {
		activePersonLookups++;
	}

	try {
		return await fn();
	} finally {
		// Hand the slot straight to the next waiter, or free it
		const next = queuedPersonLookups.shift();
		if (next) next();
		else activePersonLookups--;
	}
}

function getCharacters(member: Cast | AggregateCast) {
	if ("character" in member) {
		return member.character ? [member.character] : [];
	} else if ("roles" in member) {
		return member.roles.map((r) => r.character);
	}

	return [];
}

// The filtered cast list for a title, cached so each page of a paginated
// load doesn't download the full (sometimes multi-MB) credits from TMDB again
async function getCastList(
	type: "movie" | "tv",
	id: number,
	redis: Redis | null,
	tmdb: TMDB,
): Promise<CastEntry[]> {
	const cacheKey = `credits:${type}:${id}:cast`;
	const cached = await cacheGet(redis, cacheKey);
	if (cached) {
		try {
			return JSON.parse(cached);
		} catch (err) {
			console.warn(`Failed to parse cached cast list ${cacheKey}`, err);
		}
	}

	let rawCast: Cast[] | AggregateCast[] = [];

	if (type === "movie") {
		const data: Credits = await tmdb.movies.credits(id);
		rawCast = data.cast;
	} else if (type === "tv") {
		const data: AggregateCredits = await tmdb.tvShows.aggregateCredits(id);
		rawCast = data.cast;
	}

	// Include anyone with an actual cast character credit, regardless of
	// their primary known_for_department (e.g. directors with acting roles).
	const castList: CastEntry[] = rawCast
		.filter((member) => getCharacters(member).length > 0)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map((member) => ({
			id: member.id,
			name: member.name,
			original_name: member.original_name,
			gender: member.gender,
			profile_path: member.profile_path ?? null,
			characters: getCharacters(member),
			order: member.order,
		}));

	await cacheSet(redis, cacheKey, castList);

	return castList;
}

export const Route = createFileRoute("/api/credits")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const {
					id,
					type,
					offset = DEFAULT_OFFSET,
					limit = DEFAULT_LIMIT,
					group = true,
				} = await request.json();

				if (!id || !type || (type !== "movie" && type !== "tv")) {
					return new Response("Invalid request", { status: 400 });
				}

				try {
					// Dynamic imports to keep server-side only
					const { getTMDB } = await import("~/utils/tmdb");
					const { getReadyRedis } = await import("~/utils/redis");
					const tmdb = getTMDB();
					const redis = await getReadyRedis();

					// Check if full credits are cached (for this offset/limit combination)
					const creditsCacheKey = `credits:${type}:${id}:${offset}:${limit}`;
					const cachedCredits = await cacheGet(redis, creditsCacheKey);

					if (cachedCredits) {
						return Response.json(JSON.parse(cachedCredits));
					}

					const actingCast = await getCastList(type, id, redis, tmdb);

					const total = actingCast.length;
					const paginatedCast = actingCast.slice(offset, offset + limit);

					if (total === 0) {
						const response = {
							id,
							type,
							cast: [],
							total: 0,
						};

						await cacheSet(redis, creditsCacheKey, response);

						return Response.json(response);
					}

					// Fetch detailed info with caching - use mget for batch Redis operations
					const cacheKeys = paginatedCast.map(
						(member) => `person:${member.id}`,
					);

					// Batch fetch all cache keys at once
					const cachedValues = await cacheMget(redis, cacheKeys);

					const detailedCast: NormalizedCast[] = [];
					const toFetch: CastEntry[] = [];

					// Process cached results
					paginatedCast.forEach((member, index) => {
						const cachedPerson = cachedValues[index];

						if (cachedPerson) {
							try {
								const person = JSON.parse(cachedPerson);
								detailedCast.push({
									...member,
									birthday: person?.birthday ?? null,
									deathday: person?.deathday ?? null,
								});
							} catch {
								toFetch.push(member);
							}
						} else {
							toFetch.push(member);
						}
					});

					// Fetch remaining from TMDB
					let hadFailures = false;
					const fetched: NormalizedCast[] = await Promise.all(
						toFetch.map(async (member) => {
							const person = await fetchPersonDates(member.id, redis, tmdb);
							if (!person) hadFailures = true;

							return {
								...member,
								birthday: person?.birthday ?? null,
								deathday: person?.deathday ?? null,
							};
						}),
					);

					// Combine cached and fetched
					detailedCast.push(...fetched);

					if (group) {
						// Group by status: Alive, Deceased, Unknown
						detailedCast.sort((a, b) => {
							const getStatus = (member: NormalizedCast) => {
								if (member.deathday) return 2; // Deceased
								if (member.birthday) return 0; // Alive
								return 1; // Unknown
							};

							const statusA = getStatus(a);
							const statusB = getStatus(b);

							if (statusA !== statusB) {
								return statusA - statusB;
							}

							return (a.order ?? 0) - (b.order ?? 0);
						});
					}

					const response = {
						id,
						type,
						cast: detailedCast,
						total,
					};

					// Cache the full credits response for 1 day, unless a lookup failed:
					// those people would otherwise show as "Unknown" for the whole day
					if (!hadFailures) {
						await cacheSet(redis, creditsCacheKey, response);
					}

					return Response.json(response);
				} catch (error) {
					console.error("TMDB Credits Error:", error);

					return new Response("Failed to fetch credits", {
						status: 500,
					});
				}
			},
		},
	},
});
