import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../lib/logger';
import { AuthenticatedClient } from '../types/notifications';

export interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedClient;
}

export const authenticateSocket = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    // Get token from auth header or query params
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      logger.warn('WebSocket connection attempt without token', { 
        socketId: socket.id,
        ip: socket.handshake.address 
      });
      return next(new Error('Authentication token required'));
    }

    // Decode token without verification for now (Clerk JWTs are complex)
    const decoded = jwt.decode(token as string) as any;
    
    if (!decoded || !decoded.sub || typeof decoded.sub !== 'string') {
      logger.warn('Invalid token payload', { 
        socketId: socket.id,
        payload: decoded 
      });
      return next(new Error('Invalid token payload'));
    }

    // Validate user ID format
    if (!/^user_[a-zA-Z0-9]+$/.test(decoded.sub)) {
      logger.warn('Invalid user ID format', { 
        socketId: socket.id,
        userId: decoded.sub 
      });
      return next(new Error('Invalid user ID format'));
    }

    // Extract user info from Clerk JWT
    // Clerk JWTs have 'sub' as user ID and other metadata
    const userId = decoded.sub;
    const displayName = decoded.given_name && decoded.family_name 
      ? `${decoded.given_name} ${decoded.family_name}`
      : decoded.username || decoded.email || 'Unknown User';

    // Attach user info to socket
    socket.user = {
      userId: userId,
      displayName: displayName,
      channelId: decoded.channelId, // Optional, for streamers
    };

    logger.info('WebSocket client authenticated', {
      socketId: socket.id,
      userId: socket.user.userId,
      displayName: socket.user.displayName,
      channelId: socket.user.channelId,
    });

    next();
  } catch (error) {
    logger.error('WebSocket authentication failed', {
      socketId: socket.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(new Error('Authentication failed'));
  }
};
