import { WebSocketServer } from './services/websocketServer';
import { logger } from './lib/logger';
import { redis, redisPublisher } from './lib/redis';

async function startServer() {
  try {
    logger.info('Starting Streamix WebSocket Notification Server...');

    // Test Redis connections
    await redis.ping();
    await redisPublisher.ping();
    logger.info('Redis connections established');

    // Create and start WebSocket server
    const wsServer = new WebSocketServer();
    await wsServer.start();

    // Setup graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        await wsServer.stop();
        await redis.quit();
        await redisPublisher.quit();
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });

    logger.info('WebSocket notification server is running');

    // Log server stats periodically
    setInterval(() => {
      const stats = wsServer.getStats();
      logger.info('Server stats', stats);
    }, 60000); // Every minute

  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

// Start the server
startServer();
