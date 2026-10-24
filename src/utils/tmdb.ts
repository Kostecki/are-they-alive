import { TMDB } from "tmdb-ts";

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

let tmdbInstance: TMDB | null = null;

// TMDB answers 429 when it's being hit too hard; back off and retry instead of
// failing, honouring Retry-After when it's sent
async function fetchWithRetry(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		const response = await fetch(input, init);
		if (response.status !== 429 || attempt >= MAX_RETRIES) {
			return response;
		}

		const retryAfterSeconds = Number(response.headers.get("retry-after"));
		const delayMs =
			retryAfterSeconds > 0
				? retryAfterSeconds * 1000
				: RETRY_BASE_DELAY_MS * 2 ** attempt;
		await response.body?.cancel();
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}
}

export function getTMDB(): TMDB {
	if (!tmdbInstance) {
		if (!process.env.TMDB_API_TOKEN) {
			throw new Error(
				"TMDB Read Access token is missing in environment variables.",
			);
		}
		tmdbInstance = new TMDB(process.env.TMDB_API_TOKEN, {
			fetch: fetchWithRetry as typeof fetch,
		});
	}
	return tmdbInstance;
}
