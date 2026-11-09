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

const normalizeTitle = (title: string) =>
	title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function titlesOf(result: MultiSearchResult): string[] {
	if (result.media_type === "movie") {
		return [result.title, result.original_title];
	}
	if (result.media_type === "tv") return [result.name, result.original_name];
	return [result.name];
}

// A trailing year can be part of the title ("Space: 1999" aired in 1975), so
// also search the full text unfiltered. Exact title matches from that search
// come first, then the year-filtered results.
async function searchWithYear(
	tmdb: TMDB,
	parsed: ParsedSearchQuery,
): Promise<MultiSearchResult[]> {
	const fullText = `${parsed.query} ${parsed.year}`;
	const [filtered, unfiltered] = await Promise.all([
		runSearch(tmdb, parsed),
		runSearch(tmdb, { query: fullText, type: parsed.type }),
	]);

	if (filtered.length === 0) return unfiltered;

	const target = normalizeTitle(fullText);
	const exactMatches = unfiltered.filter((result) =>
		titlesOf(result).some((title) => title && normalizeTitle(title) === target),
	);

	const seen = new Set<string>();
	return [...exactMatches, ...filtered].filter((result) => {
		const key = `${result.media_type}-${result.id}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
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
					const results = parsed.year
						? await searchWithYear(tmdb, parsed)
						: await runSearch(tmdb, parsed);

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
