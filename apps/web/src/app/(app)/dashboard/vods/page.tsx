"use client";

import { useState, useEffect, useCallback } from "react";
import { useVods } from "@/hooks/useVods";
import { VodList } from "@/components/dashboard/vods/VodList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Eye, Clock, TrendingUp, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function VodsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"PUBLIC" | "SUB_ONLY" | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input
  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when search changes
      setIsSearching(false);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const { vods, pagination, isLoading, error, refresh } = useVods({
    page,
    limit: 12,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch || undefined,
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // Calculate stats (these are per-page stats, not total stats)
  const totalVods = pagination?.total || 0;
  const publicVods = vods.filter(vod => vod.visibility === "PUBLIC").length;
  const totalViews = vods.reduce((sum, vod) => sum + vod.viewCount, 0);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading VODs</h1>
          <p className="text-muted-foreground mb-4">
            {error.message || "Failed to load your VODs"}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">VOD Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your recorded livestreams and video content
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Upload VOD
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isSearching ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                <Input
                  placeholder="Search VODs by title..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <Select value={statusFilter} onValueChange={(value: "PUBLIC" | "SUB_ONLY" | "all") => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All VODs</SelectItem>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="SUB_ONLY">Subscribers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total VODs</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVods}</div>
              <p className="text-xs text-muted-foreground">
                {publicVods} public
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all VODs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscriber VODs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vods.filter(vod => vod.visibility === "SUB_ONLY").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Subscriber-only content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalVods > 0 ? Math.round(totalViews / totalVods) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Per VOD
              </p>
            </CardContent>
          </Card>
        </div>

        {/* VOD List */}
        <Card>
          <CardHeader>
            <CardTitle>Your VODs</CardTitle>
          </CardHeader>
          <CardContent>
            <VodList
              vods={vods}
              pagination={pagination || {
                page: 1,
                limit: 12,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              }}
              onPageChange={handlePageChange}
              onRefresh={handleRefresh}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
