"use client";

import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar-content";
import { RecommendedChannel } from "@/types/recommendations";


interface MobileSidebarProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recommendedChannels: RecommendedChannel[];
    loading: boolean;
}

export function MobileSidebar({ open, onOpenChange, recommendedChannels, loading }: MobileSidebarProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="flex-row items-center gap-2 p-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <Image
                            src="/favicon.ico"
                            alt="Streamix"
                            width={24}
                            height={24}
                            className="w-6 h-6 dark:invert dark:brightness-0 dark:contrast-100"
                        />
                        Streamix
                    </SheetTitle>
                </SheetHeader>
                <SidebarContent recommendedChannels={recommendedChannels} loading={loading} />
            </SheetContent>
        </Sheet>
    );
}
