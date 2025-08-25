"use client";

import { useParams } from "next/navigation";
import { useChannelBySlug } from "@/hooks/useChannelBySlug";
import { useViewerToken } from "@/hooks/useViewerToken";
import { useFollowActions } from "@/hooks/useFollowActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Clock,
  AlertCircle,
  Play,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { StreamPlayer } from "@/components/stream/StreamPlayer";

export default function ChannelPage() {
  const params = useParams();
  const username = params?.username as string;

  const {
    data: channelData,
    isLoading: channelLoading,
    error: channelError,
    refresh: refreshChannel,
  } = useChannelBySlug(username);

  const {
    token,
    wsUrl,
    roomName,
    isLoading: tokenLoading,
    error: tokenError,
    refresh: refreshToken,
  } = useViewerToken(username);

  const { followChannel, unfollowChannel, isLoading: followLoading } = useFollowActions();
  const [localFollowState, setLocalFollowState] = useState<boolean | null>(null);

  useEffect(() => {
    if (channelData?.viewer) {
      setLocalFollowState(channelData.viewer.isFollowing);
    }
  }, [channelData?.viewer?.isFollowing]);

  const handleFollowToggle = async () => {
    if (!channelData?.channel.id) return;
    const currentState = localFollowState ?? channelData.viewer.isFollowing;
    const ok = currentState
      ? await unfollowChannel(channelData.channel.id)
      : await followChannel(channelData.channel.id);
    if (ok) {
      setLocalFollowState(!currentState);
      refreshChannel();
    }
  };

  if (channelLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading channel...</p>
        </div>
      </div>
    );
  }

  if (channelError || !channelData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Channel Not Found</h3>
              <p className="text-sm text-muted-foreground">
                The channel &quot;{username}&quot; does not exist or has been removed.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.history.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { channel, assets, viewer } = channelData;
  const isFollowing = localFollowState ?? viewer.isFollowing;

  if (viewer.isBanned) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">You are banned</h3>
              <p className="text-sm text-muted-foreground">
                You have been banned from this channel.
              </p>
              {viewer.banReason && (
                <p className="text-sm text-muted-foreground">Reason: {viewer.banReason}</p>
              )}
              {viewer.banExpiresAt && (
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(viewer.banExpiresAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => window.history.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLive = channel.stream?.isLive;
  const streamName =
    channel.stream?.name || `${channel.displayName || channel.user.name}'s Stream`;

  return (
    <div className="space-y-6">
      {/* Channel Header */}
      <Card>
        <CardContent className="p-6">
          {assets.bannerUrl && (
            <div
              className="h-32 md:h-48 bg-cover bg-center rounded-lg mb-6"
              style={{ backgroundImage: `url(${assets.bannerUrl})` }}
            />
          )}

          <div className="flex flex-col md:flex-row gap-4 items-start">
            <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background">
              <AvatarImage src={assets.avatarUrl} />
              <AvatarFallback>
                {channel.displayName?.[0] || channel.user.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {channel.displayName || channel.user.name}
                  </h1>
                  <p className="text-muted-foreground">@{channel.slug}</p>
                </div>

                {!viewer.isOwner && (
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className="w-full md:w-auto"
                  >
                    {followLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    ) : isFollowing ? (
                      <UserMinus className="h-4 w-4 mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{channel.followerCount.toLocaleString()} followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Joined {new Date(channel.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {channel.bio && <p className="text-sm leading-relaxed">{channel.bio}</p>}
              {channel.category && <Badge variant="secondary">{channel.category}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stream Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Stream Status
            {isLive && <Badge variant="destructive" className="bg-red-500">LIVE</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLive ? (
            <>
              <div>
                <h3 className="font-semibold">{streamName}</h3>
                <p className="text-sm text-muted-foreground">
                  {channel.displayName || channel.user.name} is currently live!
                </p>
              </div>

              {/* Token Status */}
              {tokenLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  <span className="text-sm text-muted-foreground">Getting viewer token...</span>
                </div>
              ) : tokenError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">Failed to get viewer token</p>
                  <Button variant="outline" size="sm" onClick={() => refreshToken()}>
                    Retry
                  </Button>
                </div>
              ) : token ? (
                <p className="text-sm text-green-600">✓ Token acquired</p>
              ) : null}

              {/* Chat Settings */}
              {channel.stream && (
                <div className="space-y-2">
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${channel.stream.isChatEnabled ? "bg-green-500" : "bg-red-500"
                          }`}
                      />
                      <span>Chat {channel.stream.isChatEnabled ? "Enabled" : "Disabled"}</span>
                    </div>
                    {channel.stream.isChatDelayed && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>Chat Delayed</span>
                      </div>
                    )}
                    {channel.stream.isChatFollowersOnly && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Followers Only</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                <Play className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Channel is offline</h3>
                <p className="text-sm text-muted-foreground">
                  {channel.displayName || channel.user.name} is not currently streaming.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Player */}
      {isLive && token && roomName && wsUrl && (
        viewer.isOwner ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">You're Live!</h3>
                  <p className="text-muted-foreground">
                    Your stream is currently broadcasting. Use your streaming software (OBS, etc.) to monitor your stream.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Viewers can watch your stream at this page, but as the streamer, you should use your broadcasting software to see what you're streaming.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <StreamPlayer
            token={token}
            serverUrl={wsUrl}
            roomName={roomName}
            viewerName={username}
            channelDisplayName={channel.displayName || channel.user.name}
          />
        )
      )}
    </div>
  );
}
