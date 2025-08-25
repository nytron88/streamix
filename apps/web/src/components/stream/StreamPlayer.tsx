"use client";

import { useEffect, useState } from "react";
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
import { Loader2, WifiOff, Zap } from "lucide-react";

type StreamPlayerProps = {
    token: string;
    serverUrl: string;
    roomName: string;
    viewerName?: string;
    channelDisplayName?: string;
};

function StreamContent({ channelDisplayName }: { channelDisplayName?: string }) {
    const connectionState = useConnectionState();
    const participants = useRemoteParticipants();

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
                        Please wait while we connect you to {channelDisplayName}'s stream...
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
        <div className="relative w-full">
            <Card className="overflow-hidden">
                <div className="relative aspect-video bg-black">
                    <VideoTrack trackRef={videoTrack} className="w-full h-full object-contain" />

                    {/* LIVE badge */}
                    <div className="absolute top-4 left-4 z-10">
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-500">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                LIVE
                            </div>
                        </Badge>
                    </div>

                    {/* Viewer count */}
                    <div className="absolute top-4 right-4 z-10">
                        <Badge variant="secondary" className="bg-black/50 text-white border-none">
                            {participants.length + 1} viewer{participants.length !== 0 ? "s" : ""}
                        </Badge>
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-4 left-4 z-10">
                        <div className="bg-black/70 rounded-lg px-3 py-2 text-white">
                            <p className="text-sm font-medium">{channelDisplayName || "Unknown Streamer"}</p>
                            <p className="text-xs text-gray-300">LiveKit</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Render audio tracks */}
            {audioTracks.map((track) => (
                <AudioTrack
                    key={track.publication?.trackSid ?? track.participant.identity}
                    trackRef={track}
                    volume={1.0}
                />
            ))}
        </div>
    );
}

export function StreamPlayer({
    token,
    serverUrl,
    roomName,
    viewerName,
    channelDisplayName,
}: StreamPlayerProps) {
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
            connect
            audio={false}
            video={false}
            screen={false}
            options={{
                adaptiveStream: true,
                dynacast: true,
                publishDefaults: { stopMicTrackOnMute: true },
            }}
        >
            <StreamContent channelDisplayName={channelDisplayName} />
        </LiveKitRoom>
    );
}
