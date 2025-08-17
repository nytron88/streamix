import { useState, useEffect } from "react";
import axios from "axios";
import { APIResponse } from "@/types/apiResponse";
import { ChannelPayload } from "@/types/channel";

export function useChannelData() {
  const [channelData, setChannelData] = useState<ChannelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const response = await axios.get<APIResponse<ChannelPayload>>("/api/channel");
      const { data } = response;

      if (data.success && data.payload) {
        setChannelData(data.payload);
        setError(null);
      } else {
        setError(data.message || "Failed to fetch channel data");
      }
    } catch (err) {
      console.error("Error fetching channel data:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Network error: ${errorMessage}`);
      } else {
        setError("Network error while fetching channel data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelData();
  }, []);

  const refetch = () => {
    fetchChannelData();
  };

  return {
    channelData,
    setChannelData,
    loading,
    error,
    setError,
    refetch,
  };
}
