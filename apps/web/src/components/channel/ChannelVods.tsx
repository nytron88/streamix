"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Eye, Lock } from "lucide-react";
import Link from "next/link";
import axios from "axios";

interface Vod {
    id: string;
    title: string;
    visibility: "PUBLIC" | "SUB_ONLY";
    s3Url: string | null;
    thumbnailUrl: string | null;
    publishedAt: string;
    createdAt: string;
}

interface ChannelVodsProps {
    channelSlug: string;
    isSubscribed?: boolean;
}

export function ChannelVods({ channelSlug, isSubscribed = false }: ChannelVodsProps) {
    const [vods, setVods] = useState<Vod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);

    const fetchVods = async (pageNum: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const visibility = isSubscribed ? undefined : "PUBLIC";
            const response = await axios.get(`/api/channel/${channelSlug}/vods`, {
                params: {
                    page: pageNum,
                    limit: 12,
                    ...(visibility && { visibility }),
                },
            });

            const { vods: newVods, pagination } = response.data.payload;

            if (pageNum === 1) {
                setVods(newVods);
            } else {
                setVods(prev => [...prev, ...newVods]);
            }

            setHasNext(pagination.hasNext);
            setPage(pageNum);
        } catch (err) {
            console.error("Error fetching VODs:", err);
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.error || err.message || "Failed to fetch VODs";
                setError(errorMessage);
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch VODs");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVods(1);
    }, [channelSlug, isSubscribed]);

    const loadMore = () => {
        if (!loading && hasNext) {
            fetchVods(page + 1);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    if (loading && vods.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Videos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="aspect-video bg-muted rounded-lg mb-2" />
                                <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                                <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Videos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Button onClick={() => fetchVods(1)} variant="outline" className="cursor-pointer">
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (vods.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Videos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No videos available yet</p>
                        <p className="text-sm text-muted-foreground">
                            Check back later for new content!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Videos ({vods.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {vods.map((vod) => (
                        <Link key={vod.id} href={`/vod/${vod.id}`} className="group">
                            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                                {vod.thumbnailUrl ? (
                                    <img
                                        src={vod.thumbnailUrl}
                                        alt={vod.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <Play className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}

                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Play className="h-8 w-8 text-white" />
                                    </div>
                                </div>

                                {/* Visibility badge */}
                                {vod.visibility === "SUB_ONLY" && (
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            Sub Only
                                        </Badge>
                                    </div>
                                )}

                                {/* Duration placeholder - you might want to add actual duration */}
                                <div className="absolute bottom-2 right-2">
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Live
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                    {vod.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {formatDate(vod.publishedAt)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                {hasNext && (
                    <div className="flex justify-center mt-6">
                        <Button
                            onClick={loadMore}
                            disabled={loading}
                            variant="outline"
                            className="cursor-pointer"
                        >
                            {loading ? "Loading..." : "Load More"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
