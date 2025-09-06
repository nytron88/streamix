"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveStreamCard } from "@/components/stream/LiveStreamCard";
import { LiveStream, LiveStreamsResponse } from "@/types/stream";
import { APIResponse } from "@/types/apiResponse";
import axios from "axios";
import { RefreshCw, Users, Play, TrendingUp } from "lucide-react";

export default function HomePage() {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchLiveStreams = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setError(null);
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await axios.get<APIResponse<LiveStreamsResponse>>(
        `/api/streams/live?page=${page}&limit=12`
      );

      if (response.data.success && response.data.payload) {
        const data = response.data.payload;
        
        if (append) {
          setLiveStreams(prev => [...prev, ...data.streams]);
        } else {
          setLiveStreams(data.streams);
        }
        
        setCurrentPage(page);
        setHasMore(data.pagination.hasNext);
      }
    } catch (err) {
      console.error("Failed to fetch live streams:", err);
      setError("Failed to load live streams");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLiveStreams(1, false);
  }, [fetchLiveStreams]);


  useEffect(() => {
    fetchLiveStreams(1, false);
  }, [fetchLiveStreams]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveStreams(1, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLiveStreams]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchLiveStreams(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, currentPage, fetchLiveStreams]);

  if (loading && liveStreams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                  <div className="space-y-1 flex-1">
                    <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Live Now</h1>
          <p className="text-muted-foreground">
            {liveStreams.length > 0 
              ? `${liveStreams.length} stream${liveStreams.length === 1 ? '' : 's'} currently live`
              : "No streams are currently live"
            }
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {liveStreams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Live Streams</p>
                  <p className="text-2xl font-bold">{liveStreams.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total Viewers</p>
                  <p className="text-2xl font-bold">
                    {liveStreams.reduce((acc, stream) => acc + Math.floor(Math.random() * 1000) + 1, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold">
                    {new Set(liveStreams.map(s => s.channel.category).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Streams Grid */}
      {liveStreams.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {liveStreams.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={observerRef} className="flex justify-center py-8">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading more streams...
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Scroll down to load more
                </div>
              )}
            </div>
          )}
        </div>
      ) : !loading && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Live Streams</h3>
            <p className="text-muted-foreground mb-4">
              There are no streams currently live. Check back later or start your own stream!
            </p>
            <Button asChild>
              <a href="/browse">Browse All Content</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
