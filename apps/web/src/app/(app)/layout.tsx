"use client";

import { useState } from "react";
import { Navbar, DesktopSidebar, MobileSidebar } from "@/components/layout";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const toggleMobileSearch = () => {
        setMobileSearchOpen(!mobileSearchOpen);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                onMobileMenuToggle={toggleMobileMenu}
                mobileSearchOpen={mobileSearchOpen}
                onMobileSearchToggle={toggleMobileSearch}
            />
            <div className="flex">
                <DesktopSidebar />
                <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
                <main className="flex-1 p-4 md:p-6 max-w-full overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
