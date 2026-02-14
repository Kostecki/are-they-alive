import { createFileRoute } from "@tanstack/react-router";
import type { MovieDetails } from "tmdb-ts/dist/types/movies";
import type { TvShowDetails } from "tmdb-ts/dist/types/tv-shows";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";
import { mapApiDetailsToResult } from "~/utils/helpers";

export const Route = createFileRoute("/$mediaType/$identifier")({
	loader: async ({ params }) => {
		const { mediaType, identifier } = params;
		const id = Number(identifier.split("-")[0]);

		if (mediaType !== "movie" && mediaType !== "tv") {
			throw new Error("Invalid media type");
		}

		try {
			// Check if we're on the server
			const isServer = typeof window === "undefined";

			if (isServer) {
				// On the server, use dynamic import to access tmdb directly
				const { getTMDB } = await import("~/utils/tmdb");
				const tmdb = getTMDB();

				let details:
					| MovieDetails
					| (TvShowDetails & { imdb_id: string | null });
				if (mediaType === "movie") {
					details = await tmdb.movies.details(id);
				} else {
					// Fetch both details and external IDs for TV shows to get IMDB ID
					const [tvDetails, externalIds] = await Promise.all([
						tmdb.tvShows.details(id),
						tmdb.tvShows.externalIds(id),
					]);
					details = {
						...tvDetails,
						imdb_id: externalIds.imdb_id || null,
					};
				}

				const result = mapApiDetailsToResult(details, mediaType);
				return { item: result };
			} else {
				// On the client, fetch from the API endpoint
				const response = await fetch(`/api/${mediaType}/${id}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch ${mediaType} details`);
				}
				const details = await response.json();
				const result = mapApiDetailsToResult(details, mediaType);
				return { item: result };
			}
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
