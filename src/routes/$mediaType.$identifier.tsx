import { createFileRoute } from "@tanstack/react-router";
import type { MovieDetails } from "tmdb-ts/dist/types/movies";
import type { TvShowDetails } from "tmdb-ts/dist/types/tv-shows";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";
import { getApiClient, getApiPath } from "~/utils/api";
import { mapApiDetailsToResult } from "~/utils/helpers";

export const Route = createFileRoute("/$mediaType/$identifier")({
	loader: async ({ params }) => {
		const { mediaType, identifier } = params;
		const id = Number(identifier.split("-")[0]);

		if (mediaType !== "movie" && mediaType !== "tv") {
			throw new Error("Invalid media type");
		}

		try {
			const client = getApiClient();
			const details = await client
				.get(getApiPath(`api/${mediaType}/${id}`))
				.json<MovieDetails | (TvShowDetails & { imdb_id: string | null })>();
			const result = mapApiDetailsToResult(details, mediaType);

			return { item: result };
		} catch (error) {
			console.error("Error loading item details:", error);
			throw error;
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { item } = Route.useLoaderData();

	return (
		<HomePageLayout>
			<SearchForm mt="xl" initialItem={item} />
		</HomePageLayout>
	);
}
