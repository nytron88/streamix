import redis from '../redis/redis';

export interface SubscriptionNotificationData {
  id: string;
  userId: string;
  channelId: string;
  stripeSubId: string;
  status: 'ACTIVE' | 'CANCELED' | 'CANCEL_SCHEDULED' | 'PAST_DUE' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'TRIALING';
  currentPeriodEnd: string | null;
  createdAt: string;
  // Additional metadata
  channelName?: string;
  subscriberName?: string;
  subscriberEmail?: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RENEWED';
}

export class SubscriptionNotificationService {
  private static readonly NOTIFICATION_PREFIX = 'notification:subscription:';
  private static readonly PENDING_PREFIX = 'notification:pending:subscription:';
  private static readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Store a subscription notification in Redis
   * @param notification - The subscription notification data
   * @returns Promise<boolean> - true if stored successfully
   */
  static async storeNotification(notification: SubscriptionNotificationData): Promise<boolean> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notification.id}`;
      const pendingKey = `${this.PENDING_PREFIX}${notification.id}`;
      
      // Store the notification
      await redis.setex(key, this.TTL_SECONDS, JSON.stringify(notification));
      
      // Add to pending list for batch processing
      await redis.sadd('notification:pending:list', notification.id);
      await redis.setex(pendingKey, this.TTL_SECONDS, '1');
      
      console.log('Stored subscription notification:', notification.id);
      return true;
    } catch (error) {
      console.error('Error storing subscription notification:', error);
      return false;
    }
  }

  /**
   * Get a subscription notification by ID
   * @param notificationId - The notification ID
   * @returns Promise<SubscriptionNotificationData | null>
   */
  static async getNotification(notificationId: string): Promise<SubscriptionNotificationData | null> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notificationId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting subscription notification:', error);
      return null;
    }
  }

  /**
   * Get all pending subscription notifications for batch processing
   * @returns Promise<SubscriptionNotificationData[]>
   */
  static async getPendingNotifications(): Promise<SubscriptionNotificationData[]> {
    try {
      const pendingIds = await redis.smembers('notification:pending:list');
      if (pendingIds.length === 0) return [];

      const notifications: SubscriptionNotificationData[] = [];
      
      for (const id of pendingIds) {
        const notification = await this.getNotification(id);
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error getting pending subscription notifications:', error);
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

      console.log(`Marked ${notificationIds.length} subscription notifications as processed`);
      return true;
    } catch (error) {
      console.error('Error marking subscription notifications as processed:', error);
      return false;
    }
  }

  /**
   * Get subscription notifications for a specific channel
   * @param channelId - The channel ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<SubscriptionNotificationData[]>
   */
  static async getNotificationsForChannel(channelId: string, limit: number = 50): Promise<SubscriptionNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: SubscriptionNotificationData[] = [];
      
      // Get all notifications and filter by channel
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as SubscriptionNotificationData;
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
      console.error('Error getting subscription notifications for channel:', error);
      return [];
    }
  }

  /**
   * Get subscription notifications for a specific user (subscriber)
   * @param userId - The user ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<SubscriptionNotificationData[]>
   */
  static async getNotificationsForUser(userId: string, limit: number = 50): Promise<SubscriptionNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: SubscriptionNotificationData[] = [];
      
      // Get all notifications and filter by user
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as SubscriptionNotificationData;
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
      console.error('Error getting subscription notifications for user:', error);
      return [];
    }
  }

  /**
   * Get subscription notifications by action type
   * @param action - The action type
   * @param limit - Maximum number of notifications to return
   * @returns Promise<SubscriptionNotificationData[]>
   */
  static async getNotificationsByAction(action: SubscriptionNotificationData['action'], limit: number = 50): Promise<SubscriptionNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: SubscriptionNotificationData[] = [];
      
      // Get all notifications and filter by action
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as SubscriptionNotificationData;
          if (notification.action === action) {
            notifications.push(notification);
          }
        }
      }

      // Sort by creation date (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting subscription notifications by action:', error);
      return [];
    }
  }

  /**
   * Clear a specific subscription notification
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
      console.error('Error clearing subscription notification:', error);
      return false;
    }
  }

  /**
   * Clear all subscription notifications (for testing or cleanup)
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
      console.error('Error clearing all subscription notifications:', error);
      return false;
    }
  }

  /**
   * Get statistics about subscription notifications
   * @returns Promise<{ total: number; pending: number; processed: number; byAction: Record<string, number> }>
   */
  static async getStats(): Promise<{ total: number; pending: number; processed: number; byAction: Record<string, number> }> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      const pendingIds = await redis.smembers('notification:pending:list');
      
      const byAction: Record<string, number> = {};
      
      // Count by action type
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as SubscriptionNotificationData;
          byAction[notification.action] = (byAction[notification.action] || 0) + 1;
        }
      }
      
      return {
        total: keys.length,
        pending: pendingIds.length,
        processed: keys.length - pendingIds.length,
        byAction,
      };
    } catch (error) {
      console.error('Error getting subscription notification stats:', error);
      return { total: 0, pending: 0, processed: 0, byAction: {} };
    }
  }
}

