import { Combobox, Loader, TextInput, useCombobox } from "@mantine/core";

import type { Result } from "~/types";

type InputProps = {
	value: string;
	setValue: (value: string) => void;
	results: Result[];
	loading: boolean;
	onSelect: (selected: Result) => void;
};

export default function SearchInput({
	value,
	setValue,
	results,
	loading,
	onSelect,
}: InputProps) {
	const combobox = useCombobox();

	const movies = results.filter((r) => r.mediaType === "movie");
	const tvShows = results.filter((r) => r.mediaType === "tv");

	const handleSelect = (optionValue: string) => {
		const selected = results.find((r) => String(r.id) === optionValue);
		if (!selected) return;

		setValue(`${selected.label} (${selected.year})`);

		onSelect(selected);

		combobox.closeDropdown();
	};

	return (
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
