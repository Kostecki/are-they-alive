import { createFileRoute } from "@tanstack/react-router";

import HomePageLayout from "~/components/HomePageLayout";
import SearchForm from "~/components/SearchForm";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<HomePageLayout>
			<SearchForm mt="xl" />
		</HomePageLayout>
	);
}
