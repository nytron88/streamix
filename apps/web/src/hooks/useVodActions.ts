import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { VodUpdateData } from "@/types/vod";

export function useVodActions() {
  const [isLoading, setIsLoading] = useState(false);

  const updateVod = async (vodId: string, data: VodUpdateData) => {
    setIsLoading(true);
    try {
      await axios.patch(`/api/vods/${vodId}`, data);
      toast.success("VOD updated successfully");
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update VOD";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteVod = async (vodId: string) => {
    setIsLoading(true);
    try {
      await axios.delete(`/api/vods/${vodId}`);
      toast.success("VOD deleted successfully");
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to delete VOD";
      toast.error(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateVod,
    deleteVod,
    isLoading,
  };
}
