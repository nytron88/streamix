import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  redis_channels: {
    userNotifications: 'user:notifications:',
    channelNotifications: 'channel:notifications:',
    globalNotifications: 'notifications:all',
  },
} as const;
