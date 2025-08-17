import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface ProfileBannerAvatarProps {
  bannerUrl: string;
  avatarUrl: string;
  displayName: string | null;
  isEditing: boolean;
  uploading: { avatar: boolean; banner: boolean };
  onImageClick: (type: 'avatar' | 'banner') => void;
}

export function ProfileBannerAvatar({
  bannerUrl,
  avatarUrl,
  displayName,
  isEditing,
  uploading,
  onImageClick,
}: ProfileBannerAvatarProps) {
  const { user } = useUser();

  return (
    <div className="relative">
      {/* Banner */}
      <div
        className={`h-32 bg-cover bg-center rounded-lg ${
          isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
        style={{ backgroundImage: `url(${bannerUrl})` }}
        onClick={() => onImageClick('banner')}
      >
        {isEditing && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center group-hover:bg-black/60 transition-colors">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/90 hover:bg-white text-black"
              disabled={uploading.banner}
            >
              <Camera className="w-4 h-4 mr-2" />
              {uploading.banner ? 'Uploading...' : 'Change Banner'}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="absolute -bottom-6 left-6">
        <div
          className="relative"
          onClick={() => onImageClick('avatar')}
        >
          <Avatar
            className={`w-20 h-20 border-4 border-background ${
              isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
            }`}
          >
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg">
              {displayName?.[0] || user?.firstName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          {isEditing && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-white hover:bg-gray-50 text-black border border-gray-200"
              disabled={uploading.avatar}
            >
              <Camera className="w-3 h-3" />
            </Button>
          )}
          {uploading.avatar && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="text-white text-xs">Uploading...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
