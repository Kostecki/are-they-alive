import { Box, Divider } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import type { Result } from "~/types";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";
import TrendingGrid from "~/components/TrendingGrid";
import { getApiClient, getApiPath } from "~/utils/api";

export const Route = createFileRoute("/")({
	loader: async () => {
		try {
			const client = getApiClient();
			const details = await client
				.get(getApiPath("api/featured"))
				.json<{ results: Result[] }>();

			return { details };
		} catch (error) {
			console.error("Error in home route loader:", error);
			return { details: null };
		}
	},
	component: Home,
});

function Home() {
	const { details } = Route.useLoaderData();

	const featuredItems: Result[] = details?.results
		? details.results.slice(0, 10)
		: [];

	return (
		<HomePageLayout>
			<SearchForm mt="xl" />

			{featuredItems.length > 0 && (
				<Box mt={50}>
					<Divider my="xl" opacity={0.5} />
					<TrendingGrid items={featuredItems} />
				</Box>
			)}
		</HomePageLayout>
	);
}
