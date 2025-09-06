import { NotificationWorker } from './services/notificationWorker';
import { logger } from './lib/logger';
import prisma from './lib/prisma';
import redis from './lib/redis';

class NotificationWorkerApp {
  private worker: NotificationWorker;
  private isShuttingDown = false;

  constructor() {
    this.worker = new NotificationWorker();
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Notification Worker Application...');

      // Test database connection
      await this.testDatabaseConnection();
      
      // Test Redis connection
      await this.testRedisConnection();

      // Start the worker
      await this.worker.start();

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

      logger.info('Notification Worker Application started successfully');
    } catch (error) {
      logger.error('Failed to start Notification Worker Application:', error);
      process.exit(1);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      await prisma.$connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  private async testRedisConnection(): Promise<void> {
    try {
      await redis.ping();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        // Stop the worker
        await this.worker.stop();

        // Disconnect from databases
        await prisma.$disconnect();
        redis.disconnect();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Start the application
const app = new NotificationWorkerApp();
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
