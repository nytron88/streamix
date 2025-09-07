import redis from '../redis/redis';

export interface FollowNotificationData {
  id: string;
  followerId: string;
  channelId: string;
  action: 'FOLLOWED' | 'UNFOLLOWED';
  createdAt: string;
  // Additional metadata
  channelName?: string;
  followerName?: string;
  followerEmail?: string;
}

export class FollowNotificationService {
  private static readonly NOTIFICATION_PREFIX = 'notification:follow:';
  private static readonly PENDING_PREFIX = 'notification:pending:follow:';
  private static readonly TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Store a follow notification in Redis
   * @param notification - The follow notification data
   * @returns Promise<boolean> - true if stored successfully
   */
  static async storeNotification(notification: FollowNotificationData): Promise<boolean> {
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
      console.error('Error storing follow notification:', error);
      return false;
    }
  }

  /**
   * Get a follow notification by ID
   * @param notificationId - The notification ID
   * @returns Promise<FollowNotificationData | null>
   */
  static async getNotification(notificationId: string): Promise<FollowNotificationData | null> {
    try {
      const key = `${this.NOTIFICATION_PREFIX}${notificationId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting follow notification:', error);
      return null;
    }
  }

  /**
   * Get all pending follow notifications for batch processing
   * @returns Promise<FollowNotificationData[]>
   */
  static async getPendingNotifications(): Promise<FollowNotificationData[]> {
    try {
      const pendingIds = await redis.smembers('notification:pending:list');
      if (pendingIds.length === 0) return [];

      const notifications: FollowNotificationData[] = [];
      
      for (const id of pendingIds) {
        const notification = await this.getNotification(id);
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error getting pending follow notifications:', error);
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
      console.error('Error marking follow notifications as processed:', error);
      return false;
    }
  }

  /**
   * Get follow notifications for a specific channel
   * @param channelId - The channel ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<FollowNotificationData[]>
   */
  static async getNotificationsForChannel(channelId: string, limit: number = 50): Promise<FollowNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: FollowNotificationData[] = [];
      
      // Get all notifications and filter by channel
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as FollowNotificationData;
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
      console.error('Error getting follow notifications for channel:', error);
      return [];
    }
  }

  /**
   * Get follow notifications for a specific user (follower)
   * @param userId - The user ID
   * @param limit - Maximum number of notifications to return
   * @returns Promise<FollowNotificationData[]>
   */
  static async getNotificationsForUser(userId: string, limit: number = 50): Promise<FollowNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: FollowNotificationData[] = [];
      
      // Get all notifications and filter by user
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as FollowNotificationData;
          if (notification.followerId === userId) {
            notifications.push(notification);
          }
        }
      }

      // Sort by creation date (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting follow notifications for user:', error);
      return [];
    }
  }

  /**
   * Get follow notifications by action type
   * @param action - The action type
   * @param limit - Maximum number of notifications to return
   * @returns Promise<FollowNotificationData[]>
   */
  static async getNotificationsByAction(action: FollowNotificationData['action'], limit: number = 50): Promise<FollowNotificationData[]> {
    try {
      const pattern = `${this.NOTIFICATION_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return [];

      const notifications: FollowNotificationData[] = [];
      
      // Get all notifications and filter by action
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const notification = JSON.parse(data) as FollowNotificationData;
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
      console.error('Error getting follow notifications by action:', error);
      return [];
    }
  }

  /**
   * Get recent followers for a channel (only FOLLOWED actions)
   * @param channelId - The channel ID
   * @param limit - Maximum number of followers to return
   * @returns Promise<FollowNotificationData[]>
   */
  static async getRecentFollowers(channelId: string, limit: number = 20): Promise<FollowNotificationData[]> {
    try {
      const notifications = await this.getNotificationsForChannel(channelId, limit * 2);
      
      // Filter only FOLLOWED actions and limit
      return notifications
        .filter(n => n.action === 'FOLLOWED')
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent followers:', error);
      return [];
    }
  }

  /**
   * Clear a specific follow notification
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
      console.error('Error clearing follow notification:', error);
      return false;
    }
  }

  /**
   * Clear all follow notifications (for testing or cleanup)
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
      console.error('Error clearing all follow notifications:', error);
      return false;
    }
  }

  /**
   * Get statistics about follow notifications
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
          const notification = JSON.parse(data) as FollowNotificationData;
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
      console.error('Error getting follow notification stats:', error);
      return { total: 0, pending: 0, processed: 0, byAction: {} };
    }
  }
}

