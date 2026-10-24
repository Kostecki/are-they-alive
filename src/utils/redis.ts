// server/redis.ts
import Redis from "ioredis";

const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 30_000;
const CONNECT_TIMEOUT_MS = 2000;

let redisInstance: Redis | null = null;
let redisDisabled = false;
let hasLoggedConfigWarning = false;
let isConnectionDown = false;
let connectPromise: Promise<void> | null = null;

function hasRedisConfig() {
	return Boolean(process.env.REDIS_HOST && process.env.REDIS_PORT);
}

export function getRedisOptional(): Redis | null {
	if (redisDisabled) {
		return null;
	}

	if (!hasRedisConfig()) {
		if (!hasLoggedConfigWarning) {
			hasLoggedConfigWarning = true;
			console.warn(
				"Redis cache disabled: REDIS_HOST/REDIS_PORT not configured.",
			);
		}
		redisDisabled = true;
		return null;
	}

	if (!redisInstance) {
		redisInstance = new Redis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
			password: process.env.REDIS_PASSWORD || undefined,
			lazyConnect: true,
			enableOfflineQueue: false,
			maxRetriesPerRequest: 1,
			connectTimeout: CONNECT_TIMEOUT_MS,
			// Keep retrying with backoff; requests skip the cache in the meantime
			retryStrategy: (times) =>
				Math.min(times * RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_DELAY_MS),
		});

		const markDown = (reason: string) => {
			if (!isConnectionDown) {
				isConnectionDown = true;
				console.warn(
					`Redis unavailable, serving without cache until it reconnects: ${reason}`,
				);
			}
		};

		redisInstance.on("error", (error) => markDown(error.message));
		// A clean server shutdown closes the socket without emitting "error"
		redisInstance.on("reconnecting", () => markDown("connection closed"));

		redisInstance.on("ready", () => {
			if (isConnectionDown) {
				isConnectionDown = false;
				console.info("Redis reconnected, cache re-enabled.");
			}
		});
	}

	return redisInstance;
}

// With lazyConnect + enableOfflineQueue: false, commands sent before the
// connection is ready are rejected instead of queued. The first caller(s)
// wait for the initial connection; during a later outage callers get null
// immediately while ioredis reconnects in the background.
export async function getReadyRedis(): Promise<Redis | null> {
	const redis = getRedisOptional();

	if (!redis) {
		return null;
	}

	if (redis.status === "wait" || redis.status === "end") {
		connectPromise ??= redis.connect().finally(() => {
			connectPromise = null;
		});
	}

	if (connectPromise) {
		try {
			await connectPromise;
		} catch {
			return null;
		}
	}

	return redis.status === "ready" ? redis : null;
}
