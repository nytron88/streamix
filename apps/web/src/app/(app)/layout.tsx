"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { 
    Navbar, 
    DesktopSidebar, 
    MobileSidebar,
    DashboardDesktopSidebar,
    DashboardMobileSidebar
} from "@/components/layout";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const pathname = usePathname();

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const toggleMobileSearch = () => {
        setMobileSearchOpen(!mobileSearchOpen);
    };

    // Check if we're on a dashboard route
    const isDashboardRoute = pathname?.startsWith('/dashboard');

    return (
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
                        <DesktopSidebar />
                        <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
                    </>
                )}
                <main className="flex-1 p-4 md:p-6 max-w-full overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
