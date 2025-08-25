import useSWR from "swr";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";

type TokenResp = { token: string; wsUrl: string; roomName: string };

export function useViewerToken(slug?: string, channelId?: string) {
  const shouldFetch = Boolean(slug || channelId);

  const { data, error, isLoading, mutate } = useSWR<TokenResp>(
    shouldFetch ? ["/api/stream/token", slug ?? "", channelId ?? ""] : null,
    async () => {
      const response = await axios.post<APIResponse<TokenResp>>("/api/stream/token", 
        slug ? { slug } : { channelId }
      );
      return response.data.payload!;
    },
    { revalidateOnFocus: false }
  );

  return {
    token: data?.token,
    wsUrl: data?.wsUrl,
    roomName: data?.roomName,
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}
