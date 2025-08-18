import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { ChannelIdSchema } from "@/schemas/channelIdSchema";
import { ChannelId } from "@/types/channel";

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
    const result = await prisma.$transaction(async (tx) => {
      const channel = await tx.channel.findUnique({
        where: { id: channelId },
        select: { id: true, userId: true, slug: true, displayName: true },
      });
      if (!channel) throw new Error("Channel not found");

      const { count } = await tx.follow.deleteMany({
        where: { userId, channelId },
      });

      return {
        unfollowed: count > 0,
        channel: {
          id: channel.id,
          slug: channel.slug,
          displayName: channel.displayName,
        },
      };
    });

    await Promise.allSettled([
      redis.del(`follows:following:${userId}`),
      redis.del(`recs:channels:${userId}`),
      redis.del(`followers:${channelId}`),
    ]);

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
