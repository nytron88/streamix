"use client";

import { DashboardSidebarContent } from "./dashboard-sidebar-content";

export function DashboardDesktopSidebar() {
    return (
        <aside className="hidden md:block w-64 border-r bg-muted/10 min-h-[calc(100vh-4rem)]">
            <DashboardSidebarContent />
        </aside>
    );
}
