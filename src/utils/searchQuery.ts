export type ParsedSearchQuery = {
	query: string;
	type?: "movie" | "tv";
	year?: number;
};

const TYPE_PREFIXES: Record<string, "movie" | "tv"> = {
	tv: "tv",
	show: "tv",
	series: "tv",
	movie: "movie",
	film: "movie",
};

const PREFIX_PATTERN = /^\s*([a-z]+)\s*:\s*/i;
const TRAILING_YEAR_PATTERN = /\s+\(?(\d{4})\)?\s*$/;
const MIN_YEAR = 1870;

// Parses "tv: matador 1978" into { query: "matador", type: "tv", year: 1978 }.
// A query that is only a year ("1917") is left alone, so it still searches by
// title.
export function parseSearchQuery(input: string): ParsedSearchQuery {
	let query = input.trim();
	let type: ParsedSearchQuery["type"];
	let year: number | undefined;

	const prefixMatch = query.match(PREFIX_PATTERN);
	const prefixType = prefixMatch && TYPE_PREFIXES[prefixMatch[1].toLowerCase()];
	if (prefixMatch && prefixType) {
		type = prefixType;
		query = query.slice(prefixMatch[0].length);
	}

	const yearMatch = query.match(TRAILING_YEAR_PATTERN);
	if (yearMatch) {
		const candidate = Number(yearMatch[1]);
		const maxYear = new Date().getFullYear() + 2;
		const rest = query.slice(0, yearMatch.index).trim();
		if (candidate >= MIN_YEAR && candidate <= maxYear && rest.length > 0) {
			year = candidate;
			query = rest;
		}
	}

	return { query: query.trim(), type, year };
}
