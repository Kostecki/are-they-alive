import { Box, type BoxProps, Divider } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
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
	type?: string;
	id?: string;
} & BoxProps;

export default function SearchForm({ ...props }: InputProps) {
	const [value, setValue] = useState("");
	const [results, setResults] = useState<Result[]>([]);
	const [loading, setLoading] = useState(false);
	const [debounced] = useDebouncedValue(value, 300);
	const [selectedItem, setSelectedItem] = useState<Result | null>(null);
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
		[selectedItem],
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
			return [{ title: "", members: [...rawCast].sort(compare) }];
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
		fetchCast(true);
	}, [selectedItem, fetchCast]);

	useEffect(() => {
		selectedRef.current = selectedItem;
	}, [selectedItem]);

	useEffect(() => {
		// If type and id props are provided and valid, auto-select the item
		if (!props.type || !props.id) return;

		const numericId = Number(props.id);
		if (
			selectedRef.current?.id === numericId &&
			selectedRef.current?.mediaType === props.type
		)
			return;

		let aborted = false;

		async function fetchData() {
			try {
				const details = (await ky
					.get(`/api/${props.type}/${numericId}`)
					.json()) as any; // TODO: Type

				if (aborted) return;

				setSelectedItem(
					mapApiDetailsToResult(details, props.type as "movie" | "tv"),
				);
			} catch (err) {
				console.error("Error fetching data for auto-select:", err);
			}
		}

		fetchData();

		return () => {
			aborted = true;
		};
	}, [props.type, props.id]);

	return (
		<Box {...props}>
			<SearchInput
				value={value}
				setValue={setValue}
				setSelectedItem={setSelectedItem}
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
						loadMore={() => fetchCast(false, rawCast.length)}
						castEndRef={castEndRef}
					/>
				</>
			)}
		</Box>
	);
}
