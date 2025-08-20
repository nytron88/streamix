import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { APIResponse } from "@/types/apiResponse";

interface StreamData {
  channelId: string;
  ingressId: string | null;
  serverUrl: string | null;
  streamKey: string | null;
  isLive: boolean;
  isChatEnabled: boolean;
  isChatDelayed: boolean;
  isChatFollowersOnly: boolean;
  name: string | null;
  thumbnailS3Key: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IngressResponse {
  type: string;
  channelId: string;
  ingressId: string;
  serverUrl: string;
  streamKey: string | null;
}

export function useStreamKeys() {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchStreamData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<APIResponse<StreamData>>("/api/stream");
      
      if (response.data.success && response.data.payload) {
        setStreamData(response.data.payload);
      } else {
        setError(response.data.message || "Failed to fetch stream data");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const generateIngress = useCallback(async (type: "RTMP_INPUT" | "WHIP_INPUT") => {
    try {
      setGenerating(true);
      
      const response = await axios.post<APIResponse<IngressResponse>>("/api/stream/ingress", {
        type,
      });
      
      if (response.data.success && response.data.payload) {
        toast.success("Stream keys generated", {
          description: `${type === "RTMP_INPUT" ? "RTMP" : "WHIP"} ingress created successfully`,
        });
        
        // Refresh stream data to show new keys
        await fetchStreamData();
      } else {
        toast.error("Failed to generate keys", {
          description: response.data.message || "Could not create ingress",
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error("Failed to generate keys", {
          description: err.response?.data?.message || err.message,
        });
      } else {
        toast.error("Failed to generate keys", {
          description: "An unexpected error occurred",
        });
      }
    } finally {
      setGenerating(false);
    }
  }, [fetchStreamData]);

  const resetIngress = useCallback(async () => {
    try {
      setResetting(true);
      
      const response = await axios.delete<APIResponse<{ channelId: string; removed: number }>>("/api/stream/ingress");
      
      if (response.data.success) {
        toast.success("Stream keys reset", {
          description: "All ingress configurations have been removed",
        });
        
        // Refresh stream data to show updated state
        await fetchStreamData();
      } else {
        toast.error("Failed to reset keys", {
          description: response.data.message || "Could not reset ingress",
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error("Failed to reset keys", {
          description: err.response?.data?.message || err.message,
        });
      } else {
        toast.error("Failed to reset keys", {
          description: "An unexpected error occurred",
        });
      }
    } finally {
      setResetting(false);
    }
  }, [fetchStreamData]);

  const refetch = useCallback(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  useEffect(() => {
    fetchStreamData();
  }, [fetchStreamData]);

  return {
    streamData,
    loading,
    error,
    generating,
    resetting,
    generateIngress,
    resetIngress,
    refetch,
  };
}
