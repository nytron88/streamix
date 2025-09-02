"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Edit, Trash2, Eye, EyeOff, Clock } from "lucide-react";
import { Vod } from "@/types/vod";
import { useVodActions } from "@/hooks/useVodActions";
import { VodEditModal } from "./VodEditModal";
import { formatDuration, formatDate } from "@/lib/utils";

interface VodCardProps {
  vod: Vod;
  onUpdate: () => void;
}

export function VodCard({ vod, onUpdate }: VodCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { deleteVod, isLoading } = useVodActions();

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this VOD? This action cannot be undone.")) {
      const success = await deleteVod(vod.id);
      if (success) {
        onUpdate();
      }
    }
  };

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
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {vod.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getVisibilityBadge(vod.visibility)}
                <span className="text-sm text-muted-foreground">
                  {vod.viewCount} views
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {vod.s3Url && (
                  <DropdownMenuItem asChild>
                    <a href={vod.s3Url} target="_blank" rel="noopener noreferrer">
                      <Play className="h-4 w-4 mr-2" />
                      Watch
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-600"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {vod.durationS && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(vod.durationS)}
                </div>
              )}
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
    </>
  );
}
