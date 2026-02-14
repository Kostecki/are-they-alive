import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tv/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!params.id) {
          return new Response("Invalid request", { status: 400 });
        }

        try {
          const { getTMDB } = await import("~/utils/tmdb");
          const { getRedis } = await import("~/utils/redis");
          const tmdb = getTMDB();
          const redis = getRedis();
          const id = Number(params.id);

          // Check cache first
          const cacheKey = `tv:${id}`;
          const cached = await redis.get(cacheKey);

          if (cached) {
            return Response.json(JSON.parse(cached));
          }

          // Fetch both details and external IDs to get IMDB ID
          const [details, externalIds] = await Promise.all([
            tmdb.tvShows.details(id),
            tmdb.tvShows.externalIds(id),
          ]);

          // Merge the imdb_id into the details
          const dataWithImdb = {
            ...details,
            imdb_id: externalIds.imdb_id || null,
          };

          // Cache for 1 week
          await redis.set(cacheKey, JSON.stringify(dataWithImdb), "EX", 604800);

          return Response.json(dataWithImdb);
        } catch (error) {
          console.error("TMDB TV Show Details Error:", error);
          return new Response("Error fetching tv show details", {
            status: 500,
          });
        }
      },
    },
  },
});
