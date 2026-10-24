import { createFileRoute } from "@tanstack/react-router";

// Liveness check for the container healthcheck; intentionally avoids TMDB/Redis
export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: () => Response.json({ status: "ok" }),
		},
	},
});
