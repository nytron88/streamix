import useSWR from "swr";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";
import { FollowingItem } from "@/types/following";

type FollowingData = {
  items: FollowingItem[];
  nextCursor?: string;
};

export function useUserFollowing(limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<FollowingData>(
    `/api/follows/following?limit=${limit}`,
    async (url: string) => {
      const response = await axios.get<APIResponse<FollowingData>>(url);
      return response.data.payload!;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    following: data?.items || [],
    nextCursor: data?.nextCursor,
    total: data?.items?.length || 0,
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}
