import { createFileRoute } from "@tanstack/react-router";
import {
  type AggregateCast,
  type AggregateCredits,
  type Cast,
  type Credits,
  TMDB,
} from "tmdb-ts";

import type { NormalizedCast } from "~/types";

import redis from "~/utils/redis";

const tmdb = new TMDB(process.env.TMDB_API_KEY || "");

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 500; // Number of cast members to return per request
const CHUNK_SIZE = 20; // Number of concurrent requests
const CHUNK_DELAY_MS = 100; // Delay between chunks in milliseconds

async function getPersonDetailsCached(personId: number) {
  const cacheKey = `person:${personId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      console.warn(`Failed to parse cached person ${personId}`, err);
    }
  }

  // Not in cache, fetch from TMDB
  const person = await getPersonDetails(personId);
  if (person) {
    await redis.set(cacheKey, JSON.stringify(person), "EX", 86400); // Cache for 1 day
  }

  return person;
}

async function getPersonDetails(personId: number) {
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
  delayMs = CHUNK_DELAY_MS
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
          let rawCast: Cast[] | AggregateCast[] = [];

          if (type === "movie") {
            const data: Credits = await tmdb.movies.credits(id);
            rawCast = data.cast;
          } else if (type === "tv") {
            const data: AggregateCredits =
              await tmdb.tvShows.aggregateCredits(id);
            rawCast = data.cast;
          }

          // Only include acting cast members and sort by importance
          const actingCast = rawCast
            .filter((member) => member.known_for_department === "Acting")
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          const total = actingCast.length;
          const paginatedCast = actingCast.slice(offset, offset + limit);

          const detailedCast: NormalizedCast[] = await chunkedFetch(
            paginatedCast,
            async (member) => {
              const person = await getPersonDetailsCached(member.id);

              return {
                id: member.id,
                name: member.name,
                original_name: member.original_name,
                gender: member.gender,
                profile_path: member.profile_path ?? null,
                characters:
                  "character" in member
                    ? member.character
                      ? [member.character]
                      : []
                    : "roles" in member
                      ? member.roles.map((r) => r.character)
                      : [],
                order: member.order,
                birthday: person?.birthday ?? null,
                deathday: person?.deathday ?? null,
              };
            }
          );

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

          return Response.json({
            id,
            type,
            cast: detailedCast,
            total,
          });
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
