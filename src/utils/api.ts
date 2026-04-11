import ky from "ky";

/**
 * Creates a ky client that works in both SSR and client environments.
 *
 * - Server: Uses prefix with absolute URL (http://localhost:3000)
 * - Client: Uses default ky instance (relative URLs work fine)
 */
export function getApiClient() {
	const isServer = typeof window === "undefined";

	if (isServer) {
		return ky.create({
			prefix:
				process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
		});
	}

	return ky;
}

/**
 * Converts a path to the correct format for server vs client.
 *
 * - Server with prefix: "api/endpoint" (no leading slash)
 * - Client without prefixUrl: "/api/endpoint" (absolute path)
 */
export function getApiPath(path: string): string {
	const isServer = typeof window === "undefined";
	const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

	return isServer ? normalizedPath : `/${normalizedPath}`;
}
