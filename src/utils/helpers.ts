import type { MovieDetails } from "tmdb-ts/dist/types/movies";
import type { MultiSearchResult } from "tmdb-ts/dist/types/search";
import type { TvShowDetails } from "tmdb-ts/dist/types/tv-shows";

import type { ProductionCompany, Result } from "~/types";

// TV show details with optional IMDB ID (fetched separately from externalIds)
type TvShowDetailsWithImdb = TvShowDetails & { imdb_id?: string | null };

// Union type for all possible detail objects passed to mapApiDetailsToResult
type MediaDetails = MovieDetails | TvShowDetailsWithImdb | MultiSearchResult;

function countryCodeToFlagEmoji(countryCode: string): string {
	if (!countryCode) return "";

	const alphaToFlagAlpha = (a: string) =>
		String.fromCodePoint(0x1f1e6 + (a.toUpperCase().charCodeAt(0) - 65));

	return countryCode.slice(0, 2).split("").map(alphaToFlagAlpha).join("");
}

function mapProductionCountries(
	production_companies: ProductionCompany[],
): string[] {
	if (!production_companies || production_companies.length === 0) {
		return [];
	}

	const countries = production_companies.map(
		(company) => company.origin_country,
	);
	const uniqueCountries = Array.from(new Set(countries));
	uniqueCountries.sort();

	const flagCountries = uniqueCountries.map((code) =>
		countryCodeToFlagEmoji(code),
	);

	return flagCountries;
}

function calculateAge(birthday: string, deathday?: string | null): number {
	const birth = new Date(birthday);
	const end = deathday ? new Date(deathday) : new Date();
	let age = end.getFullYear() - birth.getFullYear();
	const m = end.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
	return age;
}

function formatAge(birthday: string | null, deathday: string | null): string {
	if (!birthday) return "Unknown";

	const age = calculateAge(birthday, deathday);

	if (deathday) {
		return `${age} years old (${deathday})`;
	}

	return `${age} years old`;
}

function mapApiDetailsToResult(
	details: MediaDetails,
	type: "movie" | "tv",
): Result {
	const countries = mapProductionCountries(
		(details as MovieDetails | TvShowDetailsWithImdb).production_companies ||
			([] as ProductionCompany[]),
	);

	if (type === "movie") {
		const movieDetails = details as MovieDetails;
		return {
			id: movieDetails.id,
			mediaType: "movie",
			label: movieDetails.original_title || "",
			year: movieDetails.release_date?.split("-")[0] || "",
			subtitle:
				movieDetails.title !== movieDetails.original_title
					? movieDetails.title
					: undefined,
			backdrop_path: movieDetails.backdrop_path || null,
			overview: movieDetails.overview || "",
			poster_path: movieDetails.poster_path || null,
			original_language: movieDetails.original_language || "",
			imdb_id: movieDetails.imdb_id || "",
			countries: countries,
		};
	} else {
		const tvDetails = details as TvShowDetailsWithImdb;
		return {
			id: tvDetails.id,
			mediaType: "tv",
			label: tvDetails.original_name || "",
			year: tvDetails.first_air_date?.split("-")[0] || "",
			subtitle:
				tvDetails.name !== tvDetails.original_name ? tvDetails.name : undefined,
			backdrop_path: tvDetails.backdrop_path || null,
			overview: tvDetails.overview || "",
			poster_path: tvDetails.poster_path || null,
			original_language: tvDetails.original_language || "",
			imdb_id: tvDetails.imdb_id || "",
			countries: countries,
		};
	}
}

export { calculateAge, formatAge, mapApiDetailsToResult };
