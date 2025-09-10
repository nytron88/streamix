import { WorkerService } from './services/workerService';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';

async function main() {
  try {
    console.log('Initializing viewer worker...');

    // Connect to Redis
    await redis.connect();
    console.log('Connected to Redis');

    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');

    // Start the worker
    await WorkerService.start();

  } catch (error) {
    console.error('Failed to start viewer worker:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
