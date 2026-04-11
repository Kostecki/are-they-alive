import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/movie/$id")({
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
					const cacheKey = `movie:${id}`;
					const cached = await redis.get(cacheKey);

					if (cached) {
						console.info(`[cache] movie:${id} source=redis`);
						return Response.json(JSON.parse(cached));
					}

					console.info(`[cache] movie:${id} source=tmdb`);

					// Fetch from TMDB and cache for 1 week
					const data = await tmdb.movies.details(id);
					await redis.set(cacheKey, JSON.stringify(data), "EX", 604800);

					return Response.json(data);
				} catch (error) {
					console.error("TMDB Movie Details Error:", error);
					return new Response("Error fetching movie details", { status: 500 });
				}
			},
		},
	},
});
