import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { FollowerItem } from "@/types/following";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 60;

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  // Parse query params
  const sp = req.nextUrl.searchParams;
  const limitParam = sp.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      limitParam ? parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT
    )
  );
  const cursor = sp.get("cursor"); // "<createdAtMs>_<followId>"

  // Get my channel
  const myChannel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!myChannel) {
    return errorResponse("Channel not found for current user", 404);
  }

  const cacheKey = cursor ? null : `follows:followers:${myChannel.id}:${limit}`;
  if (cacheKey) {
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      return successResponse(
        "Followers fetched (cache)",
        200,
        JSON.parse(cached)
      );
    }
  }

  try {
    // Cursor condition
    let cursorWhere = {};
    if (cursor) {
      const [createdAtMsStr, followId] = cursor.split("_");
      const createdAtMs = Number(createdAtMsStr);
      if (!Number.isFinite(createdAtMs) || !followId) {
        return errorResponse("Invalid cursor", 400);
      }
      const createdAt = new Date(createdAtMs);
      cursorWhere = {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: followId } },
        ],
      };
    }

    // Find follows
    const follows = await prisma.follow.findMany({
      where: { channelId: myChannel.id, ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: { id: true, createdAt: true, userId: true },
    });

    const hasNext = follows.length > limit;
    const page = follows.slice(0, limit);
    const nextCursor = hasNext
      ? `${page[page.length - 1].createdAt.getTime()}_${
          page[page.length - 1].id
        }`
      : undefined;

    if (page.length === 0) {
      const emptyPayload = { items: [] as FollowerItem[], nextCursor };
      if (cacheKey)
        await redis.set(
          cacheKey,
          JSON.stringify(emptyPayload),
          "EX",
          TTL_SECONDS
        );
      return successResponse("Followers fetched", 200, emptyPayload);
    }

    const followerUserIds = page.map((f) => f.userId);

    // Load users + their channels for avatar/banner
    const users = await prisma.user.findMany({
      where: { id: { in: followerUserIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        channel: {
          select: {
            avatarS3Key: true,
            bannerS3Key: true,
          },
        },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    // Compose
    const items: FollowerItem[] = page.map((f) => {
      const u = byId.get(f.userId);
      return {
        userId: f.userId,
        name: u?.name ?? null,
        avatarUrl: u ? getAvatarUrl(u.channel as any, u as any) : null,
        bannerUrl: u ? getBannerUrl(u.channel as any) : null,
        followedAt: f.createdAt.toISOString(),
      };
    });

    const payload = { items, nextCursor };

    if (cacheKey) {
      await redis
        .set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS)
        .catch(() => null);
    }

    return successResponse("Followers fetched", 200, payload);
  } catch (err) {
    return errorResponse("Failed to fetch followers", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
