import { TMDB } from "tmdb-ts";

if (!process.env.TMDB_API_KEY) {
  throw new Error("TMDB API key is missing in environment variables.");
}

const tmdb = new TMDB(process.env.TMDB_API_KEY);

export default tmdb;
