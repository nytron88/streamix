"use client";

import { SidebarContent } from "./sidebar-content";
import { RecommendedChannel } from "@/types/recommendations";


interface DesktopSidebarProps {
    recommendedChannels: RecommendedChannel[];
    loading: boolean;
}

export function DesktopSidebar({ recommendedChannels, loading }: DesktopSidebarProps) {
    return (
        <aside className="hidden md:block w-64 border-r bg-muted/10 min-h-[calc(100vh-4rem)]">
            <SidebarContent recommendedChannels={recommendedChannels} loading={loading} />
        </aside>
    );
}
