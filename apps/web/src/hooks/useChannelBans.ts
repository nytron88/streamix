import useSWR from "swr";
import axios from "axios";
import { BansResponse } from "@/types/ban";

const fetcher = async (url: string): Promise<BansResponse> => {
  const response = await axios.get(url);
  return response.data.payload;
};

export function useChannelBans() {
  const { data, error, mutate, isLoading } = useSWR<BansResponse>(
    "/api/bans",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    bans: data?.bans || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
