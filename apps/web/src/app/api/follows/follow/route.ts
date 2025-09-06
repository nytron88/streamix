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
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const channel = await tx.channel.findUnique({
          where: { id: channelId },
          select: { id: true, userId: true, slug: true, displayName: true },
        });

        if (!channel) throw new Error("Channel not found");
        if (channel.userId === userId)
          throw new Error("You cannot follow your own channel");

        // Check if user is banned from this channel
        const ban = await tx.ban.findUnique({
          where: {
            channelId_userId: {
              channelId: channelId,
              userId: userId,
            },
          },
          select: { expiresAt: true },
        });

        if (ban) {
          const expired = ban.expiresAt && ban.expiresAt < new Date();
          if (!expired) {
            throw new Error(
              "You cannot follow this channel because you are banned"
            );
          }
        }

        const follow = await tx.follow.upsert({
          where: { userId_channelId: { userId, channelId } },
          update: {},
          create: { userId, channelId },
        });

        return {
          id: channel.id,
          slug: channel.slug,
          displayName: channel.displayName,
          userId: channel.userId, // Include channel owner's user ID for cache invalidation
          followId: follow.id,
        };
      }
    );

    // Store follow notification in Redis
    const followNotification: FollowNotificationData = {
      id: result.followId,
      followerId: userId,
      channelId,
      action: 'FOLLOWED',
      createdAt: new Date().toISOString(),
      // Additional metadata will be populated by the worker
    };

    await FollowNotificationService.storeNotification(followNotification);

    // Clear all related caches using the comprehensive cache invalidation utility
    await clearFollowRelatedCaches({
      userId,
      targetChannelId: channelId,
      targetUserId: result.userId, // Channel owner's user ID
    });

    return successResponse("Followed successfully", 200, {
      followed: true,
      channel: result,
    });
  } catch (err) {
    return errorResponse("Failed to follow channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
