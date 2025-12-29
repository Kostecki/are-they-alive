import { createFileRoute } from "@tanstack/react-router";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";

export const Route = createFileRoute("/$mediaType/$identifier")({
	component: RouteComponent,
});

function RouteComponent() {
	const { mediaType, identifier } = Route.useParams();

	const id = identifier.split("-")[0];

	return (
		<HomePageLayout>
			<SearchForm mt="xl" type={mediaType} id={id} />
		</HomePageLayout>
	);
}
