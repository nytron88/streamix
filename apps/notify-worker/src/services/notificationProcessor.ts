import redis from '../lib/redis';
import { logger } from '../lib/logger';
import { 
  TipNotificationData, 
  FollowNotificationData, 
  SubscriptionNotificationData,
  NotificationData 
} from '../types/notifications';

export class NotificationProcessor {
  private static readonly NOTIFICATION_PREFIXES = {
    TIP: 'notification:tip:',
    FOLLOW: 'notification:follow:',
    SUB: 'notification:subscription:',
  } as const;

  private static readonly PENDING_PREFIXES = {
    TIP: 'notification:pending:tip:',
    FOLLOW: 'notification:pending:follow:',
    SUB: 'notification:pending:subscription:',
  } as const;

  private static readonly PENDING_LIST = 'notification:pending:list';

  /**
   * Get all pending notification IDs from Redis
   */
  static async getPendingNotificationIds(): Promise<string[]> {
    try {
      const pendingIds = await redis.smembers(this.PENDING_LIST);
      logger.info(`Found ${pendingIds.length} pending notifications`);
      return pendingIds;
    } catch (error) {
      logger.error('Error getting pending notification IDs:', error);
      return [];
    }
  }

  /**
   * Get notification data by ID and determine its type
   */
  static async getNotificationById(id: string): Promise<{ type: 'TIP' | 'FOLLOW' | 'SUB'; data: NotificationData } | null> {
    try {
      // Try each notification type
      for (const [type, prefix] of Object.entries(this.NOTIFICATION_PREFIXES)) {
        const key = `${prefix}${id}`;
        const data = await redis.get(key);
        
        if (data) {
          const parsedData = JSON.parse(data);
          logger.debug(`Found ${type} notification:`, { id, data: parsedData });
          return {
            type: type as 'TIP' | 'FOLLOW' | 'SUB',
            data: parsedData
          };
        }
      }
      
      logger.warn(`Notification not found for ID: ${id}`);
      return null;
    } catch (error) {
      logger.error(`Error getting notification by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Get multiple notifications by their IDs
   */
  static async getNotificationsByIds(ids: string[]): Promise<Array<{ id: string; type: 'TIP' | 'FOLLOW' | 'SUB'; data: NotificationData }>> {
    const notifications: Array<{ id: string; type: 'TIP' | 'FOLLOW' | 'SUB'; data: NotificationData }> = [];
    
    for (const id of ids) {
      const notification = await this.getNotificationById(id);
      if (notification) {
        notifications.push({
          id,
          ...notification
        });
      }
    }
    
    return notifications;
  }

  /**
   * Mark notifications as processed (remove from pending list)
   */
  static async markAsProcessed(notificationIds: string[]): Promise<boolean> {
    try {
      if (notificationIds.length === 0) return true;

      // Remove from pending list
      await redis.srem(this.PENDING_LIST, ...notificationIds);
      
      // Remove pending keys for each type
      const pendingKeys: string[] = [];
      for (const id of notificationIds) {
        for (const prefix of Object.values(this.PENDING_PREFIXES)) {
          pendingKeys.push(`${prefix}${id}`);
        }
      }
      
      if (pendingKeys.length > 0) {
        await redis.del(...pendingKeys);
      }

      logger.info(`Marked ${notificationIds.length} notifications as processed`);
      return true;
    } catch (error) {
      logger.error('Error marking notifications as processed:', error);
      return false;
    }
  }

  /**
   * Validate notification data based on type
   */
  static validateNotificationData(type: 'TIP' | 'FOLLOW' | 'SUB', data: any): boolean {
    try {
      switch (type) {
        case 'TIP':
          return this.validateTipNotification(data);
        case 'FOLLOW':
          return this.validateFollowNotification(data);
        case 'SUB':
          return this.validateSubscriptionNotification(data);
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error validating ${type} notification:`, error);
      return false;
    }
  }

  private static validateTipNotification(data: any): data is TipNotificationData {
    return (
      typeof data.id === 'string' &&
      typeof data.channelId === 'string' &&
      typeof data.amountCents === 'number' &&
      typeof data.currency === 'string' &&
      typeof data.stripePaymentIntent === 'string' &&
      ['SUCCEEDED', 'PENDING', 'FAILED'].includes(data.status) &&
      typeof data.createdAt === 'string'
    );
  }

  private static validateFollowNotification(data: any): data is FollowNotificationData {
    return (
      typeof data.id === 'string' &&
      typeof data.followerId === 'string' &&
      typeof data.channelId === 'string' &&
      ['FOLLOWED', 'UNFOLLOWED'].includes(data.action) &&
      typeof data.createdAt === 'string'
    );
  }

  private static validateSubscriptionNotification(data: any): data is SubscriptionNotificationData {
    return (
      typeof data.id === 'string' &&
      typeof data.userId === 'string' &&
      typeof data.channelId === 'string' &&
      typeof data.stripeSubId === 'string' &&
      ['ACTIVE', 'CANCELED', 'CANCEL_SCHEDULED', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING'].includes(data.status) &&
      ['CREATED', 'UPDATED', 'DELETED', 'RENEWED'].includes(data.action) &&
      typeof data.createdAt === 'string'
    );
  }
}
