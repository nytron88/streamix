"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/layout/theme-toggle";
import { Search, Menu, X, Loader2 } from "lucide-react";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";
import { SearchResponse } from "@/types/search";

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
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounce search query
    useEffect(() => {
        if (searchQuery !== debouncedQuery) {
            setIsSearching(true);
        }

        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, debouncedQuery]);

    // Search function
    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults(null);
            setShowResults(false);
            return;
        }

        try {
            const response = await axios.get<APIResponse<SearchResponse>>(
                `/api/search?q=${encodeURIComponent(query.trim())}&limit=5`
            );

            if (response.data.success && response.data.payload) {
                setSearchResults(response.data.payload);
                setShowResults(true);
            } else {
                setSearchResults(null);
                setShowResults(false);
            }
        } catch (error) {
            setSearchResults(null);
            setShowResults(false);
        }
    }, []);

    // Get search suggestions
    const getSuggestions = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await axios.get<APIResponse<{ suggestions: string[] }>>(
                `/api/search/suggestions?q=${encodeURIComponent(query)}`
            );
            
            if (response.data.success && response.data.payload) {
                setSuggestions(response.data.payload.suggestions);
            }
        } catch (error) {
            // Silently handle suggestion errors
        }
    }, []);

    // Trigger search when debounced query changes
    useEffect(() => {
        performSearch(debouncedQuery);
    }, [debouncedQuery, performSearch]);

    // Get suggestions when search query changes
    useEffect(() => {
        if (searchQuery.trim()) {
            getSuggestions(searchQuery);
        } else {
            setSuggestions([]);
        }
    }, [searchQuery, getSuggestions]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
            setShowResults(false);
            setSearchQuery("");
        }
    };

    const handleResultClick = (result: any) => {
        if (result.type === "user") {
            router.push(`/channel/${result.slug}`);
        } else if (result.type === "vod") {
            router.push(`/vod/${result.id}`);
        }
        setShowResults(false);
        setShowSuggestions(false);
        setSearchQuery("");
    };

    const handleInputBlur = () => {
        // Delay hiding results to allow clicking on them
        setTimeout(() => {
            setShowResults(false);
            setShowSuggestions(false);
        }, 200);
    };

    const formatNumber = (num: number | undefined) => {
        if (!num) return "0";
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };
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
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search streams, creators..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onBlur={handleInputBlur}
                                onFocus={() => {
                                    if (searchQuery) setShowResults(true);
                                    if (suggestions.length > 0) setShowSuggestions(true);
                                }}
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
                            )}
                        </form>
                        
                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && !showResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-2xl z-50">
                                <div className="py-2">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSearchQuery(suggestion);
                                                setShowSuggestions(false);
                                                router.push(`/browse?q=${encodeURIComponent(suggestion)}`);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-all duration-200 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                                        >
                                            <Search className="w-4 h-4 text-primary/60" />
                                            <span className="text-sm font-medium">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Search Results Dropdown */}
                        {showResults && searchResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-md border border-primary/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                                {searchResults.results.length > 0 ? (
                                    <div className="py-2">
                                        {searchResults.results.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-all duration-200 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                                            >
                                                {result.avatarUrl && (
                                                    <img
                                                        src={result.avatarUrl}
                                                        alt={result.title}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{result.title}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {result.type === "user" ? "Channel" : "VOD"}
                                                        {result.type === "user" && ` • ${formatNumber(result.followerCount || 0)} followers`}
                                                        {result.type === "vod" && result.viewCount !== undefined && ` • ${formatNumber(result.viewCount)} views`}
                                                        {result.isLive && " • Live"}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        <div className="border-t px-4 py-2">
                                            <button
                                                onClick={handleSearchSubmit}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                View all results for "{searchQuery}"
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-muted-foreground">
                                        No results found
                                    </div>
                                )}
                            </div>
                        )}
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
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search streams, creators..."
                                className="pl-10 pr-10 h-10"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onBlur={handleInputBlur}
                                onFocus={() => {
                                    if (searchQuery) setShowResults(true);
                                    if (suggestions.length > 0) setShowSuggestions(true);
                                }}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setShowResults(false);
                                        setShowSuggestions(false);
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            {isSearching && (
                                <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
                            )}
                        </form>
                        
                        {/* Mobile Search Suggestions */}
                        {showSuggestions && suggestions.length > 0 && !showResults && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                                <div className="py-2">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSearchQuery(suggestion);
                                                setShowSuggestions(false);
                                                router.push(`/browse?q=${encodeURIComponent(suggestion)}`);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-3"
                                        >
                                            <Search className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm">{suggestion}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Mobile Search Results */}
                        {showResults && searchResults && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                                {searchResults.results.length > 0 ? (
                                    <div className="py-2">
                                        {searchResults.results.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-all duration-200 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl"
                                            >
                                                {result.avatarUrl && (
                                                    <img
                                                        src={result.avatarUrl}
                                                        alt={result.title}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{result.title}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {result.type === "user" ? "Channel" : "VOD"}
                                                        {result.type === "user" && ` • ${formatNumber(result.followerCount || 0)} followers`}
                                                        {result.type === "vod" && result.viewCount !== undefined && ` • ${formatNumber(result.viewCount)} views`}
                                                        {result.isLive && " • Live"}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                        <div className="border-t px-4 py-2">
                                            <button
                                                onClick={handleSearchSubmit}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                View all results for "{searchQuery}"
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center text-muted-foreground">
                                        No results found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
