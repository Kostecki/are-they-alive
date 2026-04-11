import { TMDB } from "tmdb-ts";

let tmdbInstance: TMDB | null = null;

export function getTMDB(): TMDB {
	if (!tmdbInstance) {
		if (!process.env.TMDB_API_TOKEN) {
			throw new Error(
				"TMDB Read Access token is missing in environment variables.",
			);
		}
		tmdbInstance = new TMDB(process.env.TMDB_API_TOKEN);
	}
	return tmdbInstance;
}
