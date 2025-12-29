export type NormalizedCast = {
  id: number;
  name: string;
  original_name: string;
  gender: number;
  profile_path: string | null;
  characters: string[];
  order: number;
  birthday: string | null;
  deathday: string | null;
};

export type Result = {
  id: number;
  mediaType: "movie" | "tv";
  year: string;
  label: string;
  subtitle?: string;
  backdrop_path: string | null;
  overview: string;
  poster_path: string | null;
  original_language: string;
};
