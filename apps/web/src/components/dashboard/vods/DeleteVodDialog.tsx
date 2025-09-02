"use client";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVodActions } from "@/hooks/useVodActions";
import { Vod } from "@/types/vod";

interface DeleteVodDialogProps {
  vod: Vod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
}

export function DeleteVodDialog({ vod, open, onOpenChange, onDeleteSuccess }: DeleteVodDialogProps) {
  const { deleteVod, isLoading } = useVodActions();

  const handleDelete = async () => {
    if (!vod) return;

    const success = await deleteVod(vod.id);
    if (success) {
      onDeleteSuccess();
      onOpenChange(false);
    }
  };

  if (!vod) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete VOD</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{vod.title}&quot;? This action cannot be undone.
            The video file and all associated data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? "Deleting..." : "Delete VOD"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
