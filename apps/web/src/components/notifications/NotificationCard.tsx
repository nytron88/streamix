'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublishableNotification } from '@/hooks/useWebSocketNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DollarSign, 
  Heart, 
  Star, 
  User, 
  Clock,
  ExternalLink,
  Eye,
  UserPlus,
  MessageCircle,
  X,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

interface NotificationCardProps {
  notification: PublishableNotification;
  onRemove?: (id: string) => void;
  showRemoveButton?: boolean;
}

export function NotificationCard({ 
  notification, 
  onRemove, 
  showRemoveButton = false 
}: NotificationCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const handleFollow = async (channelId: string) => {
    if (isFollowLoading) return;
    
    // Validate channelId format
    if (!channelId || typeof channelId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
      console.error('Invalid channel ID format');
      return;
    }
    
    setIsFollowLoading(true);
    try {
      const response = await axios.post('/api/follows/follow', {
        channelId: channelId
      });
      
      if (response.data.success) {
        setIsFollowing(true);
        toast.success('Successfully followed channel!');
      }
    } catch (error) {
      console.error('Failed to follow channel:', error);
      toast.error('Failed to follow channel');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const getChannelUrl = (channelSlug?: string, channelId?: string) => {
    if (channelSlug) {
      return `/channel/${channelSlug}`;
    }
    if (channelId) {
      return `/channel/${channelId}`;
    }
    return '#';
  };

  const getUserUrl = (userId: string, channelSlug?: string) => {
    if (channelSlug) {
      return `/channel/${channelSlug}`;
    }
    return `/user/${userId}`;
  };

  const renderNotificationContent = () => {
    switch (notification.type) {
      case 'TIP':
        const tipData = notification.data as any;
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage 
                  src={tipData.viewerAvatarUrl} 
                  alt={tipData.viewerName || 'Anonymous'}
                />
                <AvatarFallback className="bg-green-100 dark:bg-green-900/20">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Tip
                  </Badge>
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${(tipData.amountCents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {tipData.currency}
                  </p>
                </div>
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  <Link 
                    href={getUserUrl(tipData.userId || '', tipData.viewerChannelSlug)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {tipData.viewerName || 'Anonymous'}
                  </Link>
                  {' '}tipped you
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  on{' '}
                  <Link 
                    href={getChannelUrl(tipData.channelSlug, tipData.channelId)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    {tipData.channelName || 'your channel'}
                  </Link>
                </p>
              </div>

              <div className="mt-3 flex space-x-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={getChannelUrl(tipData.channelSlug, tipData.channelId)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View Channel
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={getUserUrl(tipData.userId || '', tipData.viewerChannelSlug)}>
                    <User className="w-4 h-4 mr-1" />
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'FOLLOW':
        const followData = notification.data as any;
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage 
                  src={followData.followerAvatarUrl} 
                  alt={followData.followerName || 'Someone'}
                />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900/20">
                  <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Follow
                </Badge>
                <Heart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  <Link 
                    href={getUserUrl(followData.followerId, followData.followerChannelSlug)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {followData.followerName || 'Someone'}
                  </Link>
                  {' '}started following you
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  on{' '}
                  <Link 
                    href={getChannelUrl(followData.channelSlug, followData.channelId)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    {followData.channelName || 'your channel'}
                  </Link>
                </p>
              </div>

              <div className="mt-3 flex space-x-2">
                {followData.followerChannelId && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleFollow(followData.followerChannelId)}
                    disabled={isFollowLoading || isFollowing}
                  >
                    {isFollowLoading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-1" />
                    )}
                    {isFollowing ? 'Following' : 'Follow Back'}
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={getChannelUrl(followData.followerChannelSlug, followData.followerChannelId)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View Channel
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'SUB':
        const subData = notification.data as any;
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage 
                  src={subData.subscriberAvatarUrl} 
                  alt={subData.subscriberName || 'Someone'}
                />
                <AvatarFallback className="bg-purple-100 dark:bg-purple-900/20">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  Subscription
                </Badge>
                <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  <Link 
                    href={getUserUrl(subData.userId, subData.subscriberChannelSlug)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {subData.subscriberName || 'Someone'}
                  </Link>
                  {' '}{subData.action?.toLowerCase() || 'subscribed'} to your channel
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  <Link 
                    href={getChannelUrl(subData.channelSlug, subData.channelId)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                  >
                    {subData.channelName || 'your channel'}
                  </Link>
                </p>
                {subData.status === 'ACTIVE' && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Active subscription
                  </p>
                )}
              </div>

              <div className="mt-3 flex space-x-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={getUserUrl(subData.userId, subData.subscriberChannelSlug)}>
                    <User className="w-4 h-4 mr-1" />
                    View Profile
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={getChannelUrl(subData.channelSlug, subData.channelId)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View Channel
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                Unknown notification type
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500 dark:border-l-blue-400">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {renderNotificationContent()}
          </div>
          
          <div className="flex flex-col items-end space-y-2 ml-4">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              {formatTimeAgo(notification.createdAt)}
            </div>
            
            {showRemoveButton && onRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(notification.id)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}