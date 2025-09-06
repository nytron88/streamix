import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { 
  TipNotificationData, 
  FollowNotificationData, 
  SubscriptionNotificationData 
} from '../types/notifications';
import { NotificationType } from '@prisma/client';

export class NotificationStorage {
  /**
   * Store a tip notification in Postgres
   */
  static async storeTipNotification(data: TipNotificationData): Promise<boolean> {
    try {
      // Get the channel user ID for the notification
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
        select: { userId: true }
      });

      if (!channel) {
        logger.error(`Channel not found for tip notification: ${data.channelId}`);
        return false;
      }

      const payload = {
        tipId: data.id,
        amountCents: data.amountCents,
        currency: data.currency,
        stripePaymentIntent: data.stripePaymentIntent,
        status: data.status,
        channelId: data.channelId,
        viewerId: data.userId,
        viewerName: data.viewerName,
        viewerEmail: data.viewerEmail,
        channelName: data.channelName,
      };

      await prisma.notification.create({
        data: {
          userId: channel.userId, // Notify the channel owner
          type: NotificationType.TIP,
          payload,
          createdAt: new Date(data.createdAt),
        },
      });

      logger.info(`Stored tip notification in Postgres: ${data.id}`);
      return true;
    } catch (error) {
      logger.error(`Error storing tip notification ${data.id}:`, error);
      return false;
    }
  }

  /**
   * Store a follow notification in Postgres
   */
  static async storeFollowNotification(data: FollowNotificationData): Promise<boolean> {
    try {
      // Get the channel user ID for the notification
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
        select: { userId: true }
      });

      if (!channel) {
        logger.error(`Channel not found for follow notification: ${data.channelId}`);
        return false;
      }

      // Only store FOLLOWED notifications (not UNFOLLOWED)
      if (data.action === 'UNFOLLOWED') {
        logger.debug(`Skipping UNFOLLOWED notification: ${data.id}`);
        return true;
      }

      const payload = {
        followId: data.id,
        action: data.action,
        followerId: data.followerId,
        channelId: data.channelId,
        followerName: data.followerName,
        followerEmail: data.followerEmail,
        channelName: data.channelName,
      };

      await prisma.notification.create({
        data: {
          userId: channel.userId, // Notify the channel owner
          type: NotificationType.FOLLOW,
          payload,
          createdAt: new Date(data.createdAt),
        },
      });

      logger.info(`Stored follow notification in Postgres: ${data.id}`);
      return true;
    } catch (error) {
      logger.error(`Error storing follow notification ${data.id}:`, error);
      return false;
    }
  }

  /**
   * Store a subscription notification in Postgres
   */
  static async storeSubscriptionNotification(data: SubscriptionNotificationData): Promise<boolean> {
    try {
      // Get the channel user ID for the notification
      const channel = await prisma.channel.findUnique({
        where: { id: data.channelId },
        select: { userId: true }
      });

      if (!channel) {
        logger.error(`Channel not found for subscription notification: ${data.channelId}`);
        return false;
      }

      const payload = {
        subscriptionId: data.id,
        action: data.action,
        status: data.status,
        stripeSubId: data.stripeSubId,
        userId: data.userId,
        channelId: data.channelId,
        currentPeriodEnd: data.currentPeriodEnd,
        subscriberName: data.subscriberName,
        subscriberEmail: data.subscriberEmail,
        channelName: data.channelName,
      };

      await prisma.notification.create({
        data: {
          userId: channel.userId, // Notify the channel owner
          type: NotificationType.SUB,
          payload,
          createdAt: new Date(data.createdAt),
        },
      });

      logger.info(`Stored subscription notification in Postgres: ${data.id}`);
      return true;
    } catch (error) {
      logger.error(`Error storing subscription notification ${data.id}:`, error);
      return false;
    }
  }

  /**
   * Store a notification based on its type
   */
  static async storeNotification(
    type: 'TIP' | 'FOLLOW' | 'SUB', 
    data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData
  ): Promise<boolean> {
    switch (type) {
      case 'TIP':
        return this.storeTipNotification(data as TipNotificationData);
      case 'FOLLOW':
        return this.storeFollowNotification(data as FollowNotificationData);
      case 'SUB':
        return this.storeSubscriptionNotification(data as SubscriptionNotificationData);
      default:
        logger.error(`Unknown notification type: ${type}`);
        return false;
    }
  }

  /**
   * Batch store multiple notifications
   */
  static async batchStoreNotifications(
    notifications: Array<{ 
      id: string; 
      type: 'TIP' | 'FOLLOW' | 'SUB'; 
      data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData 
    }>
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const notification of notifications) {
      const stored = await this.storeNotification(notification.type, notification.data);
      if (stored) {
        success.push(notification.id);
      } else {
        failed.push(notification.id);
      }
    }

    logger.info(`Batch storage complete: ${success.length} success, ${failed.length} failed`);
    return { success, failed };
  }
}
