import { Grid, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import SearchForm from "~/components/SearchForm";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<Grid justify="center" pt="50">
			<Grid.Col span={10}>
				<Title order={1} ta="center">
					Are They Alive?
				</Title>
				<Text c="dimmed" fs="italic" size="sm" ta="center">
					Find out how life treated the cast of your favorite films and shows.
				</Text>

				<SearchForm mt="xl" />
			</Grid.Col>
		</Grid>
	);
}
