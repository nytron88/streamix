// Notification data types (should match the notify-worker types)
export interface TipNotificationData {
  tipId: string;
  amount: number;
  message?: string;
  tipper: {
    id: string;
    displayName: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface FollowNotificationData {
  follower: {
    id: string;
    displayName: string;
    imageUrl?: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SubscriptionNotificationData {
  subscription: {
    id: string;
    tier: string;
    amount: number;
  };
  subscriber: {
    id: string;
    displayName: string;
    imageUrl?: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
  };
}

// Publishable notification from Redis (matches notify-worker output)
export interface PublishableNotification {
  id: string;
  userId: string;
  channelId: string;
  type: 'TIP' | 'FOLLOW' | 'SUBSCRIPTION';
  data: TipNotificationData | FollowNotificationData | SubscriptionNotificationData;
  timestamp: string;
}

// WebSocket event types
export interface WebSocketEvents {
  // Client -> Server
  'join-user-notifications': (userId: string) => void;
  'leave-user-notifications': (userId: string) => void;
  'join-channel-notifications': (channelId: string) => void;
  'leave-channel-notifications': (channelId: string) => void;
  'join-global-notifications': () => void;
  'leave-global-notifications': () => void;
  
  // Server -> Client
  'notification': (notification: PublishableNotification) => void;
  'error': (message: string) => void;
  'connected': (message: string) => void;
}

// Client authentication data
export interface AuthenticatedClient {
  userId: string;
  displayName: string;
  channelId?: string;
}
