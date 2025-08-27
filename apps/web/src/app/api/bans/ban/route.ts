import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { BanBody } from "@/types/ban";
import { BanBodySchema } from "@/schemas/banBodySchema";

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: actorId } = auth;

  let body: BanBody;
  try {
    body = BanBodySchema.parse(await req.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }
  const { userId: targetUserId, reason, expiresAt } = body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const channel = await tx.channel.findUnique({
        where: { userId: actorId },
        select: { id: true, userId: true },
      });
      if (!channel) throw new Error("Channel not found for current user");

      if (targetUserId === actorId) {
        throw new Error("You cannot ban yourself");
      }

      await tx.follow.deleteMany({
        where: { userId: targetUserId, channelId: channel.id },
      });

      const updateData: { reason?: string | null; expiresAt?: Date | null } =
        {};
      if (reason !== undefined) updateData.reason = reason || null;
      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      const ban = await tx.ban.upsert({
        where: {
          channelId_userId: { channelId: channel.id, userId: targetUserId },
        },
        create: {
          channelId: channel.id,
          userId: targetUserId,
          reason: reason ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        update: updateData,
        select: {
          channelId: true,
          userId: true,
          reason: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return { channelId: channel.id, ban };
    });

    // Clear relevant caches after banning a user
    // Note: We don't clear channel cache since counts are fetched fresh each time
    await Promise.allSettled([
      redis.del(`bans:channel:${result.channelId}`),
      redis.del(`followers:${result.channelId}`),
      redis.del(`follows:following:${body.userId}`), // the banned user's following cache
      redis.del(`recs:channels:${body.userId}`),
    ]);

    return successResponse("User banned", 200, {
      banned: true,
      ban: {
        userId: result.ban.userId,
        channelId: result.ban.channelId,
        reason: result.ban.reason,
        expiresAt: result.ban.expiresAt,
        createdAt: result.ban.createdAt,
      },
    });
  } catch (err) {
    return errorResponse("Failed to ban user", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
