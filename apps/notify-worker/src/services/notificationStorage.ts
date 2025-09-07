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
  static async storeTipNotification(data: TipNotificationData): Promise<{ success: boolean; enrichedData?: TipNotificationData }> {
    try {
      // Get the channel and viewer data to enrich the notification
      const [channel, viewer, viewerChannel] = await Promise.all([
        prisma.channel.findUnique({
          where: { id: data.channelId },
          select: { 
            userId: true, 
            displayName: true, 
            slug: true,
            avatarS3Key: true
          }
        }),
        data.userId ? prisma.user.findUnique({
          where: { id: data.userId },
          select: { 
            name: true, 
            email: true,
            imageUrl: true
          }
        }) : null,
        data.userId ? prisma.channel.findUnique({
          where: { userId: data.userId },
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarS3Key: true
          }
        }) : null
      ]);

      if (!channel) {
        logger.error(`Channel not found for tip notification: ${data.channelId}`);
        return { success: false };
      }

      // Sanitize and enrich the notification data
      const sanitizeString = (str: string | undefined | null, maxLength = 255) => {
        if (!str) return undefined;
        return String(str).slice(0, maxLength).trim();
      };

      const enrichedData = {
        ...data,
        channelName: sanitizeString(data.channelName || channel.displayName),
        channelSlug: sanitizeString(channel.slug, 50),
        channelAvatarUrl: channel.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(channel.avatarS3Key, 100)}` : undefined,
        viewerName: sanitizeString(data.viewerName || viewer?.name) || 'Anonymous',
        viewerEmail: sanitizeString(data.viewerEmail || viewer?.email, 100),
        viewerAvatarUrl: sanitizeString(viewer?.imageUrl, 500),
        viewerChannelId: sanitizeString(viewerChannel?.id, 50),
        viewerChannelSlug: sanitizeString(viewerChannel?.slug, 50),
        viewerChannelName: sanitizeString(viewerChannel?.displayName),
        viewerChannelAvatarUrl: viewerChannel?.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(viewerChannel.avatarS3Key, 100)}` : undefined,
      };

      const payload = {
        tipId: enrichedData.id,
        amountCents: enrichedData.amountCents,
        currency: enrichedData.currency,
        stripePaymentIntent: enrichedData.stripePaymentIntent,
        status: enrichedData.status,
        channelId: enrichedData.channelId,
        viewerId: enrichedData.userId,
        viewerName: enrichedData.viewerName,
        viewerEmail: enrichedData.viewerEmail,
        viewerAvatarUrl: enrichedData.viewerAvatarUrl,
        viewerChannelId: enrichedData.viewerChannelId,
        viewerChannelSlug: enrichedData.viewerChannelSlug,
        viewerChannelName: enrichedData.viewerChannelName,
        viewerChannelAvatarUrl: enrichedData.viewerChannelAvatarUrl,
        channelName: enrichedData.channelName,
        channelSlug: enrichedData.channelSlug,
        channelAvatarUrl: enrichedData.channelAvatarUrl,
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
      return { success: true, enrichedData };
    } catch (error) {
      logger.error(`Error storing tip notification ${data.id}:`, error);
      return { success: false };
    }
  }

  /**
   * Store a follow notification in Postgres
   */
  static async storeFollowNotification(data: FollowNotificationData): Promise<{ success: boolean; enrichedData?: FollowNotificationData }> {
    try {
      // Get the channel and follower data to enrich the notification
      const [channel, follower, followerChannel] = await Promise.all([
        prisma.channel.findUnique({
          where: { id: data.channelId },
          select: { 
            userId: true, 
            displayName: true, 
            slug: true,
            avatarS3Key: true
          }
        }),
        prisma.user.findUnique({
          where: { id: data.followerId },
          select: { 
            name: true, 
            email: true,
            imageUrl: true
          }
        }),
        prisma.channel.findUnique({
          where: { userId: data.followerId },
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarS3Key: true
          }
        })
      ]);

      if (!channel) {
        logger.error(`Channel not found for follow notification: ${data.channelId}`);
        return { success: false };
      }

      if (!follower) {
        logger.error(`Follower not found for follow notification: ${data.followerId}`);
        return { success: false };
      }

      // Only store FOLLOWED notifications (not UNFOLLOWED)
      if (data.action === 'UNFOLLOWED') {
        logger.debug(`Skipping UNFOLLOWED notification: ${data.id}`);
        return { success: true };
      }

      // Sanitize and enrich the notification data
      const sanitizeString = (str: string | undefined | null, maxLength = 255) => {
        if (!str) return undefined;
        return String(str).slice(0, maxLength).trim();
      };

      const enrichedData = {
        ...data,
        followerName: sanitizeString(data.followerName || follower.name) || 'Anonymous',
        followerEmail: sanitizeString(data.followerEmail || follower.email, 100),
        followerAvatarUrl: sanitizeString(follower.imageUrl, 500),
        followerChannelId: sanitizeString(followerChannel?.id, 50),
        followerChannelSlug: sanitizeString(followerChannel?.slug, 50),
        followerChannelName: sanitizeString(followerChannel?.displayName),
        followerChannelAvatarUrl: followerChannel?.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(followerChannel.avatarS3Key, 100)}` : undefined,
        channelName: sanitizeString(data.channelName || channel.displayName),
        channelSlug: sanitizeString(channel.slug, 50),
        channelAvatarUrl: channel.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(channel.avatarS3Key, 100)}` : undefined,
      };

      const payload = {
        followId: enrichedData.id,
        action: enrichedData.action,
        followerId: enrichedData.followerId,
        channelId: enrichedData.channelId,
        followerName: enrichedData.followerName,
        followerEmail: enrichedData.followerEmail,
        followerAvatarUrl: enrichedData.followerAvatarUrl,
        followerChannelId: enrichedData.followerChannelId,
        followerChannelSlug: enrichedData.followerChannelSlug,
        followerChannelName: enrichedData.followerChannelName,
        followerChannelAvatarUrl: enrichedData.followerChannelAvatarUrl,
        channelName: enrichedData.channelName,
        channelSlug: enrichedData.channelSlug,
        channelAvatarUrl: enrichedData.channelAvatarUrl,
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
      return { success: true, enrichedData };
    } catch (error) {
      logger.error(`Error storing follow notification ${data.id}:`, error);
      return { success: false };
    }
  }

  /**
   * Store a subscription notification in Postgres
   */
  static async storeSubscriptionNotification(data: SubscriptionNotificationData): Promise<{ success: boolean; enrichedData?: SubscriptionNotificationData }> {
    try {
      // Get the channel and subscriber data for enrichment
      const [channel, subscriber, subscriberChannel] = await Promise.all([
        prisma.channel.findUnique({
          where: { id: data.channelId },
          select: { 
            userId: true,
            displayName: true, 
            slug: true,
            avatarS3Key: true
          }
        }),
        data.userId ? prisma.user.findUnique({
          where: { id: data.userId },
          select: { 
            name: true, 
            email: true,
            imageUrl: true
          }
        }) : null,
        data.userId ? prisma.channel.findUnique({
          where: { userId: data.userId },
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarS3Key: true
          }
        }) : null
      ]);

      if (!channel) {
        logger.error(`Channel not found for subscription notification: ${data.channelId}`);
        return { success: false };
      }

      // Sanitize and enrich the notification data
      const sanitizeString = (str: string | undefined | null, maxLength = 255) => {
        if (!str) return undefined;
        return String(str).slice(0, maxLength).trim();
      };

      const enrichedData = {
        ...data,
        channelName: sanitizeString(data.channelName || channel.displayName),
        channelSlug: sanitizeString(channel.slug, 50),
        channelAvatarUrl: channel.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(channel.avatarS3Key, 100)}` : undefined,
        subscriberName: sanitizeString(data.subscriberName || subscriber?.name) || 'Anonymous',
        subscriberEmail: sanitizeString(data.subscriberEmail || subscriber?.email, 100),
        subscriberAvatarUrl: sanitizeString(subscriber?.imageUrl, 500),
        subscriberChannelId: sanitizeString(subscriberChannel?.id, 50),
        subscriberChannelSlug: sanitizeString(subscriberChannel?.slug, 50),
        subscriberChannelName: sanitizeString(subscriberChannel?.displayName),
        subscriberChannelAvatarUrl: subscriberChannel?.avatarS3Key ? `https://your-cdn-domain.com/${sanitizeString(subscriberChannel.avatarS3Key, 100)}` : undefined,
      };

      const payload = {
        subscriptionId: enrichedData.id,
        action: enrichedData.action,
        status: enrichedData.status,
        stripeSubId: enrichedData.stripeSubId,
        userId: enrichedData.userId,
        channelId: enrichedData.channelId,
        currentPeriodEnd: enrichedData.currentPeriodEnd,
        subscriberName: enrichedData.subscriberName,
        subscriberEmail: enrichedData.subscriberEmail,
        subscriberAvatarUrl: enrichedData.subscriberAvatarUrl,
        subscriberChannelId: enrichedData.subscriberChannelId,
        subscriberChannelSlug: enrichedData.subscriberChannelSlug,
        subscriberChannelName: enrichedData.subscriberChannelName,
        subscriberChannelAvatarUrl: enrichedData.subscriberChannelAvatarUrl,
        channelName: enrichedData.channelName,
        channelSlug: enrichedData.channelSlug,
        channelAvatarUrl: enrichedData.channelAvatarUrl,
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
      return { success: true, enrichedData };
    } catch (error) {
      logger.error(`Error storing subscription notification ${data.id}:`, error);
      return { success: false };
    }
  }

  /**
   * Store a notification based on its type
   */
  static async storeNotification(
    type: 'TIP' | 'FOLLOW' | 'SUB', 
    data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData
  ): Promise<{ success: boolean; enrichedData?: any }> {
    switch (type) {
      case 'TIP':
        return this.storeTipNotification(data as TipNotificationData);
      case 'FOLLOW':
        return this.storeFollowNotification(data as FollowNotificationData);
      case 'SUB':
        return this.storeSubscriptionNotification(data as SubscriptionNotificationData);
      default:
        logger.error(`Unknown notification type: ${type}`);
        return { success: false };
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
  ): Promise<{ success: string[]; failed: string[]; enrichedData: Map<string, any> }> {
    const success: string[] = [];
    const failed: string[] = [];
    const enrichedData = new Map<string, any>();

    for (const notification of notifications) {
      const result = await this.storeNotification(notification.type, notification.data);
      if (result.success) {
        success.push(notification.id);
        if (result.enrichedData) {
          enrichedData.set(notification.id, result.enrichedData);
        }
      } else {
        failed.push(notification.id);
      }
    }

    logger.info(`Batch storage complete: ${success.length} success, ${failed.length} failed`);
    return { success, failed, enrichedData };
  }
}
