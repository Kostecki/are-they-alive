import { TMDB } from "tmdb-ts";

let tmdbInstance: TMDB | null = null;

export function getTMDB(): TMDB {
  if (!tmdbInstance) {
    if (!process.env.TMDB_API_KEY) {
      throw new Error("TMDB API key is missing in environment variables.");
    }
    tmdbInstance = new TMDB(process.env.TMDB_API_KEY);
  }
  return tmdbInstance;
}
