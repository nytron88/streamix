"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/layout/theme-toggle";
import { Search, Menu, X } from "lucide-react";

interface NavbarProps {
    onMobileMenuToggle: () => void;
    mobileSearchOpen: boolean;
    onMobileSearchToggle: () => void;
}

export function Navbar({
    onMobileMenuToggle,
    mobileSearchOpen,
    onMobileSearchToggle
}: NavbarProps) {
    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4">
                {/* Mobile Menu Button + Logo */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={onMobileMenuToggle}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                    </Button>

                    <Link href="/home" className="hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/favicon.ico"
                                alt="Streamix"
                                width={32}
                                height={32}
                                className="w-8 h-8 dark:invert dark:brightness-0 dark:contrast-100"
                            />
                            <div className="text-xl font-semibold hidden sm:block">Streamix</div>
                        </div>
                    </Link>
                </div>

                {/* Search Bar - Hidden on small screens */}
                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search streams, creators..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Search Button for Mobile */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={onMobileSearchToggle}
                    >
                        {mobileSearchOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Search className="h-5 w-5" />
                        )}
                        <span className="sr-only">
                            {mobileSearchOpen ? 'Close search' : 'Open search'}
                        </span>
                    </Button>

                    <ModeToggle />

                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: "w-8 h-8"
                            }
                        }}
                    />
                </div>
            </div>

            {/* Mobile Search Bar - Only show when toggled */}
            {mobileSearchOpen && (
                <div className="md:hidden border-t px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search streams, creators..."
                            className="pl-10"
                            autoFocus
                        />
                    </div>
                </div>
            )}
        </header>
    );
}
