import { Server } from 'socket.io';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';
import { config } from '../config';
import { PublishableNotification } from '../types/notifications';

export class RedisSubscriptionService {
  private io: Server;
  private subscribedChannels: Set<string> = new Set();

  constructor(io: Server) {
    this.io = io;
    this.setupRedisSubscriptions();
  }

  private setupRedisSubscriptions(): void {
    // Subscribe to global notifications
    this.subscribeToChannel(config.redis_channels.globalNotifications);

    // Handle Redis messages
    redis.on('message', this.handleRedisMessage.bind(this));

    // Handle Redis subscription events
    redis.on('subscribe', (channel, count) => {
      logger.info('Subscribed to Redis channel', { channel, totalSubscriptions: count });
    });

    redis.on('unsubscribe', (channel, count) => {
      logger.info('Unsubscribed from Redis channel', { channel, totalSubscriptions: count });
    });
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const notification: PublishableNotification = JSON.parse(message);
      
      logger.info('Received notification from Redis', {
        channel,
        notificationId: notification.id,
        type: notification.type,
        userId: notification.userId,
        channelId: notification.channelId,
      });

      // Broadcast to appropriate Socket.IO rooms
      this.broadcastNotification(channel, notification);
    } catch (error) {
      logger.error('Failed to parse Redis message', {
        channel,
        message,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private broadcastNotification(redisChannel: string, notification: PublishableNotification): void {
    // Determine which Socket.IO rooms to broadcast to based on Redis channel
    const rooms: string[] = [];

    if (redisChannel === config.redis_channels.globalNotifications) {
      rooms.push('global-notifications');
    } else if (redisChannel.startsWith(config.redis_channels.userNotifications)) {
      const userId = redisChannel.replace(config.redis_channels.userNotifications, '');
      rooms.push(`user-notifications:${userId}`);
    } else if (redisChannel.startsWith(config.redis_channels.channelNotifications)) {
      const channelId = redisChannel.replace(config.redis_channels.channelNotifications, '');
      rooms.push(`channel-notifications:${channelId}`);
    }

    // Broadcast to all relevant rooms
    rooms.forEach(room => {
      this.io.to(room).emit('notification', notification);
      logger.debug('Broadcasted notification to room', {
        room,
        notificationId: notification.id,
        type: notification.type,
      });
    });
  }

  public subscribeToChannel(channel: string): void {
    if (!this.subscribedChannels.has(channel)) {
      redis.subscribe(channel);
      this.subscribedChannels.add(channel);
      logger.info('Subscribing to Redis channel', { channel });
    }
  }

  public unsubscribeFromChannel(channel: string): void {
    if (this.subscribedChannels.has(channel)) {
      redis.unsubscribe(channel);
      this.subscribedChannels.delete(channel);
      logger.info('Unsubscribing from Redis channel', { channel });
    }
  }

  // Subscribe to user-specific notifications when a user connects
  public subscribeToUserNotifications(userId: string): void {
    const channel = `${config.redis_channels.userNotifications}${userId}`;
    this.subscribeToChannel(channel);
  }

  // Subscribe to channel-specific notifications
  public subscribeToChannelNotifications(channelId: string): void {
    const channel = `${config.redis_channels.channelNotifications}${channelId}`;
    this.subscribeToChannel(channel);
  }

  // Cleanup method
  public async cleanup(): Promise<void> {
    try {
      await redis.unsubscribe();
      this.subscribedChannels.clear();
      logger.info('Redis subscription service cleaned up');
    } catch (error) {
      logger.error('Error during Redis subscription cleanup', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}
