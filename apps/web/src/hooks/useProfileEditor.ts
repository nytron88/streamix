import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { APIResponse } from "@/types/apiResponse";
import { ChannelPayload } from "@/types/channel";

interface EditForm {
  displayName: string;
  bio: string;
  category: string;
  slug: string;
}

interface PendingUploads {
  avatarS3Key?: string;
  bannerS3Key?: string;
}

export function useProfileEditor(
  channelData: ChannelPayload | null,
  onSaveSuccess: (data: ChannelPayload) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    displayName: "",
    bio: "",
    category: "",
    slug: "",
  });
  const [originalForm, setOriginalForm] = useState<EditForm>({
    displayName: "",
    bio: "",
    category: "",
    slug: "",
  });
  const [pendingUploads, setPendingUploads] = useState<PendingUploads>({});

  const initializeForm = useCallback((data: ChannelPayload) => {
    const formData = {
      displayName: data.channel.displayName || "",
      bio: data.channel.bio || "",
      category: data.channel.category || "",
      slug: data.channel.slug || "",
    };
    setEditForm(formData);
    setOriginalForm(formData);
  }, []);

  // Initialize form when channel data changes
  useEffect(() => {
    if (channelData) {
      initializeForm(channelData);
    }
  }, [channelData, initializeForm]);

  const handleEditToggle = async () => {
    if (isEditing) {
      setCanceling(true);
      try {
        // Cleanup any pending uploads from S3
        await cleanupPendingUploads();
        
        // Reset form to original values
        if (channelData) {
          initializeForm(channelData);
        }
        // Clear pending uploads
        setPendingUploads({});
      } finally {
        setCanceling(false);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = useCallback(
    (field: keyof EditForm, value: string) => {
      // Auto-convert slug to lowercase and remove invalid characters
      if (field === "slug") {
        value = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
      }
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addPendingUpload = useCallback(
    (type: "avatar" | "banner", s3Key: string) => {
      setPendingUploads((prev) => ({ ...prev, [`${type}S3Key`]: s3Key }));
    },
    []
  );

  const cleanupPendingUploads = useCallback(async () => {
    const keysToDelete: string[] = [];
    
    if (pendingUploads.avatarS3Key) {
      keysToDelete.push(pendingUploads.avatarS3Key);
    }
    if (pendingUploads.bannerS3Key) {
      keysToDelete.push(pendingUploads.bannerS3Key);
    }

    if (keysToDelete.length > 0) {
      try {
        await axios.delete("/api/cleanup/s3", {
          data: { keys: keysToDelete }
        });
        toast.info("Cancelled changes", {
          description: "Uploaded images have been cleaned up",
        });
      } catch (err) {
        // Don't show error to user, just log it
        console.error("Failed to cleanup pending uploads:", err);
      }
    }
  }, [pendingUploads]);

  // Helper function to detect what has changed
  const getChangedFields = useCallback(() => {
    const changes: Partial<EditForm & PendingUploads> = {};

    // Check form field changes
    Object.keys(editForm).forEach((key) => {
      const field = key as keyof EditForm;
      if (editForm[field] !== originalForm[field]) {
        changes[field] = editForm[field];
      }
    });

    // Add any pending uploads (these are always changes)
    Object.keys(pendingUploads).forEach((key) => {
      const field = key as keyof PendingUploads;
      if (pendingUploads[field]) {
        changes[field] = pendingUploads[field];
      }
    });

    return changes;
  }, [editForm, originalForm, pendingUploads]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Basic validation - match the schema requirements
      if (editForm.slug && !/^[a-z0-9-]+$/.test(editForm.slug)) {
        toast.error("Invalid channel URL", {
          description:
            "Channel URL can only contain lowercase letters, numbers, and hyphens",
        });
        return;
      }

      // Get only the changed fields
      const changes = getChangedFields();

      // Check if there are actually any changes
      if (Object.keys(changes).length === 0) {
        toast.info("No changes detected", {
          description: "Your profile is already up to date",
        });
        setIsEditing(false);
        return;
      }

      const response = await axios.patch<APIResponse<ChannelPayload>>(
        "/api/channel",
        changes
      );
      const { data } = response;

      if (data.success && data.payload) {
        onSaveSuccess(data.payload);
        setIsEditing(false);
        setPendingUploads({}); // Clear pending uploads
        toast.success("Profile updated", {
          description: "Your profile has been updated successfully!",
        });
      } else {
        toast.error("Update failed", {
          description: data.message || "Failed to update profile",
        });
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        toast.error("Update failed", {
          description: errorMessage,
        });
      } else {
        toast.error("Network error", {
          description: "Network error while updating profile",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper to check if there are any changes
  const hasChanges = useCallback(() => {
    return Object.keys(getChangedFields()).length > 0;
  }, [getChangedFields]);

  return {
    isEditing,
    saving,
    canceling,
    editForm,
    pendingUploads,
    hasChanges: hasChanges(),
    handleEditToggle,
    handleInputChange,
    handleSave,
    addPendingUpload,
  };
}
