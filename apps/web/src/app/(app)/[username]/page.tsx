"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useChannelBySlug } from "@/hooks/useChannelBySlug";
import { useViewerToken } from "@/hooks/useViewerToken";
import { useFollowActions } from "@/hooks/useFollowActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
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

      {/* Stream Content */}
      {isLive ? (
        // Live Stream
        token && roomName && wsUrl ? (
          <div className="space-y-4">
            {viewer.isOwner ? (
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
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Stream Title */}
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold">{streamName}</h1>
                  <p className="text-muted-foreground">
                    Now streaming live • Click anywhere on the player to show controls
                  </p>
                </div>

                {/* Stream Player */}
                <div className="w-full max-w-6xl mx-auto">
                  <StreamPlayer
                    token={token}
                    serverUrl={wsUrl}
                    roomName={roomName}
                    viewerName={username}
                    channelDisplayName={channel.displayName || channel.user.name}
                  />
                </div>

                {/* Minimal Stream Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Link href={`/channel/${channel.slug || channel.id}`} className="hover:opacity-80 transition-opacity">
                          <Avatar className="h-10 w-10 cursor-pointer">
                            <AvatarImage src={assets.avatarUrl} />
                            <AvatarFallback>
                              {channel.displayName?.[0] || channel.user.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <Link 
                            href={`/channel/${channel.slug || channel.id}`} 
                            className="hover:text-primary transition-colors"
                          >
                            <h3 className="font-semibold cursor-pointer">
                              {channel.displayName || channel.user.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {channel.followerCount.toLocaleString()} followers
                          </p>
                        </div>
                      </div>
                      
                      {!viewer.isOwner && (
                        <Button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          variant={isFollowing ? "outline" : "default"}
                          size="sm"
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
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          // Loading token or connection issues
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                {tokenLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground">Connecting to stream...</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Unable to Connect</h3>
                      <p className="text-muted-foreground mb-4">
                        Could not connect to the live stream.
                      </p>
                      <Button variant="outline" onClick={() => refreshToken()}>
                        Try Again
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        // Channel Offline
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {channel.displayName || channel.user.name} is offline
                </h3>
                <p className="text-muted-foreground">
                  This channel is not currently streaming.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
