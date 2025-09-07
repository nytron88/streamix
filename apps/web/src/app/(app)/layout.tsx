"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import {
    Navbar,
    DesktopSidebar,
    MobileSidebar,
    DashboardDesktopSidebar,
    DashboardMobileSidebar
} from "@/components/layout";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { APIResponse } from "@/types/apiResponse";
import { RecommendedChannel } from "@/types/recommendations";


export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [recommendedChannels, setRecommendedChannels] = useState<RecommendedChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const toggleMobileSearch = () => {
        setMobileSearchOpen(!mobileSearchOpen);
    };

    // Check if we're on a dashboard route
    const isDashboardRoute = pathname?.startsWith('/dashboard');

    // Fetch recommended channels on mount
    useEffect(() => {
        const fetchRecommendedChannels = async () => {
            try {
                setLoading(true);
                const response = await axios.get<APIResponse<RecommendedChannel[]>>('/api/recommendations/channels?limit=8');
                if (response.data.success && response.data.payload) {
                    setRecommendedChannels(response.data.payload);
                }
            } catch (error) {
                console.error('Failed to fetch recommended channels:', error);
                // Fail silently for better UX
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendedChannels();
    }, []);

    return (
        <NotificationProvider showToasts={true} subscribeToGlobal={false}>
            <div className="min-h-screen bg-background">
                <Navbar
                    onMobileMenuToggle={toggleMobileMenu}
                    mobileSearchOpen={mobileSearchOpen}
                    onMobileSearchToggle={toggleMobileSearch}
                />
                <div className="flex">
                    {isDashboardRoute ? (
                        <>
                            <DashboardDesktopSidebar />
                            <DashboardMobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
                        </>
                    ) : (
                        <>
                            <DesktopSidebar
                                recommendedChannels={recommendedChannels}
                                loading={loading}
                            />
                            <MobileSidebar
                                open={mobileMenuOpen}
                                onOpenChange={setMobileMenuOpen}
                                recommendedChannels={recommendedChannels}
                                loading={loading}
                            />
                        </>
                    )}
                    <main className="flex-1 p-4 md:p-6 max-w-full overflow-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </NotificationProvider>
    );
}
