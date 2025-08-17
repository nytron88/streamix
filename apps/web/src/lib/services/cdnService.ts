import type { Channel, User } from "@prisma/client";

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;

function buildUrl(key: string): string {
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

export function getAvatarUrl(
  channel: Channel | null,
  user: User | null
): string {
  if (channel?.avatarS3Key) {
    return buildUrl(channel.avatarS3Key);
  }
  if (user?.imageUrl) {
    return user.imageUrl;
  }
  return buildUrl("defaults/avatar.png");
}

export function getBannerUrl(channel: Channel | null): string {
  if (channel?.bannerS3Key) {
    return buildUrl(channel.bannerS3Key);
  }
  return buildUrl("defaults/banner.jpg");
}
