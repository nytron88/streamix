import { useState, useCallback, useEffect } from "react";
import axios from "axios";
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
  onSaveSuccess: (data: ChannelPayload) => void,
  onError: (error: string) => void
) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    displayName: "",
    bio: "",
    category: "",
    slug: "",
  });
  const [pendingUploads, setPendingUploads] = useState<PendingUploads>({});

  const initializeForm = useCallback((data: ChannelPayload) => {
    setEditForm({
      displayName: data.channel.displayName || "",
      bio: data.channel.bio || "",
      category: data.channel.category || "",
      slug: data.channel.slug || "",
    });
  }, []);

  // Initialize form when channel data changes
  useEffect(() => {
    if (channelData) {
      initializeForm(channelData);
    }
  }, [channelData, initializeForm]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values
      if (channelData) {
        initializeForm(channelData);
      }
      // Clear pending uploads
      setPendingUploads({});
      onError(""); // Clear any existing errors
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = useCallback((field: keyof EditForm, value: string) => {
    // Auto-convert slug to lowercase and remove invalid characters
    if (field === 'slug') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const addPendingUpload = useCallback((type: 'avatar' | 'banner', s3Key: string) => {
    setPendingUploads(prev => ({ ...prev, [`${type}S3Key`]: s3Key }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      onError(""); // Clear any existing errors

      // Basic validation - match the schema requirements
      if (editForm.slug && !/^[a-z0-9-]+$/.test(editForm.slug)) {
        onError("Channel URL can only contain lowercase letters, numbers, and hyphens");
        return;
      }

      const response = await axios.patch<APIResponse<ChannelPayload>>("/api/channel", {
        ...editForm,
        ...pendingUploads,
      });
      const { data } = response;

      if (data.success && data.payload) {
        onSaveSuccess(data.payload);
        setIsEditing(false);
        setPendingUploads({}); // Clear pending uploads
        console.log("Profile updated successfully!");
      } else {
        onError(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        onError(`Update failed: ${errorMessage}`);
      } else {
        onError("Network error while updating profile");
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    isEditing,
    saving,
    editForm,
    pendingUploads,
    handleEditToggle,
    handleInputChange,
    handleSave,
    addPendingUpload,
  };
}
