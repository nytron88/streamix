"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Edit, Trash2, Image, Upload } from "lucide-react";
import { Vod } from "@/types/vod";

import { VodEditModal } from "./VodEditModal";
import { ThumbnailUploadModal } from "./ThumbnailUploadModal";
import { DeleteVodDialog } from "./DeleteVodDialog";
import { VideoPlayer } from "./VideoPlayer";
import { formatDate } from "@/lib/utils";

interface VodCardProps {
  vod: Vod;
  onUpdate: () => void;
}

export function VodCard({ vod, onUpdate }: VodCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "PUBLIC":
        return <Badge variant="default" className="bg-green-100 text-green-800">Public</Badge>;
      case "SUB_ONLY":
        return <Badge variant="secondary">Subscribers Only</Badge>;
      default:
        return <Badge variant="secondary">{visibility}</Badge>;
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted group cursor-pointer" onClick={() => setShowVideoPlayer(true)}>
          {vod.thumbnailUrl ? (
            <img
              src={vod.thumbnailUrl}
              alt={vod.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No thumbnail</p>
              </div>
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-6 w-6 text-black ml-1" />
            </div>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle
                className="text-lg font-semibold leading-tight overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.4',
                  maxHeight: '2.8em'
                }}
                title={vod.title}
              >
                {vod.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getVisibilityBadge(vod.visibility)}
                <span className="text-sm text-muted-foreground">
                  {vod.viewCount} views
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowThumbnailModal(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Thumbnail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowVideoPlayer(true)}>
                    <Play className="h-4 w-4 mr-2" />
                    Watch
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div>
                Created {formatDate(vod.createdAt)}
              </div>
              {vod.publishedAt && (
                <div>
                  Published {formatDate(vod.publishedAt)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <VodEditModal
        vod={vod}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdate={onUpdate}
      />

      <ThumbnailUploadModal
        vodId={vod.id}
        open={showThumbnailModal}
        onOpenChange={setShowThumbnailModal}
        onUploadSuccess={onUpdate}
      />

      <DeleteVodDialog
        vod={vod}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleteSuccess={onUpdate}
      />

      <VideoPlayer
        vodId={vod.id}
        title={vod.title}
        open={showVideoPlayer}
        onOpenChange={setShowVideoPlayer}
      />
    </>
  );
}
