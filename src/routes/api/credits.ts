import { createFileRoute } from "@tanstack/react-router";
import {
  type AggregateCast,
  type AggregateCredits,
  type Cast,
  type Credits,
  TMDB,
} from "tmdb-ts";

export type NormalizedCast = {
  id: number;
  name: string;
  original_name: string;
  gender: number;
  profile_path: string | null;
  characters: string[];
  birthday: string | null;
  deathday: string | null;
};

const tmdb = new TMDB(process.env.TMDB_API_KEY || "");

async function getPersonDetails(personId: number) {
  try {
    return await tmdb.people.details(personId);
  } catch (error) {
    console.error("TMDB Person Details Error:", error);
    return null;
  }
}

export const Route = createFileRoute("/api/credits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { id, type, offset = 0, limit = 14 } = await request.json();

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

          const detailedCast: NormalizedCast[] = await Promise.all(
            paginatedCast.map(async (member) => {
              const person = await getPersonDetails(member.id);

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
            })
          );

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
