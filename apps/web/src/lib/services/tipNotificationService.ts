import redis from '../redis/redis';

export interface TipNotificationData {
  id: string;
  userId: string | null;
  channelId: string;
  amountCents: number;
  currency: string;
  stripePaymentIntent: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  createdAt: string;
  // Additional metadata
  channelName?: string;
  viewerName?: string;
  viewerEmail?: string;
}

export class TipNotificationService {
  private static readonly NOTIFICATION_PREFIX = 'notification:tip:';
  private static readonly PENDING_PREFIX = 'notification:pending:tip:';
  private static readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Store a tip notification in Redis
   * @param notification - The tip notification data
   * @returns Promise<boolean> - true if stored successfully
   */
  static async storeNotification(notification: TipNotificationData): Promise<boolean> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notification.id}`;
      const pendingKey = `${this.PENDING_PREFIX}${notification.id}`;
      
      // Store the notification
      await redis.setex(key, this.TTL_SECONDS, JSON.stringify(notification));
      
      // Add to pending list for batch processing
      await redis.sadd('notification:pending:list', notification.id);
      await redis.setex(pendingKey, this.TTL_SECONDS, '1');
      
      return true;
    } catch (error) {
      console.error('Error storing tip notification:', error);
      return false;
    }
  }

  /**
   * Get a tip notification by ID
   * @param notificationId - The notification ID
   * @returns Promise<TipNotificationData | null>
   */
  static async getNotification(notificationId: string): Promise<TipNotificationData | null> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notificationId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting tip notification:', error);
      return null;
    }
  }

  /**
   * Get all pending tip notifications for batch processing
   * @returns Promise<TipNotificationData[]>
   */
  static async getPendingNotifications(): Promise<TipNotificationData[]> {
    try {
      const pendingIds = await redis.smembers('notification:pending:list');
      if (pendingIds.length === 0) return [];

      const notifications: TipNotificationData[] = [];
      
      for (const id of pendingIds) {
        const notification = await this.getNotification(id);
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error getting pending tip notifications:', error);
      return [];
    }
  }

  /**
   * Mark notifications as processed (remove from pending list)
   * @param notificationIds - Array of notification IDs to mark as processed
   * @returns Promise<boolean>
   */
  static async markAsProcessed(notificationIds: string[]): Promise<boolean> {
    try {
      if (notificationIds.length === 0) return true;

      // Remove from pending list
      await redis.srem('notification:pending:list', ...notificationIds);
      
      // Remove pending keys
      const pendingKeys = notificationIds.map(id => `${this.PENDING_PREFIX}${id}`);
      if (pendingKeys.length > 0) {
        await redis.del(...pendingKeys);
      }

      return true;
    } catch (error) {
      console.error('Error marking tip notifications as processed:', error);
      return false;
    }
  }

  /**
   * Get tip notifications for a specific channel
   * @param channelId - The channel ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<TipNotificationData[]>
   */
  static async getNotificationsForChannel(channelId: string, limit: number = 50): Promise<TipNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: TipNotificationData[] = [];
      
      // Get all notifications and filter by channel
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as TipNotificationData;
          if (notification.channelId === channelId) {
            notifications.push(notification);
          }
        }
      }

      // Sort by creation date (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting tip notifications for channel:', error);
      return [];
    }
  }

  /**
   * Get tip notifications for a specific user (viewer)
   * @param userId - The user ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<TipNotificationData[]>
   */
  static async getNotificationsForUser(userId: string, limit: number = 50): Promise<TipNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: TipNotificationData[] = [];
      
      // Get all notifications and filter by user
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as TipNotificationData;
          if (notification.userId === userId) {
            notifications.push(notification);
          }
        }
      }

      // Sort by creation date (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting tip notifications for user:', error);
      return [];
    }
  }

  /**
   * Clear a specific tip notification
   * @param notificationId - The notification ID
   * @returns Promise<boolean>
   */
  static async clearNotification(notificationId: string): Promise<boolean> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notificationId}`;
      const pendingKey = `${this.PENDING_PREFIX}${notificationId}`;
      
      await redis.del(key, pendingKey);
      await redis.srem('notification:pending:list', notificationId);
      
      return true;
    } catch (error) {
      console.error('Error clearing tip notification:', error);
      return false;
    }
  }

  /**
   * Clear all tip notifications (for testing or cleanup)
   * @returns Promise<boolean>
   */
  static async clearAllNotifications(): Promise<boolean> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const pendingPattern = `${this.PENDING_PREFIX}*`;
      
      const keys = await redis.keys(pattern);
      const pendingKeys = await redis.keys(pendingPattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      if (pendingKeys.length > 0) {
        await redis.del(...pendingKeys);
      }
      
      await redis.del('notification:pending:list');
      
      return true;
    } catch (error) {
      console.error('Error clearing all tip notifications:', error);
      return false;
    }
  }

  /**
   * Get statistics about tip notifications
   * @returns Promise<{ total: number; pending: number; processed: number }>
   */
  static async getStats(): Promise<{ total: number; pending: number; processed: number }> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const pendingIds = await redis.smembers('notification:pending:list');
      
      return {
        total: keys.length,
        pending: pendingIds.length,
        processed: keys.length - pendingIds.length,
      };
    } catch (error) {
      console.error('Error getting tip notification stats:', error);
      return { total: 0, pending: 0, processed: 0 };
    }
  }
}

