"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Heart,
  Users,
  Radio,
  ExternalLink,
  AlertCircle,
  Play,
  UserMinus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useUserFollowing } from "@/hooks/useUserFollowing";
import { useFollowActions } from "@/hooks/useFollowActions";
import { FollowingItem } from "@/types/following";

export default function FollowingPage() {
  const { following, total, isLoading, error, refresh } = useUserFollowing(50); // Get more follows at once
  const { unfollowChannel, isUnfollowLoading } = useFollowActions();
  const [unfollowingChannels, setUnfollowingChannels] = useState<Set<string>>(new Set());

  // Handle unfollow action
  const handleUnfollow = async (channel: FollowingItem) => {
    setUnfollowingChannels(prev => new Set(prev).add(channel.channelId));
    
    try {
      await unfollowChannel(channel.channelId);
      toast.success(`Unfollowed ${channel.displayName || 'channel'}`);
      refresh(); // Refresh the following list
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to unfollow channel");
    } finally {
      setUnfollowingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channel.channelId);
        return newSet;
      });
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Following</h1>
          <p className="text-muted-foreground">Channels you follow</p>
        </div>

        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded w-48 mb-2" />
                    <div className="h-4 bg-muted rounded w-32" />
                  </div>
                  <div className="h-10 bg-muted rounded w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Following</h1>
          <p className="text-muted-foreground">Channels you follow</p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Following</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the channels you follow. Please try again.
            </p>
            <Button onClick={() => refresh()} className="cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Following</h1>
            <p className="text-muted-foreground">
              {total > 0 
                ? `Following ${total} channel${total === 1 ? '' : 's'}`
                : 'Channels you follow will appear here'
              }
            </p>
          </div>
          
          {total > 0 && (
            <Button
              variant="outline"
              onClick={() => refresh()}
              className="cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {total === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">Not Following Anyone Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start following your favorite creators to see their latest streams and updates.
            </p>
            <Link href="/browse">
              <Button className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Discover Channels
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Following List */}
      {total > 0 && (
        <div className="grid gap-4">
          {following.map((channel) => (
            <Card key={channel.channelId} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  {/* Channel Avatar */}
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={channel.avatarUrl} />
                      <AvatarFallback>
                        {getUserInitials(channel.displayName || 'Unknown')}
                      </AvatarFallback>
                    </Avatar>
                    
                    {channel.live && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                          <Radio className="h-3 w-3" />
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/channel/${channel.slug || channel.channelId}`}
                        className="hover:underline"
                      >
                        <h3 className="text-lg font-semibold">
                          {channel.displayName || 'Unknown Channel'}
                        </h3>
                      </Link>
                      
                      {channel.live && (
                        <Badge variant="destructive" className="text-xs">
                          LIVE
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      @{channel.slug || channel.channelId}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {formatNumber(channel.followerCount)} followers
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {channel.live && (
                      <Link href={`/${channel.slug || channel.channelId}`}>
                        <Button size="sm" className="cursor-pointer bg-red-600 hover:bg-red-700">
                          <Play className="h-4 w-4 mr-1" />
                          Watch Live
                        </Button>
                      </Link>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnfollow(channel)}
                      disabled={unfollowingChannels.has(channel.channelId) || isUnfollowLoading}
                      className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      {unfollowingChannels.has(channel.channelId) ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4 mr-1" />
                      )}
                      Unfollow
                    </Button>

                    <Link href={`/channel/${channel.slug || channel.channelId}`}>
                      <Button size="sm" variant="outline" className="cursor-pointer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Live Channels Summary */}
      {total > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Radio className="h-4 w-4 text-red-500" />
              <span>
                {following.filter(c => c.live).length} of {total} channels are currently live
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
