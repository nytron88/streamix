import { ViewCountService } from './viewCountService';
import { HealthService } from './healthService';
import { RedisSubscriber } from './redisSubscriber';
import { config } from '../config';

export class WorkerService {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the viewer worker
   */
  static async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker is already running');
      return;
    }

    console.log('Starting viewer worker...');
    this.isRunning = true;

    // Start health check server
    HealthService.startHealthServer();

    // Start Redis subscription for real-time updates
    await RedisSubscriber.startSubscription();

    // Start batch processing
    this.startBatchProcessing();

    // Handle graceful shutdown
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));

    console.log('Viewer worker started successfully');
  }

  /**
   * Start batch processing
   */
  private static startBatchProcessing(): void {
    console.log(`Starting batch processing every ${config.worker.batchIntervalMs}ms`);
    
    // Process immediately on start
    this.processBatch();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.processBatch();
    }, config.worker.batchIntervalMs);
  }

  /**
   * Process a single batch
   */
  private static async processBatch(): Promise<void> {
    try {
      const processedCount = await ViewCountService.processBatch();
      
      if (processedCount > 0) {
        console.log(`Processed ${processedCount} view count updates`);
      }
    } catch (error) {
      console.error('Error in batch processing:', error);
    }
  }

  /**
   * Stop the viewer worker
   */
  static async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Worker is not running');
      return;
    }

    console.log('Stopping viewer worker...');
    this.isRunning = false;

    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop Redis subscription
    await RedisSubscriber.stopSubscription();

    // Stop health server
    HealthService.stopHealthServer();

    console.log('Viewer worker stopped');
  }

  /**
   * Graceful shutdown handler
   */
  private static async gracefulShutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    // Process any remaining batches before shutdown
    try {
      await this.processBatch();
    } catch (error) {
      console.error('Error during final batch processing:', error);
    }

    await this.stop();
    process.exit(0);
  }

  /**
   * Get worker status
   */
  static getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: config.worker.batchIntervalMs,
    };
  }
}
