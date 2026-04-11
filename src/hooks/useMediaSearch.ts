import ky from "ky";
import { useEffect, useRef, useState } from "react";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";

import type { Result } from "~/types";

import { mapApiDetailsToResult } from "~/utils/helpers";

export function useMediaSearch(debounced: string) {
	const [results, setResults] = useState<Result[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const skipNextSearch = useRef(false);

	useEffect(() => {
		if (!debounced || debounced.length < 2) {
			setResults([]);
			setError(null);
			return;
		}

		if (skipNextSearch.current) {
			skipNextSearch.current = false;
			return;
		}

		let aborted = false;

		async function search() {
			setLoading(true);
			setError(null);

			try {
				const res = await ky.get(
					`/api/search?q=${encodeURIComponent(debounced)}`,
				);

				const data = (await res.json()) as Search<MultiSearchResult>;

				if (aborted) {
					return;
				}

				const mapped: Result[] = data.results
					.filter(
						(item) => item.media_type === "movie" || item.media_type === "tv",
					)
					.map((item) => {
						if (item.media_type === "movie") {
							return mapApiDetailsToResult(item, "movie");
						}

						if (item.media_type === "tv") {
							return mapApiDetailsToResult(item, "tv");
						}

						throw new Error("Unknown media type");
					});

				setResults(mapped);
			} catch (err) {
				if (!aborted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to search for movies/TV shows",
					);
					setResults([]);
				}
			} finally {
				if (!aborted) {
					setLoading(false);
				}
			}
		}

		search();

		return () => {
			aborted = true;
		};
	}, [debounced]);

	return { results, loading, error };
}
