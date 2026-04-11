#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Redis from "ioredis";

function loadEnvFromDotEnv() {
	const envPath = path.resolve(".env");

	if (!existsSync(envPath)) {
		return;
	}

	const contents = readFileSync(envPath, "utf8");

	for (const line of contents.split(/\r?\n/)) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
			continue;
		}

		const splitIndex = trimmed.indexOf("=");
		const key = trimmed.slice(0, splitIndex).trim();
		const value = trimmed
			.slice(splitIndex + 1)
			.trim()
			.replace(/^['"]|['"]$/g, "");

		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
}

function parseArgs(argv) {
	let tmdbId;
	let mediaType;

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];

		if (arg === "--id") {
			tmdbId = Number(argv[i + 1]);
			i += 1;
			continue;
		}

		if (arg === "--type") {
			mediaType = argv[i + 1];
			i += 1;
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}
	}

	if (tmdbId !== undefined && (!Number.isInteger(tmdbId) || tmdbId <= 0)) {
		throw new Error("--id must be a positive integer.");
	}

	if (mediaType !== undefined && mediaType !== "movie" && mediaType !== "tv") {
		throw new Error('--type must be either "movie" or "tv".');
	}

	if (mediaType && tmdbId === undefined) {
		throw new Error("--type requires --id.");
	}

	return { tmdbId, mediaType };
}

function printHelp() {
	console.log(
		`Usage:\n  pnpm cache:clear\n  pnpm cache:clear -- --id 1399\n  pnpm cache:clear -- --id 1399 --type tv\n\nBehavior:\n  - No flags: clear all app cache keys (movie, tv, credits, person).\n  - --id: clear cache keys for one TMDB id (movie+tv details and related credits).\n  - --id + --type: clear cache keys for one TMDB id and one media type only.`,
	);
}

async function scanAndDelete(redis, pattern) {
	let cursor = "0";
	let deleted = 0;

	do {
		const [nextCursor, keys] = await redis.scan(
			cursor,
			"MATCH",
			pattern,
			"COUNT",
			500,
		);
		cursor = nextCursor;

		if (keys.length > 0) {
			deleted += await redis.del(...keys);
		}
	} while (cursor !== "0");

	return deleted;
}

function getPatterns(tmdbId, mediaType) {
	if (tmdbId === undefined) {
		return ["movie:*", "tv:*", "credits:*", "person:*"];
	}

	if (mediaType === "movie") {
		return [`movie:${tmdbId}`, `credits:movie:${tmdbId}:*`];
	}

	if (mediaType === "tv") {
		return [`tv:${tmdbId}`, `credits:tv:${tmdbId}:*`];
	}

	return [
		`movie:${tmdbId}`,
		`tv:${tmdbId}`,
		`credits:movie:${tmdbId}:*`,
		`credits:tv:${tmdbId}:*`,
	];
}

async function main() {
	loadEnvFromDotEnv();

	const { tmdbId, mediaType } = parseArgs(process.argv.slice(2));

	if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
		throw new Error("REDIS_HOST and REDIS_PORT are required in environment.");
	}

	const redis = new Redis({
		host: process.env.REDIS_HOST,
		port: Number(process.env.REDIS_PORT),
		password: process.env.REDIS_PASSWORD || undefined,
	});

	try {
		const patterns = getPatterns(tmdbId, mediaType);
		let totalDeleted = 0;

		for (const pattern of patterns) {
			const deleted = await scanAndDelete(redis, pattern);
			totalDeleted += deleted;
			console.log(`[cache:clear] pattern=${pattern} deleted=${deleted}`);
		}

		console.log(`[cache:clear] done total_deleted=${totalDeleted}`);
	} finally {
		redis.disconnect();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
