import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileBannerAvatar } from "./ProfileBannerAvatar";
import { ProfileDetailsForm } from "./ProfileDetailsForm";
import { ChannelPayload } from "@/types/channel";

interface EditForm {
  displayName: string;
  bio: string;
  category: string;
  slug: string;
}

interface ProfileCardProps {
  channelData: ChannelPayload;
  isEditing: boolean;
  editForm: EditForm;
  uploading: { avatar: boolean; banner: boolean };
  pendingUploads?: { avatarS3Key?: string; bannerS3Key?: string };
  onInputChange: (field: keyof EditForm, value: string) => void;
  onImageClick: (type: 'avatar' | 'banner') => void;
}

export function ProfileCard({
  channelData,
  isEditing,
  editForm,
  uploading,
  pendingUploads,
  onInputChange,
  onImageClick,
}: ProfileCardProps) {
  const { channel, assets } = channelData;

  return (
    <Card>
      <CardContent className="space-y-6 p-8">
        {/* Banner and Avatar Section */}
        <ProfileBannerAvatar
          bannerUrl={assets.bannerUrl}
          avatarUrl={assets.avatarUrl}
          displayName={channel.displayName}
          isEditing={isEditing}
          uploading={uploading}
          pendingUploads={pendingUploads}
          onImageClick={onImageClick}
        />

        <Separator className="my-6" />

        {/* Profile Details Form */}
        <ProfileDetailsForm
          channel={channel}
          isEditing={isEditing}
          editForm={editForm}
          onInputChange={onInputChange}
        />
      </CardContent>
    </Card>
  );
}
