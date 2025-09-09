import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/streamix',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  worker: {
    batchSize: parseInt(process.env.BATCH_SIZE || '50', 10),
    processingInterval: parseInt(process.env.PROCESSING_INTERVAL || '5000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  cdn: {
    domain: process.env.CLOUDFRONT_DOMAIN || 'your-cdn-domain.com',
  },
} as const;
