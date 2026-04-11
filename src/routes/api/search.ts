import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const query = url.searchParams.get("q");

				if (!query || query.trim() === "" || query.length < 2) {
					return Response.json({ results: [] });
				}

				try {
					const { getTMDB } = await import("~/utils/tmdb");
					const tmdb = getTMDB();
					const data = await tmdb.search.multi({ query });
					return Response.json(data);
				} catch (error) {
					console.error("TMDB Search Error:", error);

					return new Response("Failed to fetch search results", {
						status: 500,
					});
				}
			},
		},
	},
});
