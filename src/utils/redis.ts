// server/redis.ts
import Redis from "ioredis";

if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
  throw new Error("Redis configuration is missing in environment variables.");
}

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined,
});

export default redis;
