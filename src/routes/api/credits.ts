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
const CHUNK_SIZE = 20; // Number of concurrent requests
const CHUNK_DELAY_MS = 100; // Delay between chunks in milliseconds
const CACHE_TTL_SECONDS = 86400; // 1 day

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

async function cacheSet(redis: Redis | null, key: string, value: unknown) {
	if (!redis) return;
	try {
		await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
	} catch (error) {
		console.warn(`Redis write failed for ${key}`, error);
	}
}

async function getPersonDetailsCached(
	personId: number,
	redis: Redis | null,
	tmdb: TMDB,
) {
	const cacheKey = `person:${personId}`;
	const cached = await cacheGet(redis, cacheKey);
	if (cached) {
		try {
			return JSON.parse(cached);
		} catch (err) {
			console.warn(`Failed to parse cached person ${personId}`, err);
		}
	}

	// Not in cache, fetch from TMDB
	const person = await getPersonDetails(personId, tmdb);
	if (person) {
		await cacheSet(redis, cacheKey, person);
	}

	return person;
}

async function getPersonDetails(personId: number, tmdb: TMDB) {
	try {
		return await tmdb.people.details(personId);
	} catch (error) {
		console.error("TMDB Person Details Error:", error);
		return null;
	}
}

async function chunkedFetch<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	chunkSize = CHUNK_SIZE,
	delayMs = CHUNK_DELAY_MS,
): Promise<R[]> {
	const results: R[] = [];

	for (let i = 0; i < items.length; i += chunkSize) {
		const chunk = items.slice(i, i + chunkSize);
		const result = await Promise.all(chunk.map(fn));
		results.push(...result);

		if (i + chunkSize < items.length) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return results;
}

function getCharacters(member: Cast | AggregateCast) {
	if ("character" in member) {
		return member.character ? [member.character] : [];
	} else if ("roles" in member) {
		return member.roles.map((r) => r.character);
	}

	return [];
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

					let rawCast: Cast[] | AggregateCast[] = [];

					if (type === "movie") {
						const data: Credits = await tmdb.movies.credits(id);
						rawCast = data.cast;
					} else if (type === "tv") {
						const data: AggregateCredits =
							await tmdb.tvShows.aggregateCredits(id);
						rawCast = data.cast;
					}

					// Include anyone with an actual cast character credit, regardless of
					// their primary known_for_department (e.g. directors with acting roles).
					const actingCast = rawCast
						.filter((member) => getCharacters(member).length > 0)
						.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
					const toFetch: (Cast | AggregateCast)[] = [];

					// Process cached results
					paginatedCast.forEach((member, index) => {
						const cachedPerson = cachedValues[index];

						if (cachedPerson) {
							try {
								const person = JSON.parse(cachedPerson);
								detailedCast.push({
									id: member.id,
									name: member.name,
									original_name: member.original_name,
									gender: member.gender,
									profile_path: member.profile_path ?? null,
									characters: getCharacters(member),
									order: member.order,
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
					const fetched: NormalizedCast[] = await chunkedFetch(
						toFetch,
						async (member) => {
							const person = await getPersonDetailsCached(
								member.id,
								redis,
								tmdb,
							);

							return {
								id: member.id,
								name: member.name,
								original_name: member.original_name,
								gender: member.gender,
								profile_path: member.profile_path ?? null,
								characters: getCharacters(member),
								order: member.order,
								birthday: person?.birthday ?? null,
								deathday: person?.deathday ?? null,
							};
						},
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

					// Cache the full credits response for 1 day
					await cacheSet(redis, creditsCacheKey, response);

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
