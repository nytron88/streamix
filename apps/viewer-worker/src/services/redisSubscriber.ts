import { redis } from '../lib/redis';
import { ViewCountService } from './viewCountService';
import { config } from '../config';

export class RedisSubscriber {
  private static isSubscribed = false;
  private static subscriber: any = null;

  /**
   * Start Redis subscription for real-time view count updates
   */
  static async startSubscription(): Promise<void> {
    if (this.isSubscribed) {
      console.log('Redis subscription already active');
      return;
    }

    try {
      // Create a separate Redis client for subscriptions
      this.subscriber = redis.duplicate();
      await this.subscriber.connect();

      // Subscribe to view count update channel
      await this.subscriber.subscribe('view_count_updates', (message: string) => {
        try {
          const data = JSON.parse(message);
          console.log('Received view count update:', data);
          
          // Process the update immediately for real-time updates
          this.processViewCountUpdate(data);
        } catch (error) {
          console.error('Error processing view count update message:', error);
        }
      });

      this.isSubscribed = true;
      console.log('Redis subscription started for view count updates');
    } catch (error) {
      console.error('Error starting Redis subscription:', error);
      throw error;
    }
  }

  /**
   * Stop Redis subscription
   */
  static async stopSubscription(): Promise<void> {
    if (!this.isSubscribed || !this.subscriber) {
      return;
    }

    try {
      await this.subscriber.unsubscribe('view_count_updates');
      await this.subscriber.quit();
      this.subscriber = null;
      this.isSubscribed = false;
      console.log('Redis subscription stopped');
    } catch (error) {
      console.error('Error stopping Redis subscription:', error);
    }
  }

  /**
   * Process a single view count update
   */
  private static async processViewCountUpdate(data: { vodId: string; count: number }): Promise<void> {
    try {
      const { vodId, count } = data;
      
      if (!vodId || typeof count !== 'number' || count <= 0) {
        console.warn('Invalid view count update data:', data);
        return;
      }

      // Update the view count in Redis
      const viewKey = `vod:views:${vodId}`;
      await redis.incrBy(viewKey, count);
      
      console.log(`Updated view count for VOD ${vodId} by ${count}`);
    } catch (error) {
      console.error('Error processing view count update:', error);
    }
  }

  /**
   * Publish a view count update (for testing or external triggers)
   */
  static async publishViewCountUpdate(vodId: string, count: number): Promise<void> {
    try {
      const message = JSON.stringify({ vodId, count });
      await redis.publish('view_count_updates', message);
      console.log(`Published view count update for VOD ${vodId}: +${count}`);
    } catch (error) {
      console.error('Error publishing view count update:', error);
    }
  }

  /**
   * Get subscription status
   */
  static getStatus(): { isSubscribed: boolean } {
    return { isSubscribed: this.isSubscribed };
  }
}
