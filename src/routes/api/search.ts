import { createFileRoute } from "@tanstack/react-router";
import type { TMDB } from "tmdb-ts";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";

import { type ParsedSearchQuery, parseSearchQuery } from "~/utils/searchQuery";

async function searchMovies(tmdb: TMDB, query: string, year?: number) {
	const data = await tmdb.search.movies({ query, primary_release_year: year });
	return data.results.map((movie) => ({
		...movie,
		media_type: "movie" as const,
	}));
}

async function searchTv(tmdb: TMDB, query: string, year?: number) {
	const data = await tmdb.search.tvShows({ query, first_air_date_year: year });
	return data.results.map((show) => ({ ...show, media_type: "tv" as const }));
}

async function runSearch(
	tmdb: TMDB,
	{ query, type, year }: ParsedSearchQuery,
): Promise<MultiSearchResult[]> {
	if (type === "movie") return searchMovies(tmdb, query, year);
	if (type === "tv") return searchTv(tmdb, query, year);

	if (year) {
		const [movies, shows] = await Promise.all([
			searchMovies(tmdb, query, year),
			searchTv(tmdb, query, year),
		]);
		return [...movies, ...shows].sort((a, b) => b.popularity - a.popularity);
	}

	const data = await tmdb.search.multi({ query });
	return data.results;
}

export const Route = createFileRoute("/api/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const parsed = parseSearchQuery(url.searchParams.get("q") ?? "");

				if (parsed.query.length < 2) {
					return Response.json({ results: [] });
				}

				try {
					const { getTMDB } = await import("~/utils/tmdb");
					const tmdb = getTMDB();
					let results = await runSearch(tmdb, parsed);

					// The trailing number may be part of the title ("Space: 1999"),
					// so search for it as text when the year filter finds nothing
					if (results.length === 0 && parsed.year) {
						results = await runSearch(tmdb, {
							query: `${parsed.query} ${parsed.year}`,
							type: parsed.type,
						});
					}

					const body: Search<MultiSearchResult> = {
						page: 1,
						results,
						total_pages: 1,
						total_results: results.length,
					};
					return Response.json(body);
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
