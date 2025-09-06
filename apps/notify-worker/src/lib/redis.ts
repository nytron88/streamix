import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redis.url, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export default redis;
