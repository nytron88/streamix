"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    LiveKitRoom,
    VideoTrack,
    AudioTrack,
    useConnectionState,
    useRemoteParticipants,
    useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState } from "livekit-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Loader2,
    WifiOff,
    Zap,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Users2
} from "lucide-react";
import { StreamChat } from "./StreamChat";

type StreamPlayerProps = {
    token: string;
    serverUrl: string;
    roomName: string;
    viewerName?: string;
    channelDisplayName?: string;
    chatSettings?: {
        isChatEnabled: boolean;
        isChatDelayed: boolean;
        isChatFollowersOnly: boolean;
    };
    ownerMode?: boolean;
};

type ControlBarProps = {
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    participantCount: number;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    onFullscreenToggle: () => void;
};

function ControlBar({
    volume,
    isMuted,
    isFullscreen,
    participantCount,
    onVolumeChange,
    onMuteToggle,
    onFullscreenToggle,
}: ControlBarProps) {

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <div className="flex items-center justify-between">
                {/* Left side - Audio controls */}
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onMuteToggle}
                            className="text-white hover:bg-white/20 h-10 w-10 md:h-8 md:w-8 p-0 touch-manipulation"
                        >
                            {isMuted ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>

                        <div className="flex items-center gap-2 ml-2">
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                onValueChange={(value) => onVolumeChange(value[0])}
                                max={100}
                                step={1}
                                className="w-20 md:w-24"
                            />
                            <span className="text-xs text-white min-w-[2rem]">
                                {isMuted ? '0%' : `${volume}%`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Center - Stream info */}
                <div className="flex items-center gap-2 text-white text-sm">
                    <Users2 className="h-4 w-4" />
                    <span>{participantCount} viewer{participantCount !== 1 ? 's' : ''}</span>
                </div>

                {/* Right side - Fullscreen */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onFullscreenToggle}
                        className="text-white hover:bg-white/20 h-10 w-10 md:h-8 md:w-8 p-0 touch-manipulation"
                    >
                        {isFullscreen ? (
                            <Minimize className="h-4 w-4" />
                        ) : (
                            <Maximize className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StreamContent({ channelDisplayName }: { channelDisplayName?: string }) {
    const connectionState = useConnectionState();
    const participants = useRemoteParticipants();
    const containerRef = useRef<HTMLDivElement>(null);

    // Audio and stream state
    const [volume, setVolume] = useState(75);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);


    // Load settings from localStorage on mount
    useEffect(() => {
        const savedVolume = localStorage.getItem('streamix-volume');
        const savedMuted = localStorage.getItem('streamix-muted');

        if (savedVolume) setVolume(parseInt(savedVolume));
        if (savedMuted) setIsMuted(savedMuted === 'true');
    }, []);

    // Get video and audio tracks
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
        onlySubscribed: false,
    });
    const videoTrack = tracks.find((track) =>
        track.publication &&
        (track.source === Track.Source.Camera || track.source === Track.Source.ScreenShare)
    );

    const audioTracks = useTracks([Track.Source.Microphone], {
        onlySubscribed: false,
    });

    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (connectionState === ConnectionState.Connected) setIsLoading(false);
    }, [connectionState]);

    // Handle mouse movement for control visibility
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeout) {
            clearTimeout(controlsTimeout);
        }
        const timeout = setTimeout(() => {
            setShowControls(false);
        }, 3000);
        setControlsTimeout(timeout);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (controlsTimeout) {
                clearTimeout(controlsTimeout);
            }
        };
    }, [controlsTimeout]);

    // Volume and mute handlers
    const handleVolumeChange = useCallback((newVolume: number) => {
        setVolume(newVolume);
        localStorage.setItem('streamix-volume', newVolume.toString());
        if (newVolume === 0) {
            setIsMuted(true);
            localStorage.setItem('streamix-muted', 'true');
        } else if (isMuted) {
            setIsMuted(false);
            localStorage.setItem('streamix-muted', 'false');
        }
    }, [isMuted]);

    const handleMuteToggle = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        localStorage.setItem('streamix-muted', newMuted.toString());
    }, [isMuted]);

    // Fullscreen handlers
    const handleFullscreenToggle = useCallback(() => {
        if (!containerRef.current) return;

        if (!isFullscreen) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, [isFullscreen]);



    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Prevent shortcuts when typing in inputs
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    handleMuteToggle();
                    break;
                case 'KeyF':
                    event.preventDefault();
                    handleFullscreenToggle();
                    break;
                case 'KeyM':
                    event.preventDefault();
                    handleMuteToggle();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    handleVolumeChange(Math.min(100, volume + 10));
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 10));
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    handleVolumeChange(Math.max(0, volume - 5));
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    handleVolumeChange(Math.min(100, volume + 5));
                    break;
                default:
                    break;
            }
        };

        if (isFullscreen || containerRef.current?.contains(document.activeElement)) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [volume, isMuted, isFullscreen, handleMuteToggle, handleVolumeChange, handleFullscreenToggle]);

    if (connectionState === ConnectionState.Disconnected) {
        return (
            <Card className="w-full aspect-video flex items-center justify-center bg-muted">
                <CardContent className="text-center p-6">
                    <WifiOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Connection Lost</h3>
                    <p className="text-muted-foreground">
                        Unable to connect to the stream. Please try refreshing the page.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (connectionState === ConnectionState.Connecting || isLoading) {
        return (
            <Card className="w-full aspect-video flex items-center justify-center bg-muted">
                <CardContent className="text-center p-6">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Connecting to Stream</h3>
                    <p className="text-muted-foreground">
                        Please wait while we connect you to {channelDisplayName}&apos;s stream...
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!videoTrack) {
        return (
            <Card className="w-full aspect-video flex items-center justify-center bg-muted">
                <CardContent className="text-center p-6">
                    <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Stream Unavailable</h3>
                    <p className="text-muted-foreground">
                        {channelDisplayName} is not currently streaming video.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''} focus:outline-none`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
            onClick={() => containerRef.current?.focus()}
            tabIndex={0}
        >
            <Card className={`overflow-hidden ${isFullscreen ? 'h-full border-none rounded-none' : ''}`}>
                <div className={`relative bg-black ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
                    <VideoTrack
                        trackRef={videoTrack}
                        className="w-full h-full object-contain"
                    />

                    {/* LIVE badge */}
                    <div className={`absolute top-4 left-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-500">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                LIVE
                            </div>
                        </Badge>
                    </div>



                    {/* Stream info overlay */}
                    <div className={`absolute bottom-20 left-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="bg-black/80 rounded-lg px-4 py-3 text-white max-w-xs">
                            <p className="text-base font-semibold">{channelDisplayName || "Unknown Streamer"}</p>
                            <p className="text-sm text-gray-300">Live Stream</p>
                        </div>
                    </div>

                    {/* Keyboard shortcuts info */}
                    <div className={`absolute top-16 right-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="bg-black/70 rounded-lg px-3 py-2 text-white text-xs space-y-1">
                            <p className="font-medium">Shortcuts:</p>
                            <p>Space/M: Mute • F: Fullscreen</p>
                            <p>↑↓: Volume ±10 • ←→: Volume ±5</p>
                        </div>
                    </div>

                    {/* Enhanced Control Bar */}
                    <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                        <ControlBar
                            volume={volume}
                            isMuted={isMuted}
                            isFullscreen={isFullscreen}
                            participantCount={participants.length + 1}
                            onVolumeChange={handleVolumeChange}
                            onMuteToggle={handleMuteToggle}
                            onFullscreenToggle={handleFullscreenToggle}
                        />
                    </div>
                </div>
            </Card>

            {/* Render audio tracks with volume control */}
            {audioTracks.map((track) => (
                <AudioTrack
                    key={track.publication?.trackSid ?? track.participant.identity}
                    trackRef={track}
                    volume={isMuted ? 0 : volume / 100}
                />
            ))}
        </div>
    );
}

export function StreamPlayer({
    token,
    serverUrl,
    channelDisplayName,
    chatSettings,
    ownerMode = false,
}: Omit<StreamPlayerProps, 'roomName' | 'viewerName'>) {
    if (!serverUrl) {
        return (
            <Card className="w-full aspect-video flex items-center justify-center bg-muted">
                <CardContent className="text-center p-6">
                    <WifiOff className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Configuration Error</h3>
                    <p className="text-muted-foreground">LiveKit server URL is not configured.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            audio={false}  // Disable audio capture for viewers
            video={false}  // Disable video capture for viewers
            screen={false} // Disable screen capture for viewers
            options={{
                adaptiveStream: true,
                dynacast: true,
                // Better streaming experience
                publishDefaults: {
                    stopMicTrackOnMute: true,
                },
            }}
        >
            {ownerMode ? (
                // Owner layout: Stream + Chat with different proportions 
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Stream Player for Owner */}
                    <div className="lg:col-span-2">
                        <StreamContent channelDisplayName={channelDisplayName} />
                    </div>

                    {/* Chat for Owner */}
                    <div className="lg:col-span-1">
                        <div className="h-[500px] lg:h-[600px]">
                            <StreamChat
                                channelDisplayName={channelDisplayName}
                                chatSettings={chatSettings}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                // Viewer layout: Stream + Chat  
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Stream Player */}
                    <div className="lg:col-span-3">
                        <StreamContent channelDisplayName={channelDisplayName} />
                    </div>

                    {/* Chat */}
                    <div className="lg:col-span-1">
                        <div className="h-[500px] lg:h-[600px]">
                            <StreamChat
                                channelDisplayName={channelDisplayName}
                                chatSettings={chatSettings}
                            />
                        </div>
                    </div>
                </div>
            )}
        </LiveKitRoom>
    );
}
