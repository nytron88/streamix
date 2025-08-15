"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Home, TrendingUp, Users, Video, Settings } from "lucide-react";

const sidebarItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: TrendingUp, label: "Browse", href: "/browse" },
    { icon: Users, label: "Following", href: "/following" },
    { icon: Video, label: "My Streams", href: "/my-streams" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

const mockLiveChannels = [
    {
        id: "1",
        name: "StreamerName",
        category: "Gaming",
        viewers: "1.2k",
        avatar: "/placeholder-avatar.jpg",
        fallback: "SN"
    },
    {
        id: "2",
        name: "ArtCreator",
        category: "Art",
        viewers: "856",
        avatar: "/placeholder-avatar.jpg",
        fallback: "AC"
    },
    {
        id: "3",
        name: "MusicianLive",
        category: "Music",
        viewers: "623",
        avatar: "/placeholder-avatar.jpg",
        fallback: "MU"
    }
];

export function SidebarContent() {
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

            {/* Live Channels Section */}
            <div className="p-4 flex-1">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    LIVE CHANNELS
                </h3>
                <ScrollArea className="h-[300px] md:h-[400px]">
                    <div className="space-y-3">
                        {mockLiveChannels.map((channel) => (
                            <div
                                key={channel.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                                <div className="relative">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={channel.avatar} />
                                        <AvatarFallback>{channel.fallback}</AvatarFallback>
                                    </Avatar>
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-3 w-3 p-0 bg-red-500 hover:bg-red-500"
                                    >
                                        <span className="sr-only">Live</span>
                                    </Badge>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{channel.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <span>{channel.category}</span>
                                        <span>•</span>
                                        <span>{channel.viewers} viewers</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
