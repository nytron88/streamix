"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Grid, List } from "lucide-react";
import { VodCard } from "./VodCard";
import { Vod } from "@/types/vod";

interface VodListProps {
  vods: Vod[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function VodList({ vods, pagination, onPageChange, onRefresh, isLoading }: VodListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredVods = vods.filter(vod => {
    const matchesSearch = !search || vod.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || vod.visibility === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search VODs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PUBLIC">Public</SelectItem>
              <SelectItem value="SUB_ONLY">Subscribers Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredVods.length} of {pagination.total} VODs
        </p>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* VOD Grid/List */}
      {filteredVods.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search || statusFilter !== "all" 
              ? "No VODs match your filters" 
              : "No VODs found. Start streaming to create your first VOD!"}
          </p>
        </div>
      ) : (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredVods.map((vod) => (
            <VodCard
              key={vod.id}
              vod={vod}
              onUpdate={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
          >
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
