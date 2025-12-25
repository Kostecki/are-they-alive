import { createRouter } from "@tanstack/react-router";

import { DefaultCatchBoundary } from "./components/Errors/DefaultCatchBoundary";
import { NotFound } from "./components/Errors/NotFound";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
		scrollRestoration: true,
	});
	return router;
}
