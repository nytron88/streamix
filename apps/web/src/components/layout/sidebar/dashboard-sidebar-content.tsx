"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    User,
    Bell,
    DollarSign,
    Home,
    Key,
    MessageCircle,
    Video,
    Shield
} from "lucide-react";

const dashboardSidebarItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: User, label: "Profile", href: "/dashboard" },
    { icon: Key, label: "Keys", href: "/dashboard/keys" },
    { icon: Video, label: "My Stream", href: "/dashboard/stream" },
    { icon: MessageCircle, label: "Chat", href: "/dashboard/chat" },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
    { icon: DollarSign, label: "Earnings", href: "/dashboard/earnings" },
    { icon: Video, label: "Manage Vods", href: "/dashboard/vods" },
    { icon: Shield, label: "Manage Bans", href: "/dashboard/bans" },
];

export function DashboardSidebarContent() {
    return (
        <div className="flex flex-col h-full">
            {/* Dashboard Navigation Links */}
            <div className="p-4">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
                    <p className="text-sm text-muted-foreground">Manage your streaming content</p>
                </div>
                <nav className="space-y-2">
                    {dashboardSidebarItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Button
                                key={item.href}
                                variant="ghost"
                                className="w-full justify-start hover:bg-muted/80 transition-colors"
                                asChild
                            >
                                <Link href={item.href}>
                                    <Icon className="w-4 h-4 mr-3" />
                                    {item.label}
                                </Link>
                            </Button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
