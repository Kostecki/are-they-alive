import { Box, type BoxProps, Divider } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import ky from "ky";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";
import type { NormalizedCast, Result } from "types";

import CastList from "./CastList";
import ItemDetails from "./ItemDetails";
import SearchInput from "./SearchInput";

type InputProps = {} & BoxProps;

export default function SearchForm({ ...props }: InputProps) {
	const [value, setValue] = useState("");
	const [results, setResults] = useState<Result[]>([]);
	const [loading, setLoading] = useState(false);
	const [debounced] = useDebouncedValue(value, 300);
	const [selectedItem, setSelectedItem] = useState<Result | null>(null);
	const [cast, setCast] = useState<NormalizedCast[]>([]);
	const [loadingCast, setLoadingCast] = useState(true);
	const [castTotal, setCastTotal] = useState(0);

	const castEndRef = useRef<HTMLDivElement>(null);
	const skipNextSearch = useRef(false);

	const hasMoreCast = cast.length < castTotal;

	const fetchCast = useCallback(
		async (reset = false, offset?: number) => {
			if (!selectedItem) return;

			setLoadingCast(true);
			try {
				const data = (await ky
					.post("/api/credits", {
						json: {
							id: selectedItem.id,
							type: selectedItem.mediaType,
							offset: reset ? 0 : (offset ?? 0),
							limit: 14,
						},
					})
					.json()) as {
					id: number;
					type: "movie" | "tv";
					cast: NormalizedCast[];
					total: number;
				};

				setCast((prev) => {
					const newCast = reset ? data.cast : [...prev, ...data.cast];

					// scroll to the last newly added actor
					setTimeout(() => {
						castEndRef.current?.scrollIntoView({ behavior: "smooth" });
					}, 50);

					return newCast;
				});
				setCastTotal(data.total);
			} catch (err) {
				console.error(err);
			} finally {
				setLoadingCast(false);
			}
		},
		[selectedItem],
	);

	useEffect(() => {
		if (!debounced || debounced.length < 2) {
			setResults([]);
			return;
		}

		if (skipNextSearch.current) {
			skipNextSearch.current = false;
			return;
		}

		let aborted = false;

		async function search() {
			setLoading(true);

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
						return {
							id: item.id,
							mediaType: "movie",
							year: item.release_date.split("-")[0],
							label: item.original_title,
							subtitle:
								item.title !== item.original_title ? item.title : undefined,
							backdrop_path: item.backdrop_path,
							overview: item.overview,
							poster_path: item.poster_path,
							original_language: item.original_language,
						};
					}

					if (item.media_type === "tv") {
						return {
							id: item.id,
							mediaType: "tv",
							year: item.first_air_date.split("-")[0],
							label: item.original_name,
							subtitle:
								item.name !== item.original_name ? item.name : undefined,
							backdrop_path: item.backdrop_path,
							overview: item.overview,
							poster_path: item.poster_path,
							original_language: item.original_language,
						};
					}

					throw new Error("Unknown media type");
				});

			setResults(mapped);
			setLoading(false);
		}

		search();

		return () => {
			aborted = true;
		};
	}, [debounced]);

	useEffect(() => {
		if (!selectedItem) return;
		fetchCast(true);
	}, [selectedItem, fetchCast]);

	return (
		<Box {...props}>
			<SearchInput
				value={value}
				setValue={setValue}
				results={results}
				loading={loading}
				onSelect={(selected) => {
					setValue(`${selected.label} (${selected.year})`);
					setSelectedItem(selected);
					setCast([]);
					setCastTotal(0);
				}}
			/>

			{selectedItem && (
				<>
					<Divider my="lg" />

					<ItemDetails item={selectedItem} />

					<CastList
						cast={cast}
						loadingCast={loadingCast}
						hasMoreCast={hasMoreCast}
						fetchMoreCast={fetchCast}
						castEndRef={castEndRef}
					/>
				</>
			)}
		</Box>
	);
}
