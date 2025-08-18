import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { APIResponse } from "@/types/apiResponse";

interface UploadResponse {
  key: string;
  url: string;
  headers: Record<string, string>;
  maxSize: number;
  expiresIn: number;
  type: string;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState<{
    avatar: boolean;
    banner: boolean;
  }>({
    avatar: false,
    banner: false,
  });

  const uploadFile = useCallback(
    async (
      file: File,
      type: "avatar" | "banner",
      onSuccess: (key: string) => void
    ) => {
      try {
        setUploading((prev) => ({ ...prev, [type]: true }));

        // Validate file
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxSize = type === "avatar" ? 10 * 1024 * 1024 : 25 * 1024 * 1024; // 10MB for avatar, 25MB for banner

        if (!validTypes.includes(file.type)) {
          toast.error("Invalid file type", {
            description: "Only JPEG, PNG, and WebP images are allowed",
          });
          return;
        }

        if (file.size > maxSize) {
          const maxSizeMB = maxSize / (1024 * 1024);
          toast.error("File too large", {
            description: `File size must be less than ${maxSizeMB}MB`,
          });
          return;
        }

        // Get signed URL
        const signedUrlResponse = await axios.post<APIResponse<UploadResponse>>(
          "/api/upload/signed-url",
          {
            type,
            contentType: file.type,
          }
        );

        if (
          !signedUrlResponse.data.success ||
          !signedUrlResponse.data.payload
        ) {
          toast.error("Upload failed", {
            description:
              signedUrlResponse.data.message || "Failed to get upload URL",
          });
          return;
        }

        const { url, key, headers } = signedUrlResponse.data.payload;

        // Upload file to S3
        await axios.put(url, file, { headers });

        toast.success("Upload successful", {
          description: `${
            type === "avatar" ? "Profile picture" : "Banner"
          } updated successfully`,
        });
        onSuccess(key);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.message || err.message;
          toast.error("Upload failed", {
            description: errorMessage,
          });
        } else {
          const message =
            err instanceof Error ? err.message : `Failed to upload ${type}`;
          toast.error("Upload failed", {
            description: message,
          });
        }
      } finally {
        setUploading((prev) => ({ ...prev, [type]: false }));
      }
    },
    []
  );

  const triggerFileInput = useCallback(
    (
      type: "avatar" | "banner",
      onFileSelected: (file: File, type: "avatar" | "banner") => void
    ) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          onFileSelected(file, type);
        }
      };
      input.click();
    },
    []
  );

  return {
    uploading,
    uploadFile,
    triggerFileInput,
  };
}
