import { Combobox, Loader, TextInput, useCombobox } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { Result } from "~/types";

type InputProps = {
	onDebouncedChange: (value: string) => void;
	results: Result[];
	loading: boolean;
};

function SearchInput({ onDebouncedChange, results, loading }: InputProps) {
	const [value, setValue] = useState("");
	const [debounced] = useDebouncedValue(value, 300);
	const navigate = useNavigate();
	const combobox = useCombobox();
	const prevResultsLengthRef = useRef(0);
	const inputRef = useRef<HTMLInputElement>(null);

	// Notify parent of debounced value changes
	useEffect(() => {
		onDebouncedChange(debounced);
	}, [debounced, onDebouncedChange]);

	const movies = useMemo(
		() => results.filter((r) => r.mediaType === "movie"),
		[results],
	);
	const tvShows = useMemo(
		() => results.filter((r) => r.mediaType === "tv"),
		[results],
	);

	const handleSelect = (optionValue: string) => {
		const selected = results.find((r) => String(r.id) === optionValue);
		if (!selected) return;

		// Clear the search input and remove focus
		setValue("");
		inputRef.current?.blur();

		// Navigate to the route - the loader will handle fetching data
		const titleSlug = selected.label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");

		navigate({
			to: "/$mediaType/$identifier",
			params: {
				mediaType: selected.mediaType,
				identifier: `${selected.id}-${titleSlug}`,
			},
		});

		combobox.closeDropdown();
	};

	// Open dropdown only when results first arrive
	// biome-ignore lint/correctness/useExhaustiveDependencies: combobox is stable, only need to track results.length
	useEffect(() => {
		if (results.length > 0 && prevResultsLengthRef.current === 0) {
			combobox.openDropdown();
		}
		prevResultsLengthRef.current = results.length;
	}, [results.length]);

	return (
		<Combobox store={combobox} onOptionSubmit={handleSelect}>
			<Combobox.Target>
				<TextInput
					ref={inputRef}
					value={value}
					onChange={(e) => setValue(e.currentTarget.value)}
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
									{/* TODO: Mantine-ify */}
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
									{/* TODO: Mantine-ify */}
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
	);
}

export default memo(SearchInput);
