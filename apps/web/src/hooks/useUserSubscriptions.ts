import useSWR from "swr";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";

export type UserSubscription = {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
  stripeSubId: string;
  channel: {
    id: string;
    slug: string;
    displayName: string;
    bio: string;
    category: string;
    followerCount: number;
    subscriberCount: number;
    isLive: boolean;
    user: {
      id: string;
      name: string;
      imageUrl: string;
    };
    assets: {
      avatarUrl: string;
      bannerUrl: string;
    };
  };
};

type SubscriptionsData = {
  subscriptions: UserSubscription[];
  total: number;
};

export function useUserSubscriptions() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionsData>(
    "/api/subscriptions",
    async (url: string) => {
      const response = await axios.get<APIResponse<SubscriptionsData>>(url);
      return response.data.payload!;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    subscriptions: data?.subscriptions || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}
