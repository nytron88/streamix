"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Video, Loader2, Play, Eye, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";
import { SearchResponse, VodSearchResponse, UserSearchResponse } from "@/types/search";

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchType, setSearchType] = useState<"all" | "vods" | "users">("all");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [vodResults, setVodResults] = useState<VodSearchResponse | null>(null);
  const [userResults, setUserResults] = useState<UserSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Perform search
  const performSearch = useCallback(async (query: string, type: "all" | "vods" | "users" = "all", page: number = 1) => {
    if (!query.trim()) {
      setSearchResults(null);
      setVodResults(null);
      setUserResults(null);
      return;
    }

    setIsLoading(true);
    try {
      if (type === "all") {
        const response = await axios.get<APIResponse<SearchResponse>>(
          `/api/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`
        );
        if (response.data.success && response.data.payload) {
          setSearchResults(response.data.payload);
        }
      } else if (type === "vods") {
        const response = await axios.get<APIResponse<VodSearchResponse>>(
          `/api/search/vods?q=${encodeURIComponent(query)}&page=${page}&limit=20`
        );
        if (response.data.success && response.data.payload) {
          setVodResults(response.data.payload);
        }
      } else if (type === "users") {
        const response = await axios.get<APIResponse<UserSearchResponse>>(
          `/api/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=20`
        );
        if (response.data.success && response.data.payload) {
          setUserResults(response.data.payload);
        }
      }
    } catch (error) {
      // Silently handle search errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search on mount and when params change
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query, searchType, currentPage);
    }
  }, [searchParams, searchType, currentPage, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setCurrentPage(1);
    }
  };

  const handleTypeChange = (type: "all" | "vods" | "users") => {
    setSearchType(type);
    setCurrentPage(1);
    if (searchQuery.trim()) {
      performSearch(searchQuery, type, 1);
    }
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
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Browse Content</h1>
          <p className="text-muted-foreground">
            Discover new streamers and content creators
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search channels, VODs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin" />
              )}
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <Tabs value={searchType} onValueChange={(value) => handleTypeChange(value as "all" | "vods" | "users")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="vods">VODs</TabsTrigger>
              <TabsTrigger value="users">Channels</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {searchResults ? (
                <>
                  {searchResults.results.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {searchResults.results.map((result) => (
                        <Card key={result.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            {result.type === "vod" ? (
                              <Link href={`/vod/${result.id}`}>
                                <div className="relative aspect-video bg-muted">
                                  {result.thumbnailUrl ? (
                                    <Image
                                      src={result.thumbnailUrl}
                                      alt={result.title}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex items-center justify-center h-full">
                                      <Video className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                  )}
                                  <Badge className="absolute top-2 right-2" variant="secondary">
                                    {result.visibility}
                                  </Badge>
                                </div>
                                <div className="p-4">
                                  <h3 className="font-semibold line-clamp-2 mb-2">{result.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{result.displayName}</span>
                                    <span>•</span>
                                    <span>{formatDate(result.publishedAt!)}</span>
                                  </div>
                                </div>
                              </Link>
                            ) : (
                              <Link href={`/channel/${result.slug}`}>
                                <div className="p-4">
                                  <div className="flex items-center gap-3">
                                    {result.avatarUrl ? (
                                      <Image
                                        src={result.avatarUrl}
                                        alt={result.title}
                                        width={48}
                                        height={48}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                        <UsersIcon className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold truncate">{result.title}</h3>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{formatNumber(result.followerCount)} followers</span>
                                        {result.isLive && (
                                          <>
                                            <span>•</span>
                                            <Badge variant="destructive" className="text-xs">Live</Badge>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords or check your spelling.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Searching...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="vods" className="space-y-4">
              {vodResults ? (
                <>
                  {vodResults.vods.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {vodResults.vods.map((vod) => (
                        <Card key={vod.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <Link href={`/vod/${vod.id}`}>
                            <div className="relative aspect-video bg-muted">
                              {vod.thumbnailUrl ? (
                                <Image
                                  src={vod.thumbnailUrl}
                                  alt={vod.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Video className="h-12 w-12 text-muted-foreground" />
                                </div>
                              )}
                              <Badge className="absolute top-2 right-2" variant="secondary">
                                {vod.visibility}
                              </Badge>
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold line-clamp-2 mb-2">{vod.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{vod.channel.displayName}</span>
                                <span>•</span>
                                <span>{formatDate(vod.publishedAt)}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{formatNumber(vod.viewCount)}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No VODs Found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords or check your spelling.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Searching VODs...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              {userResults ? (
                <>
                  {userResults.users.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {userResults.users.map((user) => (
                        <Card key={user.id} className="hover:shadow-lg transition-shadow">
                          <Link href={`/channel/${user.slug}`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {user.avatarUrl ? (
                                  <Image
                                    src={user.avatarUrl}
                                    alt={user.displayName}
                                    width={48}
                                    height={48}
                                    className="rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                    <UsersIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate">{user.displayName}</h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{formatNumber(user.followerCount)} followers</span>
                                    {user.isLive && (
                                      <>
                                        <span>•</span>
                                        <Badge variant="destructive" className="text-xs">Live</Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Channels Found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords or check your spelling.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
                    <p className="text-muted-foreground">Searching channels...</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State - Show when no search query */}
        {!searchQuery && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Start Searching</h3>
              <p className="text-muted-foreground mb-4">
                Use the search bar above to find channels, VODs, and content creators.
              </p>
              <Link href="/home">
                <Button>Go to Home</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Browse Content</h1>
            <p className="text-muted-foreground">
              Discover new streamers and content creators
            </p>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
