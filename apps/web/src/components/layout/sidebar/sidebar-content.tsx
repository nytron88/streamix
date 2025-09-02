"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Home, TrendingUp, Users, LayoutDashboard, Bell, CreditCard, Video } from "lucide-react";
import { RecommendedChannel } from "@/types/recommendations";


interface SidebarContentProps {
    recommendedChannels: RecommendedChannel[];
    loading: boolean;
}

const sidebarItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Video, label: "VODs", href: "/dashboard/vods" },
    { icon: Users, label: "Following", href: "/following" },
    { icon: CreditCard, label: "Subscriptions", href: "/subscriptions" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
];

export function SidebarContent({ recommendedChannels, loading }: SidebarContentProps) {
    // Helper function to get fallback initials from display name
    const getInitials = (name: string | null) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map(word => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Helper function to format follower count
    const formatFollowerCount = (count: number) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };
    return (
        <div className="flex flex-col h-full">
            {/* Navigation Links */}
            <div className="p-4">
                <nav className="space-y-2">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Button
                                key={item.href}
                                variant="ghost"
                                className="w-full justify-start"
                                asChild
                            >
                                <Link href={item.href}>
                                    <Icon className="w-4 h-4 mr-2" />
                                    {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>
            </div>

            <Separator />

            {/* Recommended Channels Section */}
            <div className="p-4 flex-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    RECOMMENDED CHANNELS
                </h3>
                <ScrollArea className="h-[300px] md:h-[400px]">
                    <div className="space-y-3">
                        {loading ? (
                            // Loading skeleton
                            Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-2 rounded-md"
                                >
                                    <div className="relative">
                                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="h-4 bg-muted animate-pulse rounded" />
                                        <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                                    </div>
                                </div>
                            ))
                        ) : recommendedChannels.length > 0 ? (
                            recommendedChannels.map((channel) => (
                                <Link
                                    key={channel.channelId}
                                    href={channel.live && channel.slug ? `/${channel.slug}` : `/channel/${channel.slug || channel.channelId}`}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                    title={channel.live ? `Watch ${channel.displayName || "Unknown Channel"} live` : `View ${channel.displayName || "Unknown Channel"}'s channel`}
                                >
                                    <div className="relative">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={channel.avatarUrl} />
                                            <AvatarFallback>
                                                {getInitials(channel.displayName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {channel.live && (
                                            <Badge
                                                variant="destructive"
                                                className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-red-500 hover:bg-red-500"
                                            >
                                                <span className="sr-only">Live</span>
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {channel.displayName || "Unknown Channel"}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <span>{formatFollowerCount(channel.followerCount)} followers</span>
                                            {channel.live && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-red-500 font-medium">LIVE</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No recommendations available
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
