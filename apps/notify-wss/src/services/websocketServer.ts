import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../lib/logger';
import { authenticateSocket, AuthenticatedSocket } from '../middleware/auth';
import { RedisSubscriptionService } from './redisSubscriptionService';
import { WebSocketEvents } from '../types/notifications';

export class WebSocketServer {
  private httpServer;
  private io: Server<WebSocketEvents>;
  private redisSubscriptionService: RedisSubscriptionService;
  private connectedClients: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor() {
    // Create HTTP server with health check
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          ...this.getStats()
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Initialize Socket.IO with CORS
    this.io = new Server(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: ['GET', 'POST'],
      },
    });

    // Initialize Redis subscription service
    this.redisSubscriptionService = new RedisSubscriptionService(this.io);

    // Setup authentication middleware
    this.io.use(authenticateSocket);

    // Setup connection handlers
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.user) {
        logger.error('Unauthenticated socket connected', { socketId: socket.id });
        socket.disconnect();
        return;
      }

      const { userId, displayName, channelId } = socket.user;

      logger.info('Client connected', {
        socketId: socket.id,
        userId,
        displayName,
        channelId,
      });

      // Track connected client
      this.addConnectedClient(userId, socket.id);

      // Auto-subscribe to user's own notifications
      socket.join(`user-notifications:${userId}`);
      this.redisSubscriptionService.subscribeToUserNotifications(userId);

      // If user has a channel, auto-subscribe to channel notifications
      if (channelId) {
        socket.join(`channel-notifications:${channelId}`);
        this.redisSubscriptionService.subscribeToChannelNotifications(channelId);
      }

      // Send connection confirmation
      socket.emit('connected', `Welcome ${displayName}! Connected to notifications.`);

      // Handle explicit subscription requests
      socket.on('join-user-notifications', (targetUserId: string) => {
        // Only allow users to subscribe to their own notifications or if they're admins
        if (targetUserId === userId) {
          socket.join(`user-notifications:${targetUserId}`);
          this.redisSubscriptionService.subscribeToUserNotifications(targetUserId);
          logger.info('Client joined user notifications', {
            socketId: socket.id,
            userId,
            targetUserId,
          });
        } else {
          socket.emit('error', 'Unauthorized to subscribe to other user notifications');
        }
      });

      socket.on('leave-user-notifications', (targetUserId: string) => {
        socket.leave(`user-notifications:${targetUserId}`);
        logger.info('Client left user notifications', {
          socketId: socket.id,
          userId,
          targetUserId,
        });
      });

      socket.on('join-channel-notifications', (targetChannelId: string) => {
        // Allow anyone to subscribe to channel notifications (public)
        socket.join(`channel-notifications:${targetChannelId}`);
        this.redisSubscriptionService.subscribeToChannelNotifications(targetChannelId);
        logger.info('Client joined channel notifications', {
          socketId: socket.id,
          userId,
          targetChannelId,
        });
      });

      socket.on('leave-channel-notifications', (targetChannelId: string) => {
        socket.leave(`channel-notifications:${targetChannelId}`);
        logger.info('Client left channel notifications', {
          socketId: socket.id,
          userId,
          targetChannelId,
        });
      });

      socket.on('join-global-notifications', () => {
        socket.join('global-notifications');
        logger.info('Client joined global notifications', {
          socketId: socket.id,
          userId,
        });
      });

      socket.on('leave-global-notifications', () => {
        socket.leave('global-notifications');
        logger.info('Client left global notifications', {
          socketId: socket.id,
          userId,
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected', {
          socketId: socket.id,
          userId,
          reason,
        });

        this.removeConnectedClient(userId, socket.id);
      });
    });
  }

  private addConnectedClient(userId: string, socketId: string): void {
    if (!this.connectedClients.has(userId)) {
      this.connectedClients.set(userId, new Set());
    }
    this.connectedClients.get(userId)!.add(socketId);
  }

  private removeConnectedClient(userId: string, socketId: string): void {
    const userSockets = this.connectedClients.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connectedClients.delete(userId);
      }
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(config.server.port, config.server.host, () => {
        logger.info('WebSocket server started', {
          port: config.server.port,
          host: config.server.host,
        });
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    try {
      // Close Socket.IO server
      this.io.close();
      
      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Cleanup Redis subscriptions
      await this.redisSubscriptionService.cleanup();

      logger.info('WebSocket server stopped');
    } catch (error) {
      logger.error('Error stopping WebSocket server', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Get server stats
  public getStats() {
    return {
      connectedClients: this.connectedClients.size,
      totalSockets: this.io.sockets.sockets.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
    };
  }
}
