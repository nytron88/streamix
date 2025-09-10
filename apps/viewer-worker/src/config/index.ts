import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/streamix',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  worker: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '30000', 10), // 30 seconds
    healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || '3003', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
