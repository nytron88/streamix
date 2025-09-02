"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vod, VodUpdateData } from "@/types/vod";
import { useVodActions } from "@/hooks/useVodActions";

interface VodEditModalProps {
  vod: Vod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function VodEditModal({ vod, open, onOpenChange, onUpdate }: VodEditModalProps) {
  const [formData, setFormData] = useState<VodUpdateData>({
    title: vod.title,
    visibility: vod.visibility,
  });

  const { updateVod, isLoading } = useVodActions();

  useEffect(() => {
    if (open) {
      setFormData({
        title: vod.title,
        visibility: vod.visibility,
      });
    }
  }, [open, vod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await updateVod(vod.id, formData);
    if (success) {
      onUpdate();
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: keyof VodUpdateData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit VOD</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter VOD title"
              maxLength={100}
              required
            />
          </div>



          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value) => handleInputChange("visibility", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="SUB_ONLY">Subscribers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
