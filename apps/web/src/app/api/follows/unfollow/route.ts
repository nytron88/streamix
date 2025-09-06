import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { clearFollowRelatedCaches } from "@/lib/utils/cacheInvalidation";
import { ChannelIdSchema } from "@/schemas/channelIdSchema";
import { ChannelId } from "@/types/channel";
import { Prisma } from "@prisma/client";
import { FollowNotificationService, FollowNotificationData } from "@/lib/services/followNotificationService";

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  let body: ChannelId;
  try {
    body = ChannelIdSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  const { channelId } = body;

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const channel = await tx.channel.findUnique({
        where: { id: channelId },
        select: { id: true, userId: true, slug: true, displayName: true },
      });
      if (!channel) throw new Error("Channel not found");

      // Note: We allow unfollowing even if banned, as this helps clean up relationships

      // Get the follow record before deleting it
      const existingFollow = await tx.follow.findUnique({
        where: { userId_channelId: { userId, channelId } },
        select: { id: true },
      });

      const { count } = await tx.follow.deleteMany({
        where: { userId, channelId },
      });

      return {
        unfollowed: count > 0,
        followId: existingFollow?.id,
        channel: {
          id: channel.id,
          slug: channel.slug,
          displayName: channel.displayName,
          userId: channel.userId, // Include channel owner's user ID for cache invalidation
        },
      };
    });

    // Store unfollow notification in Redis (only if there was actually a follow to unfollow)
    if (result.unfollowed && result.followId) {
      const unfollowNotification: FollowNotificationData = {
        id: result.followId,
        followerId: userId,
        channelId,
        action: 'UNFOLLOWED',
        createdAt: new Date().toISOString(),
        // Additional metadata will be populated by the worker
      };

      await FollowNotificationService.storeNotification(unfollowNotification);
    }

    // Clear all related caches using the comprehensive cache invalidation utility
    await clearFollowRelatedCaches({
      userId,
      targetChannelId: channelId,
      targetUserId: result.channel.userId // Channel owner's user ID
    });

    return successResponse("Unfollow processed", 200, {
      followed: false,
      ...result,
    });
  } catch (err) {
    return errorResponse("Failed to unfollow channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
