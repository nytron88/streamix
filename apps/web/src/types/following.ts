export type FollowingItem = {
  channelId: string;
  slug: string | null;
  displayName: string | null;
  followerCount: number;
  live: boolean;
  avatarUrl: string;
  bannerUrl: string;
};

export type FollowerItem = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followedAt: string;
};
