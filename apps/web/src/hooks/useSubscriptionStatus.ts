import useSWR from 'swr';
import { APIResponse } from '@/types/apiResponse';

interface SubscriptionStatus {
  isSubscribed: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
  };
}

const fetcher = async (url: string): Promise<SubscriptionStatus> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch subscription status');
  }
  const data: APIResponse<SubscriptionStatus> = await response.json();
  return data.payload!;
};

export function useSubscriptionStatus(channelId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    channelId ? `/api/subscriptions/status?channelId=${channelId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    isSubscribed: data?.isSubscribed || false,
    subscription: data?.subscription,
    error,
    isLoading,
    refresh: mutate,
  };
}
