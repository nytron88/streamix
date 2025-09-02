"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface ThumbnailUploadModalProps {
  vodId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function ThumbnailUploadModal({ vodId, open, onOpenChange, onUploadSuccess }: ThumbnailUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Step 1: Get signed URL from our API
      const signedUrlResponse = await axios.post('/api/upload/thumbnail', {
        contentType: file.type,
        vodId: vodId,
      });

      const { uploadUrl, s3Key, requiredHeaders } = signedUrlResponse.data.payload;

      // Step 2: Upload file directly to S3 using signed URL
      const uploadResponse = await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
          ...requiredHeaders,
        },
      });

      if (uploadResponse.status !== 200) {
        throw new Error('Failed to upload to S3');
      }

      // Step 3: Update VOD with thumbnail S3 key
      await axios.post(`/api/vods/${vodId}/thumbnail`, {
        thumbnailS3Key: s3Key,
      });

      toast.success("Thumbnail uploaded successfully");
      onUploadSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to upload thumbnail";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Thumbnail</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Select Image</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                <img
                  src={preview}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Thumbnail
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
