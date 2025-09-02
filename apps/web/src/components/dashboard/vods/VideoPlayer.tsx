"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface VideoPlayerProps {
  vodId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayer({ vodId, title, open, onOpenChange }: VideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getSignedUrl = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`/api/vods/${vodId}/watch`, {
        expiresIn: 3600, // 1 hour
      });

      const { signedUrl } = response.data.payload;
      setSignedUrl(signedUrl);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load video";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [vodId]);

  useEffect(() => {
    if (open && !signedUrl) {
      getSignedUrl();
    }
  }, [open, getSignedUrl, signedUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    setSignedUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold truncate">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white">Loading video...</div>
              </div>
            ) : signedUrl ? (
              <video
                ref={videoRef}
                src={signedUrl}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white">Video not available</div>
              </div>
            )}

            {/* Custom Controls Overlay */}
            {signedUrl && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                {/* Progress Bar */}
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>
            {signedUrl && (
              <Button
                onClick={getSignedUrl}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh URL
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
