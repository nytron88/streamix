"use client";

import { SidebarContent } from "./sidebar-content";

export function DesktopSidebar() {
    return (
        <aside className="hidden md:block w-64 border-r bg-muted/10 min-h-[calc(100vh-4rem)]">
            <SidebarContent />
        </aside>
    );
}
