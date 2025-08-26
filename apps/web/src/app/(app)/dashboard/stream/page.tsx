"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Video,
  Users,
  MessageCircle,
  Settings,
  Play,
  Square,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { StreamPlayer } from "@/components/stream/StreamPlayer";
import Link from "next/link";

type StreamData = {
  isLive: boolean;
  name: string | null;
  channelDisplayName: string;
  viewerCount: number;
  chatSettings: {
    isChatEnabled: boolean;
    isChatDelayed: boolean;
    isChatFollowersOnly: boolean;
  };
  streamUrl?: string;
  token?: string;
  wsUrl?: string;
  roomName?: string;
};

export default function MyStreamPage() {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stream data
  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get channel info first to get the slug
        const channelResponse = await axios.get("/api/channel");
        const channel = channelResponse.data.payload.channel;
        const slug = channel.slug || channel.userId;

        // Get full channel data with stream info (using the same endpoint as viewer page)
        const channelDetailResponse = await axios.get(`/api/channel/${slug}`);
        const channelData = channelDetailResponse.data.payload;

        if (!channelData.channel.stream?.isLive) {
          setStreamData({
            isLive: false,
            name: channelData.channel.stream?.name || null,
            channelDisplayName: channelData.channel.displayName || "Your Stream",
            viewerCount: 0,
            chatSettings: {
              isChatEnabled: channelData.channel.stream?.isChatEnabled || true,
              isChatDelayed: channelData.channel.stream?.isChatDelayed || false,
              isChatFollowersOnly: channelData.channel.stream?.isChatFollowersOnly || false,
            },
          });
          return;
        }

        // Get stream token for live stream
        const tokenResponse = await axios.post("/api/stream/token", {
          slug: slug,
        });

        setStreamData({
          isLive: true,
          name: channelData.channel.stream.name || "Live Stream",
          channelDisplayName: channelData.channel.displayName || "Your Stream",
          viewerCount: 0, // TODO: Get real viewer count from participants
          chatSettings: {
            isChatEnabled: channelData.channel.stream.isChatEnabled,
            isChatDelayed: channelData.channel.stream.isChatDelayed,
            isChatFollowersOnly: channelData.channel.stream.isChatFollowersOnly,
          },
          streamUrl: `/${slug}`,
          token: tokenResponse.data.payload.token,
          wsUrl: tokenResponse.data.payload.wsUrl,
          roomName: tokenResponse.data.payload.roomName,
        });
      } catch (err: any) {
        console.error("Failed to fetch stream data:", err);
        setError(err.response?.data?.message || "Failed to load stream data");
      } finally {
        setLoading(false);
      }
    };

    fetchStreamData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStreamData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Stream</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitor and manage your live stream
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Stream</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Stream</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor and manage your live stream
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={streamData?.isLive ? "default" : "secondary"}>
            {streamData?.isLive ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                LIVE
              </>
            ) : (
              <>
                <Square className="w-3 h-3 mr-1" />
                OFFLINE
              </>
            )}
          </Badge>

          {streamData?.streamUrl && (
            <Button asChild variant="outline" size="sm">
              <Link href={streamData.streamUrl} target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Public Stream
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stream Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Stream Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">
                {streamData?.isLive ? "LIVE" : "OFFLINE"}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{streamData?.viewerCount || 0}</div>
              <div className="text-sm text-muted-foreground">Viewers</div>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">
                {streamData?.chatSettings.isChatEnabled ? "ON" : "OFF"}
              </div>
              <div className="text-sm text-muted-foreground">Chat</div>
            </div>
          </div>

          {streamData?.name && (
            <div>
              <h4 className="text-sm font-medium mb-2">Stream Title</h4>
              <p className="text-muted-foreground">{streamData.name}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Chat Settings:</span>
            {streamData?.chatSettings.isChatFollowersOnly && (
              <Badge variant="outline" className="text-xs">Followers Only</Badge>
            )}
            {streamData?.chatSettings.isChatDelayed && (
              <Badge variant="outline" className="text-xs">Delayed</Badge>
            )}
            {!streamData?.chatSettings.isChatEnabled && (
              <Badge variant="secondary" className="text-xs">Disabled</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/keys">
                <Settings className="w-4 h-4 mr-2" />
                Stream Settings
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/chat">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stream Player */}
      {streamData?.isLive && streamData.token && streamData.wsUrl && streamData.roomName ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Live Stream Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              <StreamPlayer
                token={streamData.token}
                serverUrl={streamData.wsUrl}
                roomName={streamData.roomName}
                channelDisplayName={streamData.channelDisplayName}
                chatSettings={streamData.chatSettings}
                ownerMode={true}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Stream Offline</h3>
                <p className="text-muted-foreground mb-4">
                  Start streaming with your broadcasting software to monitor your stream here.
                </p>
                <Button asChild>
                  <Link href="/dashboard/keys">
                    <Settings className="w-4 h-4 mr-2" />
                    Set Up Streaming
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
