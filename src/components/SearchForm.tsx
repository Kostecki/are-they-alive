import { Box, type BoxProps, Divider } from "@mantine/core";
import ky from "ky";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";

import type { NormalizedCast, Result } from "~/types";

import { mapApiDetailsToResult } from "~/utils/helpers";

import CastList from "./CastList";
import { GroupSortHeader } from "./GroupSortHeader";
import ItemDetails from "./ItemDetails";
import SearchInput from "./SearchInput";

type InputProps = {
	initialItem?: Result;
} & BoxProps;

export default function SearchForm({ initialItem, ...props }: InputProps) {
	const [debounced, setDebounced] = useState("");
	const [results, setResults] = useState<Result[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedItem, setSelectedItem] = useState<Result | null>(
		initialItem ?? null,
	);
	const [rawCast, setRawCast] = useState<NormalizedCast[]>([]);
	const [loadingCast, setLoadingCast] = useState(true);
	const [castTotal, setCastTotal] = useState(0);
	const [groupByStatus, setGroupByStatus] = useState(true);
	const [sortBy, setSortBy] = useState("appearance");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const castEndRef = useRef<HTMLDivElement>(null);
	const skipNextSearch = useRef(false);
	const selectedRef = useRef<Result | null>(null);

	const hasMoreCast = rawCast.length < castTotal;

	const fetchCast = useCallback(
		async (item: Result, reset = false, offset?: number) => {
			setLoadingCast(true);
			try {
				const data = (await ky
					.post("/api/credits", {
						json: {
							id: item.id,
							type: item.mediaType,
							offset: reset ? 0 : (offset ?? 0),
						},
					})
					.json()) as {
					id: number;
					type: "movie" | "tv";
					cast: NormalizedCast[];
					total: number;
				};

				setRawCast((prev) => (reset ? data.cast : [...prev, ...data.cast]));
				setCastTotal(data.total);
			} catch (err) {
				console.error(err);
			} finally {
				setLoadingCast(false);
			}
		},
		[],
	);

	const castSections = useMemo(() => {
		if (!rawCast.length) return [];

		const getStatus = (member: NormalizedCast) => {
			if (member.deathday) return "Deceased";
			if (member.birthday) return "Alive";
			return "Unknown";
		};

		// Sorting
		const compare = (a: NormalizedCast, b: NormalizedCast) => {
			let result = 0;

			switch (sortBy) {
				case "appearance":
					result = (a.order ?? 0) - (b.order ?? 0);
					break;
				case "age": {
					const getAge = (member: NormalizedCast) => {
						if (!member.birthday) return 0;
						const birth = new Date(member.birthday);
						const death = member.deathday
							? new Date(member.deathday)
							: new Date();
						let age = death.getFullYear() - birth.getFullYear();
						const m = death.getMonth() - birth.getMonth();

						if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;

						return age;
					};
					result = getAge(a) - getAge(b);
					break;
				}
				case "alphabetical":
					result = (a.name ?? "").localeCompare(b.name ?? "");
					break;
				case "death":
					if (a.deathday && b.deathday) {
						result =
							new Date(a.deathday).getTime() - new Date(b.deathday).getTime();
					} else if (a.deathday) {
						result = 1;
					} else if (b.deathday) {
						result = -1;
					} else {
						result = 0;
					}
					break;
				default:
					result = 0;
			}

			return sortOrder === "asc" ? result : -result;
		};

		if (!groupByStatus) {
			return [{ title: "all", members: [...rawCast].sort(compare) }];
		}

		// Group by status
		const groups: Record<string, NormalizedCast[]> = {
			Alive: [],
			Deceased: [],
			Unknown: [],
		};

		rawCast.forEach((member) => {
			groups[getStatus(member)].push(member);
		});

		// Sort each group individually
		Object.keys(groups).forEach((status) => {
			groups[status].sort(compare);
		});

		return [
			{ title: "Alive", members: groups.Alive },
			{ title: "Deceased", members: groups.Deceased },
			{ title: "Unknown", members: groups.Unknown },
		].filter((section) => section.members.length > 0);
	}, [rawCast, groupByStatus, sortBy, sortOrder]);

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
						return mapApiDetailsToResult(item, "movie");
					}

					if (item.media_type === "tv") {
						return mapApiDetailsToResult(item, "tv");
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

		setRawCast([]);
		setCastTotal(0);
		setLoadingCast(true);

		fetchCast(selectedItem, true);
	}, [selectedItem, fetchCast]);

	useEffect(() => {
		selectedRef.current = selectedItem;
	}, [selectedItem]);

	// Sync state when initialItem prop changes (e.g., navigation)
	useEffect(() => {
		if (initialItem) {
			setSelectedItem(initialItem);
		}
	}, [initialItem]);

	return (
		<Box {...props}>
			<SearchInput
				onDebouncedChange={setDebounced}
				results={results}
				loading={loading}
			/>
			{selectedItem && (
				<>
					<Divider my="lg" />

					<ItemDetails item={selectedItem} />

					<Divider mb="md" mt="xl" opacity="0.6" />

					<GroupSortHeader
						groupByStatus={groupByStatus}
						setGroupByStatus={setGroupByStatus}
						sortBy={sortBy}
						setSortBy={setSortBy}
						sortOrder={sortOrder}
						setSortOrder={setSortOrder}
					/>

					<Divider my="md" opacity="0.6" />

					<CastList
						castSections={castSections}
						loadingCast={loadingCast}
						hasMoreCast={hasMoreCast}
						loadMore={() =>
							selectedItem && fetchCast(selectedItem, false, rawCast.length)
						}
						castEndRef={castEndRef}
						groupByStatus={groupByStatus}
					/>
				</>
			)}
		</Box>
	);
}
