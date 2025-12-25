/// <reference types="vite/client" />

import {
	ColorSchemeScript,
	Container,
	MantineProvider,
	mantineHtmlProps,
} from "@mantine/core";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type * as React from "react";

import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import "@mantine/core/styles.css";

import { seo } from "~/utils/seo";

const IS_PROD = import.meta.env.PROD;
const SRC_URL = import.meta.env.VITE_UMAMI_SRC_URL;
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;

const UmamiScript = () => {
	if (!IS_PROD || !SRC_URL || !WEBSITE_ID) return null;

	return <script defer src={SRC_URL} data-website-id={WEBSITE_ID} />;
};

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({
				title:
					"Are They Alive? | Find out how life treated the cast of your favorite films and shows.",
				description: `Are They Alive? is a tool to discover the living status of actors from movies and TV shows.`,
			}),
		],
		links: [
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32x32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16x16.png",
			},
			{ rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
			{ rel: "icon", href: "/favicon.ico" },
		],
		scripts: [],
	}),
	errorComponent: DefaultCatchBoundary,
	notFoundComponent: () => <NotFound />,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" {...mantineHtmlProps}>
			<head>
				<HeadContent />
				<ColorSchemeScript />
				<UmamiScript />
			</head>
			<body>
				<MantineProvider defaultColorScheme="dark">
					<Container strategy="block" mih="100vh">
						{children}
					</Container>
				</MantineProvider>
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
