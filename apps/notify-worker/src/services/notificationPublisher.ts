import redis from '../lib/redis';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { 
  TipNotificationData, 
  FollowNotificationData, 
  SubscriptionNotificationData 
} from '../types/notifications';

export interface PublishableNotification {
  id: string;
  type: 'TIP' | 'FOLLOW' | 'SUB';
  userId: string; // The user who should receive this notification
  channelId: string;
  data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData;
  createdAt: string;
}

export class NotificationPublisher {
  private static readonly CHANNELS = {
    USER_NOTIFICATIONS: 'user:notifications:',
    CHANNEL_NOTIFICATIONS: 'channel:notifications:',
    GLOBAL_NOTIFICATIONS: 'notifications:all',
  } as const;

  /**
   * Publish a notification to Redis for real-time updates
   */
  static async publishNotification(notification: PublishableNotification): Promise<boolean> {
    try {
      const message = JSON.stringify({
        id: notification.id,
        type: notification.type,
        userId: notification.userId,
        channelId: notification.channelId,
        data: notification.data,
        createdAt: notification.createdAt,
        publishedAt: new Date().toISOString(),
      });

      // Publish to multiple channels for different consumption patterns
      const channels = [
        `${this.CHANNELS.USER_NOTIFICATIONS}${notification.userId}`, // User-specific channel
        `${this.CHANNELS.CHANNEL_NOTIFICATIONS}${notification.channelId}`, // Channel-specific channel
        this.CHANNELS.GLOBAL_NOTIFICATIONS, // Global notifications channel
      ];

      const publishPromises = channels.map(channel => 
        redis.publish(channel, message)
      );

      await Promise.all(publishPromises);

      logger.info(`Published notification ${notification.id} to Redis channels`, {
        notificationId: notification.id,
        type: notification.type,
        userId: notification.userId,
        channelId: notification.channelId,
        channels,
      });

      return true;
    } catch (error) {
      logger.error(`Error publishing notification ${notification.id}:`, error);
      return false;
    }
  }

  /**
   * Create a publishable notification from stored notification data
   */
  static async createPublishableNotification(
    type: 'TIP' | 'FOLLOW' | 'SUB',
    data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData
  ): Promise<PublishableNotification | null> {
    try {
      // Get the channel owner's user ID
      const channelUserId = await this.getChannelUserId(data.channelId);
      if (!channelUserId) {
        logger.error(`Could not find user ID for channel: ${data.channelId}`);
        return null;
      }

      return {
        id: data.id,
        type,
        userId: channelUserId,
        channelId: data.channelId,
        data,
        createdAt: data.createdAt,
      };
    } catch (error) {
      logger.error(`Error creating publishable notification:`, error);
      return null;
    }
  }

  /**
   * Get the user ID for a channel
   */
  private static async getChannelUserId(channelId: string): Promise<string | null> {
    try {
      // Try to get from Redis cache first
      const cacheKey = `channel:userId:${channelId}`;
      const cachedUserId = await redis.get(cacheKey);
      
      if (cachedUserId) {
        return cachedUserId;
      }

      // Query the database if not in cache using shared prisma client
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { userId: true }
      });

      if (channel) {
        // Cache the result for future use
        await redis.setex(cacheKey, 3600, channel.userId); // Cache for 1 hour
        return channel.userId;
      }

      logger.warn(`Channel not found: ${channelId}`);
      return null;
    } catch (error) {
      logger.error(`Error getting channel user ID for ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Batch publish multiple notifications
   */
  static async batchPublishNotifications(
    notifications: Array<{
      id: string;
      type: 'TIP' | 'FOLLOW' | 'SUB';
      data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData;
    }>
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const notification of notifications) {
      const publishable = await this.createPublishableNotification(notification.type, notification.data);
      
      if (publishable) {
        const published = await this.publishNotification(publishable);
        if (published) {
          success.push(notification.id);
        } else {
          failed.push(notification.id);
        }
      } else {
        failed.push(notification.id);
      }
    }

    logger.info(`Batch publish complete: ${success.length} success, ${failed.length} failed`);
    return { success, failed };
  }

  /**
   * Publish a system notification (for testing or admin purposes)
   */
  static async publishSystemNotification(
    userId: string,
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ): Promise<boolean> {
    try {
      const notification = {
        id: `system-${Date.now()}`,
        type: 'SYSTEM' as const,
        userId,
        message,
        severity: type,
        createdAt: new Date().toISOString(),
      };

      const channels = [
        `${this.CHANNELS.USER_NOTIFICATIONS}${userId}`,
        this.CHANNELS.GLOBAL_NOTIFICATIONS,
      ];

      const publishPromises = channels.map(channel => 
        redis.publish(channel, JSON.stringify(notification))
      );

      await Promise.all(publishPromises);

      logger.info(`Published system notification to user ${userId}`, {
        message,
        type,
        channels,
      });

      return true;
    } catch (error) {
      logger.error(`Error publishing system notification:`, error);
      return false;
    }
  }
}
