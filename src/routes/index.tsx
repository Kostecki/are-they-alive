import { Box, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import type { MultiSearchResult, Search } from "tmdb-ts/dist/types/search";

import type { Result } from "~/types";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";
import TrendingGrid from "~/components/TrendingGrid";
import { getApiClient, getApiPath } from "~/utils/api";
import { mapApiDetailsToResult } from "~/utils/helpers";

export const Route = createFileRoute("/")({
	loader: async () => {
		try {
			const client = getApiClient();
			const details = await client
				.get(getApiPath("api/trending"))
				.json<Search<MultiSearchResult>>();

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

	const trendingMovies: Result[] = details?.results
		? details.results
				.filter((item) => item.media_type === "movie")
				.map((item) => mapApiDetailsToResult(item, item.media_type))
				.slice(0, 5)
		: [];

	const trendingTv: Result[] = details?.results
		? details.results
				.filter((item) => item.media_type === "tv")
				.map((item) => mapApiDetailsToResult(item, item.media_type))
				.slice(0, 5)
		: [];

	return (
		<HomePageLayout>
			<SearchForm mt="xl" />

			{(trendingMovies.length > 0 || trendingTv.length > 0) && (
				<Box mt={50}>
					<Title order={2} mb="md">
						Trending
					</Title>
					<TrendingGrid items={trendingMovies} />
					<TrendingGrid items={trendingTv} mt="xl" />
				</Box>
			)}
		</HomePageLayout>
	);
}
