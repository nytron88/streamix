import useSWR from "swr";
import axios from "axios";
import { VodResponse } from "@/types/vod";

export function useVod(vodId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<VodResponse>(
    vodId ? `/api/vods/${vodId}` : null,
    (url: string) => axios.get(url).then((res) => res.data.payload),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    vod: data?.vod,
    isLoading,
    error,
    refresh: mutate,
  };
}
