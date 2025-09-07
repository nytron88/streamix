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
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RENEWED';
}

export type NotificationData = TipNotificationData | FollowNotificationData | SubscriptionNotificationData;

export interface ProcessedNotification {
  id: string;
  type: 'TIP' | 'FOLLOW' | 'SUB';
  data: NotificationData;
  processedAt: Date;
}
