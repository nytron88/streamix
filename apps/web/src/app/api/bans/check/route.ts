import { NextRequest } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { ChannelIdSchema } from "@/schemas/channelIdSchema";
import { ChannelId } from "@/types/channel";

/**
 * POST /api/bans/check - Check if the authenticated user is banned from a channel
 */
export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  // Parse and validate request body
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
    // Check cache first
    const cacheKey = `ban:check:${channelId}:${userId}`;
    const cachedResult = await redis.get(cacheKey);

    if (cachedResult !== null) {
      const isBanned = cachedResult === "true";
      return successResponse("Ban status checked", 200, { isBanned });
    }

    // Check if user is banned from the channel
    const ban = await prisma.ban.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
        OR: [
          { expiresAt: null }, // Permanent ban
          { expiresAt: { gt: new Date() } }, // Non-expired ban
        ],
      },
    });

    const isBanned = !!ban;

    // Cache the result for 5 minutes
    await redis.setex(cacheKey, 300, isBanned ? "true" : "false");

    return successResponse("Ban status checked", 200, { isBanned });
  } catch (err) {
    return errorResponse("Failed to check ban status", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});


