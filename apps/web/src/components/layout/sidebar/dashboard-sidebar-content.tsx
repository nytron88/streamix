"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    User,
    Play,
    Bell,
    DollarSign,
    BarChart3,
    Home
} from "lucide-react";

const dashboardSidebarItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: Play, label: "Start Streaming", href: "/dashboard/start-streaming" },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
    { icon: DollarSign, label: "Earnings", href: "/dashboard/earnings" },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
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
