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
  pendingUploads?: { avatarS3Key?: string; bannerS3Key?: string };
  onImageClick: (type: 'avatar' | 'banner') => void;
}

export function ProfileBannerAvatar({
  bannerUrl,
  avatarUrl,
  displayName,
  isEditing,
  uploading,
  pendingUploads,
  onImageClick,
}: ProfileBannerAvatarProps) {
  const { user } = useUser();

  // Helper to build CDN URL from S3 key
  const buildCdnUrl = (s3Key: string) => {
    const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN!;
    return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  };

  // Use pending upload URLs if available, otherwise use current URLs
  const displayBannerUrl = pendingUploads?.bannerS3Key
    ? buildCdnUrl(pendingUploads.bannerS3Key)
    : bannerUrl;

  const displayAvatarUrl = pendingUploads?.avatarS3Key
    ? buildCdnUrl(pendingUploads.avatarS3Key)
    : avatarUrl;

  return (
    <div className="relative">
      {/* Banner */}
      <div
        className={`h-32 md:h-40 bg-cover bg-center rounded-lg relative ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
        style={{ backgroundImage: `url(${displayBannerUrl})` }}
        onClick={() => isEditing && onImageClick('banner')}
      >
        {/* Pending changes indicator */}
        {pendingUploads?.bannerS3Key && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Changes pending
            </div>
          </div>
        )}

        {isEditing && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center group-hover:bg-black/60 transition-colors">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/90 hover:bg-white text-black cursor-pointer text-xs md:text-sm px-3 py-2"
              disabled={uploading.banner}
            >
              <Camera className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              {uploading.banner ? 'Uploading...' : 'Change Banner'}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="absolute -bottom-8 md:-bottom-6 left-4 md:left-6">
        <div
          className={`relative ${isEditing ? 'cursor-pointer' : ''}`}
          onClick={() => isEditing && onImageClick('avatar')}
        >
          <Avatar
            className={`w-16 h-16 md:w-20 md:h-20 border-4 border-background ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
              }`}
          >
            <AvatarImage src={displayAvatarUrl} />
            <AvatarFallback className="text-sm md:text-lg">
              {displayName?.[0] || user?.firstName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Pending changes indicator for avatar */}
          {pendingUploads?.avatarS3Key && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="bg-blue-500 w-4 h-4 rounded-full border-2 border-white"></div>
            </div>
          )}

          {isEditing && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-white hover:bg-gray-50 text-black border border-gray-200 cursor-pointer"
              disabled={uploading.avatar}
            >
              <Camera className="w-2.5 h-2.5 md:w-3 md:h-3" />
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
