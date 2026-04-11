import { createFileRoute } from "@tanstack/react-router";
import type { MultiSearchResult } from "tmdb-ts/dist/types/search";

export const Route = createFileRoute("/api/trending")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const { getTMDB } = await import("~/utils/tmdb");
					const tmdb = getTMDB();

					// Fetch enough results to ensure we have at least 5 English movies and 5 English TV shows
					let allResults: MultiSearchResult[] = [];
					let page = 1;
					const maxPages = 3; // Fetch up to 3 pages to get enough English content

					while (page <= maxPages) {
						const data = await tmdb.trending.trending("all", "week", { page });
						allResults = allResults.concat(data.results);
						page++;
					}

					const filteredData = allResults.filter(
						(item) =>
							["movie", "tv"].includes(item.media_type) &&
							"original_language" in item &&
							item.original_language === "en",
					);

					return Response.json({
						results: filteredData,
						page: 1,
						total_pages: 1,
						total_results: filteredData.length,
					});
				} catch (error) {
					console.error("TMDB Trending Error:", error);
					return new Response("Error fetching trending data", { status: 500 });
				}
			},
		},
	},
});
