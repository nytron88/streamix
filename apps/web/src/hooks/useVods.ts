import useSWR from "swr";
import axios from "axios";
import { VodsResponse } from "@/types/vod";

interface UseVodsOptions {
  page?: number;
  limit?: number;
  status?: "PUBLIC" | "SUB_ONLY" | "all";
  search?: string;
}

export function useVods(options: UseVodsOptions = {}) {
  const { page = 1, limit = 20, status, search } = options;

  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("limit", limit.toString());
  if (status && status !== "all") params.set("status", status);
  if (search && search.trim()) params.set("search", search);

  const { data, error, isLoading, mutate } = useSWR<VodsResponse>(
    `/api/vods?${params.toString()}`,
    (url: string) => axios.get(url).then((res) => res.data.payload),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    vods: data?.vods || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh: mutate,
  };
}
