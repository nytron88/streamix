import useSWR from "swr";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";

type ChannelData = {
  channel: {
    id: string;
    userId: string;
    slug: string;
    displayName: string;
    bio: string;
    category: string;
    followerCount: number;
    subscriberCount: number;
    createdAt: string;
    user: {
      id: string;
      name: string;
      imageUrl: string;
    };
    stream: {
      isLive: boolean;
      isChatEnabled: boolean;
      isChatDelayed: boolean;
      isChatFollowersOnly: boolean;
      name: string;
      thumbnailS3Key: string;
    } | null;
  };
  assets: {
    avatarUrl: string;
    bannerUrl: string;
  };
  viewer: {
    isFollowing: boolean;
    isBanned: boolean;
    banReason: string | null;
    banExpiresAt: string | null;
    isOwner: boolean;
  };
};

export function useChannelBySlug(slug?: string) {
  const shouldFetch = Boolean(slug);

  const { data, error, isLoading, mutate } = useSWR<ChannelData>(
    shouldFetch ? `/api/channel/${slug}` : null,
    async (url: string) => {
      const response = await axios.get<APIResponse<ChannelData>>(url);
      return response.data.payload!;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data,
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}
