"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Users, Clock } from "lucide-react";
import { LiveStream } from "@/types/stream";

interface LiveStreamCardProps {
  stream: LiveStream;
}

export function LiveStreamCard({ stream }: LiveStreamCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const streamUrl = stream.channel.slug ? `/${stream.channel.slug}` : `/channel/${stream.channel.id}`;

  return (
    <Link href={streamUrl} className="group">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
        <div className="relative aspect-video bg-muted">
          {stream.thumbnailUrl ? (
            <Image
              src={stream.thumbnailUrl}
              alt={stream.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Play className="h-12 w-12 text-primary/50" />
            </div>
          )}
          
          {/* Live Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </Badge>
          </div>

          {/* Viewers count (placeholder - would need real-time data) */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="flex items-center gap-1 bg-black/50 text-white">
              <Users className="w-3 h-3" />
              {Math.floor(Math.random() * 1000) + 1}
            </Badge>
          </div>

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black ml-1" />
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Stream Title */}
            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {stream.name}
            </h3>

            {/* Channel Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={stream.channel.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(stream.channel.displayName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {stream.channel.displayName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatNumber(stream.channel.followerCount)} followers</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(stream.startedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category */}
            {stream.channel.category && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {stream.channel.category}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
