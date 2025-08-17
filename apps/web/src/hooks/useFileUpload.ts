import { useState, useCallback } from "react";
import axios from "axios";
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
      onSuccess: (key: string) => void,
      onError: (error: string) => void
    ) => {
      try {
        setUploading((prev) => ({ ...prev, [type]: true }));

        // Validate file
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxSize = type === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for avatar, 5MB for banner

        if (!validTypes.includes(file.type)) {
          throw new Error("Only JPEG, PNG, and WebP images are allowed");
        }

        if (file.size > maxSize) {
          const maxSizeMB = maxSize / (1024 * 1024);
          throw new Error(`File size must be less than ${maxSizeMB}MB`);
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
          throw new Error(
            signedUrlResponse.data.message || "Failed to get upload URL"
          );
        }

        const { url, key, headers } = signedUrlResponse.data.payload;

        // Upload file to S3
        await axios.put(url, file, { headers });

        console.log(`${type} uploaded successfully:`, key);
        onSuccess(key);
      } catch (err) {
        console.error(`Error uploading ${type}:`, err);
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.message || err.message;
          onError(`Upload failed: ${errorMessage}`);
        } else {
          onError(
            err instanceof Error ? err.message : `Failed to upload ${type}`
          );
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
