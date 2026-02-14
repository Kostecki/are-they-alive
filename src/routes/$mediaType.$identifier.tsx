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
			// During SSR, fetch needs an absolute URL
			const isServer = typeof window === "undefined";
			const baseUrl = isServer
				? process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
				: "";

			const response = await fetch(`${baseUrl}/api/${mediaType}/${id}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch ${mediaType} details`);
			}
			const details = await response.json();
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
