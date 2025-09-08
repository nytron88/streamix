'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// Notification types (matching the actual backend data structure)
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
  channelSlug?: string;
  channelAvatarUrl?: string;
  viewerName?: string;
  viewerEmail?: string;
  viewerAvatarUrl?: string;
  viewerChannelId?: string;
  viewerChannelSlug?: string;
  viewerChannelName?: string;
  viewerChannelAvatarUrl?: string;
}

export interface FollowNotificationData {
  id: string;
  followerId: string;
  channelId: string;
  action: 'FOLLOWED' | 'UNFOLLOWED';
  createdAt: string;
  // Additional metadata
  channelName?: string;
  channelSlug?: string;
  channelAvatarUrl?: string;
  followerName?: string;
  followerEmail?: string;
  followerAvatarUrl?: string;
  followerChannelId?: string;
  followerChannelSlug?: string;
  followerChannelName?: string;
  followerChannelAvatarUrl?: string;
}

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
  channelSlug?: string;
  channelAvatarUrl?: string;
  subscriberName?: string;
  subscriberEmail?: string;
  subscriberAvatarUrl?: string;
  subscriberChannelId?: string;
  subscriberChannelSlug?: string;
  subscriberChannelName?: string;
  subscriberChannelAvatarUrl?: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RENEWED';
}

export interface PublishableNotification {
  id: string;
  type: 'TIP' | 'FOLLOW' | 'SUB';
  userId: string;
  channelId: string;
  data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData;
  createdAt: string;
}

interface UseWebSocketNotificationsOptions {
  autoConnect?: boolean;
  subscribeToGlobal?: boolean;
  subscribeToChannels?: string[];
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  socket: Socket | null;
}

export function useWebSocketNotifications(
  options: UseWebSocketNotificationsOptions = {}
) {
  const { autoConnect = true, subscribeToGlobal = false, subscribeToChannels = [] } = options;
  const { getToken, userId } = useAuth();
  
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    socket: null,
  });
  
  const [notifications, setNotifications] = useState<PublishableNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const manuallyDisconnectedRef = useRef<boolean>(false);

  // Add notification to list
  const addNotification = useCallback((notification: PublishableNotification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.find(n => n.id === notification.id);
      if (exists) {
        return prev;
      }
      
      // Add new notification and keep last 100
      return [notification, ...prev.slice(0, 99)];
    });
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async (limit = 50, offset = 0, type?: 'TIP' | 'FOLLOW' | 'SUB') => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await axios.get('/api/notifications', {
        params: {
          limit,
          offset,
          ...(type && { type }),
        },
      });

      if (response.data.success) {
        setNotifications(response.data.payload.notifications);
        setHasLoadedInitial(true);
        return response.data.payload;
      } else {
        throw new Error(response.data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async (type?: 'TIP' | 'FOLLOW' | 'SUB') => {
    if (!userId) return;

    try {
      const response = await axios.delete('/api/notifications/clear', {
        data: type ? { type } : {},
      });

      if (response.data.success) {
        setNotifications([]);
        return response.data.payload;
      } else {
        throw new Error(response.data.message || 'Failed to clear notifications');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }, [userId]);

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (!userId) return;
    
    // Check current state to avoid duplicate connections
    if (state.connecting || state.connected || socketRef.current) {
      return;
    }

    try {
      manuallyDisconnectedRef.current = false; // Reset manual disconnect flag
      setState(prev => ({ ...prev, connecting: true, error: null }));

      // Get JWT token from Clerk
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const wsUrl = process.env.NEXT_PUBLIC_WSS_URL || 'http://localhost:8080';
      
      const socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: false, // Don't force new connection
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          error: null, 
          socket 
        }));

        // Subscribe to user notifications automatically
        if (userId) {
          socket.emit('join-user-notifications', userId);
        }

        // Subscribe to global notifications if requested
        if (subscribeToGlobal) {
          socket.emit('join-global-notifications');
        }

        // Subscribe to specific channels if requested
        subscribeToChannels.forEach(channelId => {
          socket.emit('join-channel-notifications', channelId);
        });
      });

      socket.on('connected', (message: string) => {
        // Welcome message received
      });

      socket.on('notification', (notification: PublishableNotification) => {
        addNotification(notification);
      });

      socket.on('error', (error: string) => {
        console.error('❌ Socket error:', error);
        setState(prev => ({ ...prev, error }));
      });

      socket.on('disconnect', (reason: string) => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          socket: null 
        }));

        // Auto-reconnect unless manually disconnected
        if (reason !== 'io client disconnect' && autoConnect && !manuallyDisconnectedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      });

      socket.on('connect_error', (error) => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false, 
          error: error.message,
          socket: null 
        }));
      });

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed',
        socket: null 
      }));
    }
  }, [userId, getToken, autoConnect, subscribeToGlobal, subscribeToChannels, addNotification, state.connecting, state.connected]);

  // Disconnect from WebSocket server (disabled - always connected)
  const disconnect = useCallback(() => {
    // Disconnect functionality disabled - always stay connected
  }, []);

  // Reconnect to WebSocket server (simplified - just connect)
  const reconnect = useCallback(() => {
    // Just connect - no need to disconnect first
    connect();
  }, [connect]);

  // Subscribe to channel notifications
  const subscribeToChannel = useCallback((channelId: string) => {
    if (state.socket) {
      state.socket.emit('join-channel-notifications', channelId);
    }
  }, [state.socket]);

  // Unsubscribe from channel notifications
  const unsubscribeFromChannel = useCallback((channelId: string) => {
    if (state.socket) {
      state.socket.emit('leave-channel-notifications', channelId);
    }
  }, [state.socket]);

  // Auto-connect when component mounts and user is authenticated
  useEffect(() => {
    if (autoConnect && userId && !state.connected && !state.connecting && !manuallyDisconnectedRef.current && !socketRef.current) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, userId]); // Removed problematic dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup on unmount, don't disconnect during normal operation
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    notifications,
    isLoading,
    hasLoadedInitial,
    connect,
    disconnect,
    reconnect,
    subscribeToChannel,
    unsubscribeFromChannel,
    clearNotifications,
    clearAllNotifications,
    removeNotification,
    fetchNotifications,
  };
}
