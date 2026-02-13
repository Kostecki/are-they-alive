import { createFileRoute } from "@tanstack/react-router";

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

				const details =
					mediaType === "movie"
						? await tmdb.movies.details(id)
						: await tmdb.tvShows.details(id);

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
