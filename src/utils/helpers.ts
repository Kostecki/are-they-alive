import type { ProductionCompany, Result } from "~/types";

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

// TODO: Fix any type
function mapApiDetailsToResult(details: any, type: "movie" | "tv"): Result {
  const countries = mapProductionCountries(details.production_companies);

  if (type === "movie") {
    return {
      id: details.id,
      mediaType: "movie",
      label: details.original_title,
      year: details.release_date?.split("-")[0],
      subtitle:
        details.title !== details.original_title ? details.title : undefined,
      backdrop_path: details.backdrop_path,
      overview: details.overview,
      poster_path: details.poster_path,
      original_language: details.original_language,
      imdb_id: details.imdb_id,
      countries: countries,
    };
  } else {
    return {
      id: details.id,
      mediaType: "tv",
      label: details.original_name,
      year: details.first_air_date?.split("-")[0],
      subtitle:
        details.name !== details.original_name ? details.name : undefined,
      backdrop_path: details.backdrop_path,
      overview: details.overview,
      poster_path: details.poster_path,
      original_language: details.original_language,
      imdb_id: details.imdb_id,
      countries: countries,
    };
  }
}

export { mapApiDetailsToResult };
