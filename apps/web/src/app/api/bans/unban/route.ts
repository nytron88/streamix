import { NextRequest } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { clearBanRelatedCaches } from "@/lib/utils/cacheInvalidation";
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

    // Clear all related caches using the comprehensive cache invalidation utility
    await clearBanRelatedCaches({
      userId: channelOwnerId,
      channelId: result.channelId,
      targetUserId: result.userId
    });

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