// server/redis.ts
import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
	if (!redisInstance) {
		if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
			throw new Error(
				"Redis configuration is missing in environment variables.",
			);
		}
		redisInstance = new Redis({
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
			password: process.env.REDIS_PASSWORD || undefined,
		});
	}
	return redisInstance;
}
