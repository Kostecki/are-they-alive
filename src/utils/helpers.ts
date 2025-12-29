import type { Result } from "~/types";

// TODO: Fix any type
function mapApiDetailsToResult(details: any, type: "movie" | "tv"): Result {
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
    };
  }
}

export { mapApiDetailsToResult };
