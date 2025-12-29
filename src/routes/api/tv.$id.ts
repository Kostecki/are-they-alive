import { createFileRoute } from "@tanstack/react-router";

import tmdb from "~/utils/tmdb";

export const Route = createFileRoute("/api/tv/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!params.id) {
          return new Response("Invalid request", { status: 400 });
        }

        try {
          const data = await tmdb.tvShows.details(Number(params.id));
          return Response.json(data);
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
