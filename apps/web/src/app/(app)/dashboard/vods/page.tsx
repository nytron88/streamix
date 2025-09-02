"use client";

import { useState } from "react";
import { useVods } from "@/hooks/useVods";
import { VodList } from "@/components/dashboard/vods/VodList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Eye, Clock, TrendingUp } from "lucide-react";

export default function VodsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"PUBLIC" | "SUB_ONLY" | "all">("all");
  const [search, setSearch] = useState("");

  const { vods, pagination, isLoading, error, refresh } = useVods({
    page,
    limit: 12,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRefresh = () => {
    refresh();
  };

  // Calculate stats (these are per-page stats, not total stats)
  const totalVods = pagination?.total || 0;
  const publicVods = vods.filter(vod => vod.visibility === "PUBLIC").length;
  const totalViews = vods.reduce((sum, vod) => sum + vod.viewCount, 0);
  const totalDuration = vods.reduce((sum, vod) => sum + (vod.durationS || 0), 0);

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
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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
        <div>
          <h1 className="text-3xl font-bold">VOD Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your recorded livestreams and video content
          </p>
        </div>

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
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
              </div>
              <p className="text-xs text-muted-foreground">
                Of recorded content
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
