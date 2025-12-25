import {
	Anchor,
	Box,
	type BoxProps,
	Button,
	Card,
	Combobox,
	Divider,
	Flex,
	Image,
	Loader,
	SimpleGrid,
	Text,
	TextInput,
	useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import ky from "ky";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";

import type { NormalizedCast } from "~/routes/api/credits";

import ItemDetails from "../ItemDetails";
import styles from "./style.module.css";

type InputProps = {} & BoxProps;

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

function formatAge(birthday: string | null, deathday: string | null) {
	if (!birthday) return "Unknown";

	const birth = new Date(birthday);

	if (deathday) {
		const death = new Date(deathday);
		let age = death.getFullYear() - birth.getFullYear();
		const m = death.getMonth() - birth.getMonth();

		if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;

		return `${age} years old (${deathday})`;
	} else {
		const now = new Date();
		let age = now.getFullYear() - birth.getFullYear();
		const m = now.getMonth() - birth.getMonth();

		if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

		return `${age} years old`;
	}
}

function showRole(member: NormalizedCast) {
	return member.characters.join(", ") || "";
}

export default function SearchForm({ ...props }: InputProps) {
	const [value, setValue] = useState("");
	const [results, setResults] = useState<Result[]>([]);
	const [loading, setLoading] = useState(false);
	const [debounced] = useDebouncedValue(value, 300);
	const [selectedItem, setSelectedItem] = useState<Result | null>(null);
	const [cast, setCast] = useState<NormalizedCast[]>([]);
	const [loadingCast, setLoadingCast] = useState(true);
	const [castTotal, setCastTotal] = useState(0);

	const combobox = useCombobox();
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

	const handleSelect = (optionValue: string) => {
		const selected = results.find((r) => String(r.id) === optionValue);
		if (!selected) return;

		skipNextSearch.current = true;

		setValue(`${selected.label} (${selected.year})`);
		setSelectedItem(selected);
		setCast([]);
		setCastTotal(0);

		combobox.closeDropdown();
	};

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

	const movies = results.filter((r) => r.mediaType === "movie");
	const tvShows = results.filter((r) => r.mediaType === "tv");

	return (
		<Box {...props}>
			<Combobox store={combobox} onOptionSubmit={handleSelect}>
				<Combobox.Target>
					<TextInput
						value={value}
						onChange={(e) => {
							setValue(e.currentTarget.value);
							combobox.openDropdown();
						}}
						placeholder="Search movies or TV shows..."
						rightSection={loading ? <Loader size="xs" /> : null}
					/>
				</Combobox.Target>

				<Combobox.Dropdown>
					<Combobox.Options>
						{movies.length > 0 && (
							<Combobox.Group label="Movies">
								{movies.map((item) => (
									<Combobox.Option key={item.id} value={String(item.id)}>
										<div style={{ display: "flex", flexDirection: "column" }}>
											<strong>
												{item.label} ({item.year})
											</strong>
											{item.subtitle && (
												<div style={{ fontSize: 12, opacity: 0.6 }}>
													{item.subtitle}
												</div>
											)}
										</div>
									</Combobox.Option>
								))}
							</Combobox.Group>
						)}

						{tvShows.length > 0 && (
							<Combobox.Group label="TV Shows">
								{tvShows.map((item) => (
									<Combobox.Option key={item.id} value={String(item.id)}>
										<div style={{ display: "flex", flexDirection: "column" }}>
											<strong>
												{item.label} ({item.year})
											</strong>
											{item.subtitle && (
												<div style={{ fontSize: 12, opacity: 0.6 }}>
													{item.subtitle}
												</div>
											)}
										</div>
									</Combobox.Option>
								))}
							</Combobox.Group>
						)}

						{movies.length === 0 && tvShows.length === 0 && !loading && (
							<Combobox.Empty>No results</Combobox.Empty>
						)}
					</Combobox.Options>
				</Combobox.Dropdown>
			</Combobox>

			{selectedItem && (
				<>
					<Divider my="lg" />

					<ItemDetails item={selectedItem} />

					<Box mt="xl">
						{cast.length === 0 && loadingCast && (
							<Flex justify="center">
								<Loader size="xs" />
							</Flex>
						)}
						{cast.length === 0 && !loadingCast && <div>No cast available</div>}

						{cast.length > 0 && (
							<>
								<SimpleGrid cols={2} spacing="md">
									{cast.map((member) => {
										return (
											<Anchor
												key={member.id}
												underline="never"
												href={`https://www.themoviedb.org/person/${member.id}`}
												target="_blank"
												rel="noopener"
											>
												<Card
													padding="xs"
													shadow="sm"
													mb="sm"
													radius="md"
													withBorder
													style={{ opacity: member.deathday ? 0.5 : 1 }}
													className={styles.balls}
												>
													<Flex>
														{member.deathday && (
															<Text
																size="xs"
																pos="absolute"
																top="10px"
																right="10px"
															>
																🪦
															</Text>
														)}
														<Image
															w="45px"
															radius="md"
															src={`https://image.tmdb.org/t/p/w45${member.profile_path}`}
															fallbackSrc={
																member.gender === 2
																	? "/male.svg"
																	: "/female.svg"
															}
														/>

														<Flex direction="column">
															<Text ml="sm" fw={500}>
																{member.name}
															</Text>
															<Text ml="sm" c="dimmed" fz="sm">
																{showRole(member)}
															</Text>
															<Text ml="sm" c="dimmed" fz="sm">
																{formatAge(member.birthday, member.deathday)}
															</Text>
														</Flex>
													</Flex>
												</Card>
											</Anchor>
										);
									})}

									<div ref={castEndRef} />
								</SimpleGrid>

								{hasMoreCast && (
									<Flex justify="center" mt="md" mb="xl">
										<Button
											variant="outline"
											onClick={() => fetchCast(false, cast.length)}
											disabled={loadingCast}
											loading={loadingCast}
											loaderProps={{ type: "dots" }}
										>
											Load more
										</Button>
									</Flex>
								)}
							</>
						)}
					</Box>
				</>
			)}
		</Box>
	);
}
