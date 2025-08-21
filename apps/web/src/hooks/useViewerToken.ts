import useSWR from "swr";

type TokenResp = { token: string; wsUrl: string; roomName: string };

export function useViewerToken(slug?: string, channelId?: string) {
  const shouldFetch = Boolean(slug || channelId);

  const { data, error, isLoading, mutate } = useSWR<TokenResp>(
    shouldFetch ? ["/api/stream/token", slug ?? "", channelId ?? ""] : null,
    async () => {
      const res = await fetch("/api/stream/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slug ? { slug } : { channelId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json().then((r) => r.data as TokenResp);
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
