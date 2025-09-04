"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    RotateCcw,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface VodPlayerProps {
    vodId: string;
    title: string;
    videoUrl?: string | null;
    className?: string;
}

export function VodPlayer({ vodId, title, videoUrl: propVideoUrl, className }: VodPlayerProps) {
    const [videoUrl, setVideoUrl] = useState<string | null>(propVideoUrl || null);
    const [loading, setLoading] = useState(!propVideoUrl);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch video URL only if not provided as prop
    useEffect(() => {
        if (propVideoUrl) {
            setVideoUrl(propVideoUrl);
            setLoading(false);
            return;
        }

        const fetchVideoUrl = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await axios.get(`/api/vods/${vodId}/public`);
                setVideoUrl(response.data.payload?.s3Url || null);
            } catch (err) {
                console.error('Error fetching video URL:', err);
                if (axios.isAxiosError(err)) {
                    const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch video URL';
                    setError(errorMessage);
                } else {
                    setError(err instanceof Error ? err.message : 'Failed to load video');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchVideoUrl();
    }, [vodId, propVideoUrl]);

    // Video event handlers
    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const handleMute = () => {
        if (videoRef.current) {
            if (isMuted) {
                videoRef.current.volume = volume;
                setIsMuted(false);
            } else {
                videoRef.current.volume = 0;
                setIsMuted(true);
            }
        }
    };

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (!isFullscreen) {
                containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const handleRestart = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            setCurrentTime(0);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current && duration > 0) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const newTime = (clickX / rect.width) * duration;
            handleSeek(newTime);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    const handleVideoClick = () => {
        if (isPlaying) {
            handlePause();
        } else {
            handlePlay();
        }
    };

    // Video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleDurationChange = () => setDuration(video.duration);
        const handlePlayEvent = () => setIsPlaying(true);
        const handlePauseEvent = () => setIsPlaying(false);
        const handleVolumeChangeEvent = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('play', handlePlayEvent);
        video.addEventListener('pause', handlePauseEvent);
        video.addEventListener('volumechange', handleVolumeChangeEvent);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('play', handlePlayEvent);
            video.removeEventListener('pause', handlePauseEvent);
            video.removeEventListener('volumechange', handleVolumeChangeEvent);
        };
    }, [videoUrl]);

    if (loading) {
        return (
            <Card className={cn("aspect-video", className)}>
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading video...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !videoUrl) {
        return (
            <Card className={cn("aspect-video", className)}>
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <p className="text-destructive mb-2">Failed to load video</p>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group bg-black rounded-lg overflow-hidden",
                "hover:shadow-lg transition-shadow duration-200",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                if (isPlaying) {
                    setShowControls(false);
                }
            }}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handleVideoClick}
                poster=""
                preload="metadata"
            />

            {/* Overlay Controls */}
            <div
                className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                    showControls && "opacity-100"
                )}
            >
                {/* Top Controls */}
                <div className="absolute top-4 right-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 cursor-pointer"
                        onClick={handleFullscreen}
                    >
                        <Maximize className="h-4 w-4" />
                    </Button>
                </div>

                {/* Center Play/Pause Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20 rounded-full w-16 h-16 cursor-pointer"
                        onClick={handleVideoClick}
                    >
                        {isPlaying ? (
                            <Pause className="h-8 w-8" />
                        ) : (
                            <Play className="h-8 w-8 ml-1" />
                        )}
                    </Button>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Progress Bar */}
                    <div
                        className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
                        onClick={handleProgressClick}
                    >
                        <div
                            className="h-full bg-white rounded-full transition-all duration-100"
                            style={{
                                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                            }}
                        />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 cursor-pointer"
                                onClick={isPlaying ? handlePause : handlePlay}
                            >
                                {isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 cursor-pointer"
                                onClick={handleRestart}
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 cursor-pointer"
                                    onClick={handleMute}
                                >
                                    {isMuted ? (
                                        <VolumeX className="h-4 w-4" />
                                    ) : (
                                        <Volume2 className="h-4 w-4" />
                                    )}
                                </Button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                    className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <span className="text-white text-sm font-mono">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
