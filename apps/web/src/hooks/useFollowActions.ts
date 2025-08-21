import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

export function useFollowActions() {
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isUnfollowLoading, setIsUnfollowLoading] = useState(false);

  const followChannel = async (channelId: string) => {
    if (isFollowLoading) return false;

    setIsFollowLoading(true);
    try {
      await axios.post("/api/follows/follow", { channelId });
      toast.success("Successfully followed channel!");
      return true;
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Failed to follow channel");
      return false;
    } finally {
      setIsFollowLoading(false);
    }
  };

  const unfollowChannel = async (channelId: string) => {
    if (isUnfollowLoading) return false;

    setIsUnfollowLoading(true);
    try {
      await axios.post("/api/follows/unfollow", { channelId });
      toast.success("Successfully unfollowed channel!");
      return true;
    } catch (error) {
      console.error("Unfollow error:", error);
      toast.error("Failed to unfollow channel");
      return false;
    } finally {
      setIsUnfollowLoading(false);
    }
  };

  return {
    followChannel,
    unfollowChannel,
    isFollowLoading,
    isUnfollowLoading,
    isLoading: isFollowLoading || isUnfollowLoading,
  };
}
