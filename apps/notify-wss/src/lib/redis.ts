import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

// Main Redis client for subscribing
export const redis = new Redis(config.redis.url, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

// Separate Redis client for publishing (if needed)
export const redisPublisher = new Redis(config.redis.url, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('Redis subscriber connected');
});

redis.on('error', (error) => {
  logger.error('Redis subscriber error:', error);
});

redisPublisher.on('connect', () => {
  logger.info('Redis publisher connected');
});

redisPublisher.on('error', (error) => {
  logger.error('Redis publisher error:', error);
});

export default redis;
