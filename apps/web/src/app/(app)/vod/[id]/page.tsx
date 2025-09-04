"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Eye, Clock, User, Users, Heart } from "lucide-react";
import Link from "next/link";
import { VodPlayer } from "@/components/vod/VodPlayer";
import axios from "axios";

interface VodDetails {
  id: string;
  title: string;
  visibility: "PUBLIC" | "SUB_ONLY";
  publishedAt: string;
  createdAt: string;
  s3Url: string | null;
  thumbnailUrl: string | null;
  channel: {
    id: string;
    displayName: string;
    slug: string;
    user: {
      name: string;
    };
  };
}

interface ChannelInfo {
  id: string;
  displayName: string;
  slug: string;
  bio: string | null;
  category: string | null;
  followerCount: number;
  subscriberCount: number;
  createdAt: string;
  user: {
    name: string;
    imageUrl: string | null;
  };
  assets: {
    avatarUrl: string | null;
    bannerUrl: string | null;
  };
}

export default function VodPage() {
  const params = useParams();
  const vodId = params.id as string;

  const [vodDetails, setVodDetails] = useState<VodDetails | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVodDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`/api/vods/${vodId}/public`);
        setVodDetails(response.data.payload);
      } catch (err) {
        console.error("Error fetching VOD details:", err);
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.error || err.message || "Failed to load VOD";
          setError(errorMessage);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load VOD");
        }
      } finally {
        setLoading(false);
      }
    };

    if (vodId) {
      fetchVodDetails();
    }
  }, [vodId]);

  // Fetch channel info after VOD details are loaded
  useEffect(() => {
    const fetchChannelInfo = async () => {
      if (!vodDetails?.channel?.slug) return;

      try {
        const response = await axios.get(`/api/channel/${vodDetails.channel.slug}/public`);
        // The API returns { channel: {...}, assets: {...}, viewer: {...} }
        const { channel, assets } = response.data.payload;
        console.log("Channel API response:", { channel, assets });
        setChannelInfo({
          ...channel,
          assets
        });
      } catch (err) {
        console.error("Error fetching channel info:", err);
      }
    };

    fetchChannelInfo();
  }, [vodDetails?.channel?.slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatNumber = (num: number | undefined | null): string => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="aspect-video bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vodDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">

          <Card>
            <CardContent className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">VOD Not Found</h1>
              <p className="text-muted-foreground mb-4">
                {error || "This VOD could not be found or is no longer available."}
              </p>
              <Link href="/browse">
                <Button className="cursor-pointer">
                  Browse VODs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Video Player */}
        <VodPlayer
          vodId={vodId}
          title={vodDetails.title}
          videoUrl={vodDetails.s3Url}
          className="w-full"
        />

        {/* VOD Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{vodDetails.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>Published {formatDate(vodDetails.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(vodDetails.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Channel Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Channel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {channelInfo ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16 border-2 border-background shadow-lg">
                        <AvatarImage src={channelInfo.assets?.avatarUrl || undefined} />
                        <AvatarFallback className="text-lg">
                          {getUserInitials(channelInfo.displayName || channelInfo.user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">{channelInfo.displayName || channelInfo.user?.name}</h3>
                        <p className="text-sm text-muted-foreground">@{channelInfo.slug}</p>

                        {channelInfo.bio && (
                          <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{channelInfo.bio}</p>
                        )}

                        {channelInfo.category && (
                          <div className="mt-2">
                            <Badge variant="secondary">{channelInfo.category}</Badge>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatNumber(channelInfo.followerCount)}</span>
                            <span className="text-muted-foreground">followers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatNumber(channelInfo.subscriberCount)}</span>
                            <span className="text-muted-foreground">subscribers</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link href={`/channel/${channelInfo.slug}`}>
                        <Button variant="outline" size="sm" className="cursor-pointer">
                          Visit Channel
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{vodDetails.channel.displayName}</h3>
                      <p className="text-sm text-muted-foreground">@{vodDetails.channel.slug}</p>
                    </div>
                    <Link href={`/channel/${vodDetails.channel.slug}`}>
                      <Button variant="outline" size="sm" className="cursor-pointer">
                        Visit Channel
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <Badge variant={vodDetails.visibility === "PUBLIC" ? "default" : "secondary"}>
                    {vodDetails.visibility === "PUBLIC" ? "Public" : "Subscriber Only"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default">Published</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
