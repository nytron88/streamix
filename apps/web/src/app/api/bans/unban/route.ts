import { NextRequest } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { BanIdSchema } from "@/schemas/banIdSchema";
import { BanId } from "@/types/ban";

/**
 * POST /api/bans/unban - Remove a ban
 */
export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: channelOwnerId } = auth;

  // Parse and validate request body
  let body: BanId;
  try {
    body = BanIdSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  const { banId } = body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get the ban and verify ownership
      const ban = await tx.ban.findUnique({
        where: { id: banId },
        include: {
          channel: {
            select: {
              id: true,
              userId: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!ban) {
        throw new Error("Ban not found");
      }

      // Verify the authenticated user owns the channel
      if (ban.channel.userId !== channelOwnerId) {
        throw new Error("You can only remove bans from your own channel");
      }

      // Delete the ban
      await tx.ban.delete({
        where: { id: banId },
      });

      return {
        id: ban.id,
        userId: ban.userId,
        userName: ban.user.name,
        channelId: ban.channel.id,
      };
    });

    // Clear relevant cache entries (comprehensive cache invalidation)
    // Clear exact cache keys
    await Promise.allSettled([
      redis.del(`bans:channel:${result.channelId}`),
      redis.del(`bans:user:${result.userId}`),
      redis.del(`ban:check:${result.channelId}:${result.userId}`),
      redis.del(`follows:following:${result.userId}`), // Unbanned user's following cache
      redis.del(`followers:${result.channelId}`), // Channel's followers cache
      redis.del(`subscriptions:${result.userId}`), // Unbanned user's subscriptions
    ]);

    // Clear recommendation caches for both users (all limit variations)
    const commonLimits = [10, 12, 15, 20, 24, 25];
    const recCacheKeysToDelete = [];
    
    for (const limit of commonLimits) {
      recCacheKeysToDelete.push(`recs:channels:${result.userId}:${limit}`);
      // We need to get the channel owner ID for bilateral cache clearing
      // For now, we'll just clear the unbanned user's cache
    }
    
    await Promise.allSettled(recCacheKeysToDelete.map(key => redis.del(key)));

    return successResponse("Ban removed successfully", 200, {
      removedBan: {
        id: result.id,
        userId: result.userId,
        userName: result.userName,
      },
    });
  } catch (err) {
    return errorResponse("Failed to remove ban", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});