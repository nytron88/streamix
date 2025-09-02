import { useState, useEffect } from "react";
import axios from "axios";

export function useBanCheck(channelId: string | null) {
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    const checkBanStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post("/api/bans/check", {
          channelId,
        });

        setIsBanned(response.data.payload.isBanned);
      } catch (err: unknown) {
        // If user is not authenticated, assume they're not banned
        const error = err as { response?: { status?: number; data?: { error?: string } } };
        if (error?.response?.status === 401) {
          setIsBanned(false);
        } else {
          setError(error?.response?.data?.error || "Failed to check ban status");
        }
      } finally {
        setLoading(false);
      }
    };

    checkBanStatus();
  }, [channelId]);

  return {
    isBanned,
    loading,
    error,
  };
}
