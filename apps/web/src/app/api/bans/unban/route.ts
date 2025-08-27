import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { UserId } from "@/types/user";
import { UserIdSchema } from "@/schemas/userIdSchema";

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: actorId } = auth;

  let body: UserId;
  try {
    body = UserIdSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  const targetUserId = body.userId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const channel = await tx.channel.findUnique({
        where: { userId: actorId },
        select: { id: true },
      });
      if (!channel) throw new Error("Channel not found for current user");

      if (targetUserId === actorId) {
        throw new Error("You cannot unban yourself");
      }

      const del = await tx.ban.deleteMany({
        where: { channelId: channel.id, userId: targetUserId },
      });

      return { channelId: channel.id, removed: del.count > 0 };
    });

    // Clear relevant caches after unbanning a user
    // Note: We don't clear channel cache since counts are fetched fresh each time
    await Promise.allSettled([
      redis.del(`bans:channel:${result.channelId}`),
      redis.del(`followers:${result.channelId}`),
      redis.del(`follows:following:${targetUserId}`),
      redis.del(`recs:channels:${targetUserId}`),
    ]);

    return successResponse("Unban processed", 200, {
      banned: false,
      removed: result.removed,
      userId: targetUserId,
      channelId: result.channelId,
    });
  } catch (err) {
    return errorResponse("Failed to unban user", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
