import { createFileRoute } from "@tanstack/react-router";

import type { Result } from "~/types";

import { FEATURED_ITEMS } from "~/data/featuredItems";

const FEATURED_COUNT = 10;
const FEATURED_LANGUAGE = "en";

function pickRandom<T>(items: T[], count: number): T[] {
	const pool = [...items];

	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}

	return pool.slice(0, Math.min(count, pool.length));
}

export const Route = createFileRoute("/api/featured")({
	server: {
		handlers: {
			GET: async () => {
				try {
					const englishItems = FEATURED_ITEMS.filter(
						(item) => item.original_language === FEATURED_LANGUAGE,
					);
					const results: Result[] = pickRandom(englishItems, FEATURED_COUNT);

					return Response.json({
						results,
						page: 1,
						total_pages: 1,
						total_results: results.length,
					});
				} catch (error) {
					console.error("Featured API Error:", error);
					return new Response("Error fetching featured titles", {
						status: 500,
					});
				}
			},
		},
	},
});
