"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Video, Loader2, Play, Eye, Users as UsersIcon, Filter, SortAsc, SortDesc, TrendingUp, Calendar, Star, Clock, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";
import { SearchResponse } from "@/types/search";
// import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchType, setSearchType] = useState<"all" | "vods" | "users">("all");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "popularity">("relevance");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Perform search
  const performSearch = useCallback(async (query: string, type: "all" | "vods" | "users" = "all", page: number = 1, append: boolean = false) => {
    if (!query.trim()) {
      setSearchResults(null);
      setAllResults([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get<APIResponse<SearchResponse>>(
        `/api/search?q=${encodeURIComponent(query)}&type=${type}&page=${page}&limit=20&sortBy=${sortBy}`
      );

      if (response.data.success) {
        const data = response.data.payload;
        
        if (data) {
          if (append && allResults.length > 0) {
            setAllResults(prev => [...prev, ...data.results]);
          } else {
            setAllResults(data.results);
          }
          
          setSearchResults(data);
          setCurrentPage(page);
          setHasMore(data.pagination.hasNext);
        }
      }
    } catch (error) {
      // Silently handle search errors
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, allResults.length]);

  // Load more results
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && searchQuery.trim()) {
      performSearch(searchQuery, searchType, currentPage + 1, true);
    }
  }, [hasMore, isLoading, searchQuery, searchType, currentPage, performSearch]);

  // Infinite scroll hook - temporarily disabled to fix API errors
  // const { observerRef, isIntersecting } = useInfiniteScroll({
  //   hasMore,
  //   isLoading,
  // });

  // Load more when intersection observer triggers - temporarily disabled
  // useEffect(() => {
  //   if (isIntersecting && hasMore && !isLoading && searchQuery.trim() && allResults.length > 0) {
  //     loadMore();
  //   }
  // }, [isIntersecting, hasMore, isLoading, searchQuery, allResults.length, loadMore]);


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

  // Handle search on mount and when params change
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query, searchType, 1);
    }
  }, [searchParams, searchType, performSearch]);

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        getSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, getSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setCurrentPage(1);
      setAllResults([]);
      setShowSuggestions(false);
    }
  };

  const handleTypeChange = (type: string) => {
    if (type === "all" || type === "vods" || type === "users") {
      setSearchType(type);
      setCurrentPage(1);
      setAllResults([]);
      if (searchQuery.trim()) {
        performSearch(searchQuery, type, 1);
      }
    }
  };

  const handleSortChange = (sort: "relevance" | "date" | "popularity") => {
    setSortBy(sort);
    setCurrentPage(1);
    setAllResults([]);
    if (searchQuery.trim()) {
      performSearch(searchQuery, searchType, 1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/browse?q=${encodeURIComponent(suggestion)}`);
    setCurrentPage(1);
    setAllResults([]);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setAllResults([]);
    setShowSuggestions(false);
    router.push("/browse");
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getSortIcon = (sort: string) => {
    switch (sort) {
      case "relevance":
        return <Star className="h-4 w-4" />;
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "popularity":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const renderResult = (result: any) => {
    if (result.type === "vod") {
      return (
        <Link 
          key={result.id} 
          href={`/vod/${result.id}`} 
          className="group block focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded-xl"
          aria-label={`Watch video: ${result.title} by ${result.displayName}`}
        >
          <Card className="relative overflow-hidden bg-card border border-border shadow-lg hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer group-hover:border-primary/20 rounded-xl">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            
            <div className="relative aspect-video overflow-hidden rounded-t-xl">
              {result.thumbnailUrl ? (
                <Image
                  src={result.thumbnailUrl}
                  alt={result.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  priority={false}
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted/60 via-muted/40 to-muted/20 flex items-center justify-center">
                  <div className="text-center">
                    <Video className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-muted-foreground/70">No thumbnail</p>
                  </div>
                </div>
              )}
              
              {/* Enhanced gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/60 transition-all duration-500" />
              
              {/* Visibility badge with better styling */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <Badge 
                  variant={result.visibility === "SUB_ONLY" ? "destructive" : "secondary"}
                  className="text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 shadow-xl backdrop-blur-md border-0 bg-black/70 text-white hover:bg-black/90 transition-all duration-300 rounded-full"
                >
                  {result.visibility === "SUB_ONLY" ? "🔒" : "🌐"}
                  <span className="hidden sm:inline ml-1">
                    {result.visibility === "SUB_ONLY" ? "Sub Only" : "Public"}
                  </span>
                </Badge>
              </div>
              
              {/* Play button overlay with enhanced animation */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="bg-black/80 backdrop-blur-md rounded-full p-3 sm:p-5 shadow-2xl transform scale-50 group-hover:scale-100 transition-all duration-500 ease-out border-2 border-white/20">
                  <Play className="h-6 w-6 sm:h-10 sm:w-10 text-white fill-white drop-shadow-lg" />
                </div>
              </div>
              
              {/* View count overlay */}
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-white text-xs sm:text-sm font-semibold">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{formatNumber(result.viewCount || 0)}</span>
                </div>
              </div>
            </div>
            
            <CardContent className="p-3 sm:p-4 lg:p-5 relative">
              <div className="space-y-3 sm:space-y-4">
                {/* Title with better typography */}
                <h3 className="font-bold line-clamp-2 group-hover:text-primary transition-colors duration-300 text-sm sm:text-base lg:text-lg leading-tight text-foreground">
                  {result.title}
                </h3>
                
                {/* Stats row with improved layout */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-1 sm:space-x-2 bg-primary/10 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border border-primary/20">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-primary">{formatDate(result.publishedAt || new Date().toISOString())}</span>
                  </div>
                  </div>
                </div>
                
                {/* Creator info with enhanced styling */}
                <div className="flex items-center space-x-2 sm:space-x-3 pt-2 sm:pt-3 border-t border-border/30">
                  {result.avatarUrl ? (
                    <div className="relative flex-shrink-0">
                      <Image
                        src={result.avatarUrl}
                        alt={result.displayName}
                        width={28}
                        height={28}
                        className="rounded-full w-7 h-7 sm:w-8 sm:h-8 ring-2 ring-primary/30 group-hover:ring-primary/50 transition-all duration-300"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary/30 to-primary/15 rounded-full flex items-center justify-center ring-2 ring-primary/30 group-hover:ring-primary/50 transition-all duration-300 flex-shrink-0">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary/70" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors duration-300">
                      {result.displayName}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }

    return (
      <Link 
        key={result.id} 
        href={`/channel/${result.slug}`} 
        className="group block focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded-xl"
        aria-label={`Visit channel: ${result.displayName}${result.isLive ? ' (Live)' : ''}`}
      >
        <Card className="relative overflow-hidden bg-card border border-border shadow-lg hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group-hover:border-primary/20 rounded-xl">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
          
          <CardContent className="p-4 sm:p-5 lg:p-6 relative">
            <div className="space-y-4 sm:space-y-5">
              {/* Header with avatar and name */}
              <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-5">
                <div className="relative flex-shrink-0">
                  {result.avatarUrl ? (
                    <div className="relative group/avatar">
                      <Image
                        src={result.avatarUrl}
                        alt={result.displayName}
                        width={48}
                        height={48}
                        className="rounded-full w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 ring-2 sm:ring-3 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500 shadow-lg group-hover:shadow-xl"
                        sizes="(max-width: 640px) 48px, (max-width: 1024px) 64px, 80px"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                      />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 rounded-full border-2 border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary/30 to-primary/15 rounded-full flex items-center justify-center ring-2 sm:ring-3 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500 shadow-lg group-hover:shadow-xl">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-primary/70" />
                    </div>
                  )}
                  
                  {/* Live indicator with enhanced animation */}
                  {result.isLive && (
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-red-500 rounded-full border-2 sm:border-3 border-background animate-pulse shadow-xl shadow-red-500/50">
                      <div className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
                      <div className="absolute inset-1 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg lg:text-xl text-foreground group-hover:text-primary transition-colors duration-300 truncate leading-tight">
                    {result.displayName}
                  </h3>
                  {result.isLive && (
                    <div className="mt-1">
                      <Badge variant="destructive" className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 font-bold shadow-lg shadow-red-500/25 animate-pulse bg-red-500/90 hover:bg-red-500 rounded-full">
                        🔴 <span className="hidden sm:inline ml-1">LIVE NOW</span>
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats and Button Row with enhanced styling */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center">
                  <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-lg border border-border">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground text-sm">
                      {formatNumber(result.followerCount || 0)} followers
                    </span>
                  </div>
                </div>
                
                <div className="w-full">
                  <Button 
                    asChild 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border-0 px-4 py-2 rounded-lg text-sm w-full"
                  >
                    <span>View Channel</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Discover Content</h1>
            <p id="search-description" className="text-sm sm:text-base text-muted-foreground">
              Find your favorite streamers and videos
            </p>
          </div>

          {/* Search Bar */}
          <Card className="shadow-2xl border border-border/50 bg-gradient-to-r from-card/90 via-card/80 to-card/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500 rounded-xl">
            <CardContent className="p-4 sm:p-6 lg:p-7">
              <form onSubmit={handleSearch} className="space-y-4 sm:space-y-5">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
                  <Input
                    type="text"
                    placeholder="Search for channels, videos, or topics..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-lg bg-background/60 border-2 border-primary/20 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all duration-300 rounded-xl sm:rounded-2xl shadow-inner"
                    aria-label="Search for content"
                    aria-describedby="search-description"
                    role="searchbox"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  )}
                  {showSuggestions && suggestions.length > 0 && (
                    <div 
                      className="absolute top-full left-0 right-0 mt-2 sm:mt-3 bg-background/95 backdrop-blur-xl border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto"
                      role="listbox"
                      aria-label="Search suggestions"
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-3 sm:px-5 py-3 sm:py-4 hover:bg-primary/10 transition-all duration-300 text-xs sm:text-sm font-semibold first:rounded-t-xl sm:first:rounded-t-2xl last:rounded-b-xl sm:last:rounded-b-2xl flex items-center space-x-3 sm:space-x-4 hover:scale-[1.01]"
                          role="option"
                          aria-label={`Search for ${suggestion}`}
                        >
                          <Search className="h-3 w-3 sm:h-4 sm:w-4 text-primary/70" />
                          <span className="text-foreground/90 truncate">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Mobile Filters Toggle */}
                <div className="flex sm:hidden items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center space-x-2 bg-background/50 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                  >
                    <Filter className="h-3 w-3" />
                    <span className="text-xs">Filters</span>
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {searchResults && `${allResults.length} results`}
                  </div>
                </div>

                {/* Desktop Filters */}
                <div className="hidden sm:flex flex-col sm:flex-row gap-4">
                  <Tabs value={searchType} onValueChange={handleTypeChange} className="flex-1">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all" className="flex items-center space-x-2 text-xs sm:text-sm">
                        <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>All</span>
                      </TabsTrigger>
                      <TabsTrigger value="vods" className="flex items-center space-x-2 text-xs sm:text-sm">
                        <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Videos</span>
                      </TabsTrigger>
                      <TabsTrigger value="users" className="flex items-center space-x-2 text-xs sm:text-sm">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Channels</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full sm:w-48 h-10">
                      <div className="flex items-center space-x-2">
                        {getSortIcon(sortBy)}
                        <span className="text-xs sm:text-sm">Sort by</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4" />
                          <span>Relevance</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="date">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>Date</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="popularity">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>Popularity</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile Filters Panel */}
                {showMobileFilters && (
                  <div className="sm:hidden space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50 backdrop-blur-sm">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground/90">Content Type</label>
                      <Tabs value={searchType} onValueChange={handleTypeChange}>
                        <TabsList className="grid w-full grid-cols-3 bg-background/50">
                          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
                          <TabsTrigger value="vods" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Videos</TabsTrigger>
                          <TabsTrigger value="users" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Channels</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground/90">Sort by</label>
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-full bg-background/50 border-primary/20 focus:border-primary/50">
                          <div className="flex items-center space-x-2">
                            {getSortIcon(sortBy)}
                            <span className="text-sm">Sort by</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">
                            <div className="flex items-center space-x-2">
                              <Star className="h-4 w-4" />
                              <span>Relevance</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="date">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Date</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="popularity">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>Popularity</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          {searchQuery && (
            <div className="space-y-4 sm:space-y-6">
              {/* Results Header */}
              {searchResults && (
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {searchResults.pagination.total} results for "{searchQuery}"
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Showing {allResults.length} of {searchResults.pagination.total}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && allResults.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-sm sm:text-base text-muted-foreground">Searching...</p>
                  </CardContent>
                </Card>
              )}

              {/* Results Grid */}
              {allResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 xl:gap-8">
                  {allResults.map(renderResult)}
                </div>
              )}

              {/* No Results */}
              {!isLoading && allResults.length === 0 && searchQuery && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                      Try searching for something else or check your spelling
                    </p>
                    <Button onClick={clearSearch} variant="outline" size="sm">
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Load More Button */}
              {hasMore && allResults.length > 0 && (
                <div className="flex justify-center py-6 sm:py-8">
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                      <span className="text-sm sm:text-base">Loading more...</span>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => loadMore()} 
                      variant="outline" 
                      className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:from-primary/20 hover:to-primary/10 text-primary font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Start exploring</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Search for channels, videos, or topics to discover new content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="space-y-4 sm:space-y-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Browse Content</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Discover new streamers and content creators
              </p>
            </div>
            <Card>
              <CardContent className="text-center py-12">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}