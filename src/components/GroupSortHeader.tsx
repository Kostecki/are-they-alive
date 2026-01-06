import { Box, Group, SegmentedControl, Select, Switch } from "@mantine/core";

type InputProps = {
	groupByStatus: boolean;
	setGroupByStatus: (value: boolean) => void;
	sortBy: string;
	setSortBy: (value: string) => void;
	sortOrder: "asc" | "desc";
	setSortOrder: (value: "asc" | "desc") => void;
};

const sortOptions = [
	{ value: "appearance", label: "Appearance" },
	{ value: "age", label: "Age" },
	{ value: "alphabetical", label: "Alphabetical" },
	{ value: "death", label: "Death" },
];

export function GroupSortHeader({
	groupByStatus,
	setGroupByStatus,
	sortBy,
	setSortBy,
	sortOrder,
	setSortOrder,
}: InputProps) {
	return (
		<Box bg="var(--mantine-color-body)">
			<Group justify="space-between" align="center">
				<Group gap="xs">
					<Switch
						checked={groupByStatus}
						onChange={(event) => setGroupByStatus(event.currentTarget.checked)}
						label="Status"
						description="Group by Alive/Deceased"
					/>
				</Group>

				<Group gap="xs">
					<Select
						size="xs"
						w={150}
						radius="md"
						placeholder="Sort by"
						value={sortBy}
						onChange={(value) => value && setSortBy(value)}
						data={sortOptions}
					/>
					<SegmentedControl
						size="xs"
						radius="md"
						data={[
							{ label: "↑", value: "asc" },
							{ label: "↓", value: "desc" },
						]}
						value={sortOrder}
						onChange={(value) => setSortOrder(value as "asc" | "desc")}
					/>
				</Group>
			</Group>
		</Box>
	);
}
