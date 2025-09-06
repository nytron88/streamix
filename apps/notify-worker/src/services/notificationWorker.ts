import { NotificationProcessor } from './notificationProcessor';
import { NotificationStorage } from './notificationStorage';
import { NotificationPublisher } from './notificationPublisher';
import { logger } from '../lib/logger';
import { config } from '../config';

export class NotificationWorker {
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;

  /**
   * Start the notification worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Notification worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting notification worker', {
      batchSize: config.worker.batchSize,
      processingInterval: config.worker.processingInterval,
      maxRetries: config.worker.maxRetries,
    });

    // Start the processing loop
    this.processingInterval = setInterval(
      () => this.processNotifications(),
      config.worker.processingInterval
    );

    // Process immediately on start
    await this.processNotifications();
  }

  /**
   * Stop the notification worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Notification worker is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('Notification worker stopped');
  }

  /**
   * Process pending notifications
   */
  private async processNotifications(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.debug('Processing notifications...');

      // Get pending notification IDs
      const pendingIds = await NotificationProcessor.getPendingNotificationIds();
      
      if (pendingIds.length === 0) {
        logger.debug('No pending notifications to process');
        this.retryCount = 0; // Reset retry count on success
        return;
      }

      // Process in batches
      const batches = this.createBatches(pendingIds, config.worker.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      this.retryCount++;
      logger.error(`Error in notification processing (attempt ${this.retryCount}):`, error);

      if (this.retryCount >= config.worker.maxRetries) {
        logger.error(`Max retries reached (${config.worker.maxRetries}), stopping worker`);
        await this.stop();
      }
    }
  }

  /**
   * Process a batch of notification IDs
   */
  private async processBatch(notificationIds: string[]): Promise<void> {
    try {
      logger.info(`Processing batch of ${notificationIds.length} notifications`);

      // Get notification data
      const notifications = await NotificationProcessor.getNotificationsByIds(notificationIds);
      
      if (notifications.length === 0) {
        logger.warn('No valid notifications found in batch');
        // Still mark as processed to clean up invalid IDs
        await NotificationProcessor.markAsProcessed(notificationIds);
        return;
      }

      // Validate notifications
      const validNotifications = notifications.filter(notification => {
        const isValid = NotificationProcessor.validateNotificationData(notification.type, notification.data);
        if (!isValid) {
          logger.warn(`Invalid notification data for ${notification.id}`);
        }
        return isValid;
      });

      if (validNotifications.length === 0) {
        logger.warn('No valid notifications in batch after validation');
        await NotificationProcessor.markAsProcessed(notificationIds);
        return;
      }

      // Store notifications in Postgres
      const storageResult = await NotificationStorage.batchStoreNotifications(validNotifications);
      
      // Publish notifications to Redis for real-time updates
      const publishResult = await NotificationPublisher.batchPublishNotifications(validNotifications);

      // Log results
      logger.info('Batch processing results', {
        total: notificationIds.length,
        valid: validNotifications.length,
        stored: storageResult.success.length,
        storageFailed: storageResult.failed.length,
        published: publishResult.success.length,
        publishFailed: publishResult.failed.length,
      });

      // Mark successfully processed notifications as completed
      const successfullyProcessed = storageResult.success.filter(id => 
        publishResult.success.includes(id)
      );

      if (successfullyProcessed.length > 0) {
        await NotificationProcessor.markAsProcessed(successfullyProcessed);
        logger.info(`Marked ${successfullyProcessed.length} notifications as processed`);
      }

      // Log failed notifications for manual investigation
      const failed = [
        ...storageResult.failed,
        ...publishResult.failed.filter(id => !storageResult.failed.includes(id))
      ];

      if (failed.length > 0) {
        logger.error(`Failed to process ${failed.length} notifications:`, failed);
        // Note: We don't mark failed notifications as processed so they can be retried
      }

    } catch (error) {
      logger.error('Error processing batch:', error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Create batches from an array of items
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; retryCount: number } {
    return {
      isRunning: this.isRunning,
      retryCount: this.retryCount,
    };
  }

  /**
   * Force process notifications (for manual triggers)
   */
  async forceProcess(): Promise<void> {
    logger.info('Force processing notifications...');
    await this.processNotifications();
  }
}
