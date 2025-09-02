import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { BanBody, BanItem } from "@/types/ban";

export function useBanUser() {
  const [loading, setLoading] = useState(false);

  const banUser = async (data: BanBody): Promise<BanItem | null> => {
    try {
      setLoading(true);
      
      const response = await axios.post("/api/bans", data);
      
      toast.success("User banned successfully");
      return response.data.payload.ban;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err?.response?.data?.error || "Failed to ban user";
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const unbanUser = async (banId: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      await axios.post("/api/bans/unban", { banId });
      
      toast.success("User unbanned successfully");
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err?.response?.data?.error || "Failed to unban user";
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    banUser,
    unbanUser,
    loading,
  };
}
