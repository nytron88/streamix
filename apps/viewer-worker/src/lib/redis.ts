import { createClient } from 'redis';
import { config } from '../config';

const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient> | undefined;
};

export const redis = globalForRedis.redis ?? createClient({
  url: config.redis.url,
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
