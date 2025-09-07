'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocketNotifications, PublishableNotification } from '@/hooks/useWebSocketNotifications';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: PublishableNotification[];
  connected: boolean;
  connecting: boolean;
  error: string | null;
  isLoading: boolean;
  hasLoadedInitial: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  subscribeToChannel: (channelId: string) => void;
  unsubscribeFromChannel: (channelId: string) => void;
  clearNotifications: () => void;
  clearAllNotifications: (type?: 'TIP' | 'FOLLOW' | 'SUB') => Promise<any>;
  removeNotification: (notificationId: string) => void;
  fetchNotifications: (limit?: number, offset?: number, type?: 'TIP' | 'FOLLOW' | 'SUB') => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  showToasts?: boolean;
  subscribeToGlobal?: boolean;
}

export function NotificationProvider({ 
  children, 
  showToasts = true,
  subscribeToGlobal = false 
}: NotificationProviderProps) {
  const websocket = useWebSocketNotifications({
    autoConnect: true,
    subscribeToGlobal,
  });

  // Show toast notifications for new notifications
  React.useEffect(() => {
    if (!showToasts || websocket.notifications.length === 0) return;

    const latestNotification = websocket.notifications[0];
    
    // Only show toast for very recent notifications (last 5 seconds)
    const notificationTime = new Date(latestNotification.createdAt).getTime();
    const now = Date.now();
    const timeDiff = now - notificationTime;
    
    if (timeDiff < 5000) {
      showNotificationToast(latestNotification);
    }
  }, [websocket.notifications, showToasts]);

  const showNotificationToast = (notification: PublishableNotification) => {
    switch (notification.type) {
      case 'TIP':
        const tipData = notification.data as any;
        toast.success(
          `💰 New tip: $${(tipData.amountCents / 100).toFixed(2)} from ${tipData.viewerName || 'Anonymous'}`,
          {
            description: `On ${tipData.channelName || 'your channel'}`,
            duration: 5000,
          }
        );
        break;
        
      case 'FOLLOW':
        const followData = notification.data as any;
        toast.success(
          `👥 New follower: ${followData.followerName || 'Someone'}`,
          {
            description: `Started following ${followData.channelName || 'your channel'}`,
            duration: 4000,
          }
        );
        break;
        
      case 'SUB':
        const subData = notification.data as any;
        toast.success(
          `⭐ New subscriber: ${subData.subscriberName || 'Someone'}`,
          {
            description: `${subData.action?.toLowerCase() || 'subscribed'} to ${subData.channelName || 'your channel'}`,
            duration: 5000,
          }
        );
        break;
    }
  };

  return (
    <NotificationContext.Provider value={websocket}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
