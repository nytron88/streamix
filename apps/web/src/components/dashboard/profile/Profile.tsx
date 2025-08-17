"use client";

import { useChannelData } from "@/hooks/useChannelData";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  ProfileHeader,
  ProfileCard,
  ProfileLoadingState,
  ProfileErrorState,
} from "./index";

export function Profile() {
  const { channelData, setChannelData, loading, error, setError, refetch } = useChannelData();

  const {
    isEditing,
    saving,
    editForm,
    handleEditToggle,
    handleInputChange,
    handleSave,
    addPendingUpload,
  } = useProfileEditor(channelData, setChannelData, setError);

  const { uploading, uploadFile, triggerFileInput } = useFileUpload();

  const handleImageClick = (type: 'avatar' | 'banner') => {
    if (!isEditing) return;

    triggerFileInput(type, (file, uploadType) => {
      uploadFile(
        file,
        uploadType,
        (s3Key) => addPendingUpload(uploadType, s3Key),
        (errorMessage) => setError(errorMessage)
      );
    });
  };

  if (loading) {
    return <ProfileLoadingState />;
  }

  if (error) {
    return <ProfileErrorState error={error} onRetry={refetch} />;
  }

  if (!channelData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        isEditing={isEditing}
        saving={saving}
        onEditToggle={handleEditToggle}
        onSave={handleSave}
      />

      <ProfileCard
        channelData={channelData}
        isEditing={isEditing}
        editForm={editForm}
        uploading={uploading}
        onInputChange={handleInputChange}
        onImageClick={handleImageClick}
      />
    </div>
  );
}
