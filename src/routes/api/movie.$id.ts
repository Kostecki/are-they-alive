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
          const tmdb = getTMDB();
          const data = await tmdb.movies.details(Number(params.id));
          return Response.json(data);
        } catch (error) {
          console.error("TMDB Movie Details Error:", error);
          return new Response("Error fetching movie details", { status: 500 });
        }
      },
    },
  },
});
