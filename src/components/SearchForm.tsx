import { Alert, Box, type BoxProps, Divider } from "@mantine/core";
import ky from "ky";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NormalizedCast, Result } from "~/types";

import { useCastSorting } from "~/hooks/useCastSorting";
import { useMediaSearch } from "~/hooks/useMediaSearch";

import CastList from "./CastList";
import { GroupSortHeader } from "./GroupSortHeader";
import ItemDetails from "./ItemDetails";
import SearchInput from "./SearchInput";

// The first page is small so the top-billed cast shows up quickly; the rest
// streams in behind it. Every person not yet cached costs one TMDB request,
// and TMDB serves ~40/s, so 50 people take about a second and a half.
const FIRST_PAGE_SIZE = 50;
const PAGE_SIZE = 150;
const BATCH_SIZE = 500; // Loaded automatically, and per "Load more" click

type CreditsResponse = {
	id: number;
	type: "movie" | "tv";
	cast: NormalizedCast[];
	total: number;
};

type InputProps = {
	initialItem?: Result;
} & BoxProps;

export default function SearchForm({ initialItem, ...props }: InputProps) {
	const [debounced, setDebounced] = useState("");
	const [selectedItem, setSelectedItem] = useState<Result | null>(
		initialItem ?? null,
	);
	const [rawCast, setRawCast] = useState<NormalizedCast[]>([]);
	const [loadingCast, setLoadingCast] = useState(true);
	const [castTotal, setCastTotal] = useState(0);
	const [castError, setCastError] = useState<string | null>(null);
	const [groupByStatus, setGroupByStatus] = useState(true);
	const [sortBy, setSortBy] = useState("appearance");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const castEndRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<Result | null>(null);

	// Use custom hooks for search and sorting
	const { results, loading, error: searchError } = useMediaSearch(debounced);
	const castSections = useCastSorting(
		rawCast,
		groupByStatus,
		sortBy,
		sortOrder,
	);

	const hasMoreCast = rawCast.length < castTotal;

	const abortRef = useRef<AbortController | null>(null);

	// Loads up to BATCH_SIZE cast members from `offset`, appending each page as
	// it arrives. A fresh title loads a small first page, then requests the
	// remaining pages in parallel (the list is sorted client-side, so arrival
	// order doesn't matter). Starting a new load cancels the previous one.
	const fetchCast = useCallback(
		async (item: Result, offset: number, knownTotal?: number) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setLoadingCast(true);
			setCastError(null);

			const fetchPage = async (pageOffset: number, limit: number) => {
				const data = await ky
					.post("/api/credits", {
						timeout: 30_000,
						signal: controller.signal,
						json: {
							id: item.id,
							type: item.mediaType,
							offset: pageOffset,
							limit,
						},
					})
					.json<CreditsResponse>();

				if (controller.signal.aborted) return data.total;

				setRawCast((prev) =>
					pageOffset === 0 ? data.cast : [...prev, ...data.cast],
				);
				setCastTotal(data.total);

				return data.total;
			};

			try {
				let start = offset;
				let total = knownTotal ?? Number.POSITIVE_INFINITY;

				if (offset === 0) {
					total = await fetchPage(0, FIRST_PAGE_SIZE);
					start = FIRST_PAGE_SIZE;
				}

				const end = Math.min(offset + BATCH_SIZE, total);
				const pages: Promise<number>[] = [];
				for (
					let pageOffset = start;
					pageOffset < end;
					pageOffset += PAGE_SIZE
				) {
					pages.push(
						fetchPage(pageOffset, Math.min(PAGE_SIZE, end - pageOffset)),
					);
				}

				// Let every page finish so one failure doesn't hide the others
				const failed = (await Promise.allSettled(pages)).find(
					(result) => result.status === "rejected",
				);
				if (failed) throw failed.reason;
			} catch (err) {
				if (controller.signal.aborted) return;

				const errorMessage =
					err instanceof Error ? err.message : "Failed to load cast members";
				setCastError(errorMessage);
				console.error("Error fetching cast:", err);
			} finally {
				if (abortRef.current === controller) {
					abortRef.current = null;
					setLoadingCast(false);
				}
			}
		},
		[],
	);

	useEffect(() => {
		if (!selectedItem) return;

		setRawCast([]);
		setCastTotal(0);
		setLoadingCast(true);

		fetchCast(selectedItem, 0);

		return () => abortRef.current?.abort();
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
			{searchError && (
				<Alert title="Search Error" color="red" mt="md" withCloseButton>
					{searchError}
				</Alert>
			)}
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

					{castError && (
						<Alert
							title="Cast Loading Error"
							color="red"
							mb="md"
							withCloseButton
							onClose={() => setCastError(null)}
						>
							{castError}
						</Alert>
					)}

					<CastList
						castSections={castSections}
						loadingCast={loadingCast}
						hasMoreCast={hasMoreCast}
						loadMore={() =>
							selectedItem && fetchCast(selectedItem, rawCast.length, castTotal)
						}
						castEndRef={castEndRef}
						groupByStatus={groupByStatus}
					/>
				</>
			)}
		</Box>
	);
}
