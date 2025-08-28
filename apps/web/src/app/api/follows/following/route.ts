import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { FollowingItem } from "@/types/following";

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
  const cursor = sp.get("cursor"); // format: "<createdAtMs>_<followId>"
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      limitParam ? parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT
    )
  );

  // Cache only the first page (no cursor)
  const cacheKey = cursor ? null : `follows:following:${userId}:${limit}`;

  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return successResponse("Following fetched (cache)", 200, parsed);
      }
    } catch {
      // ignore cache read errors
    }
  }

  try {
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

    const follows = await prisma.follow.findMany({
      where: { userId, ...cursorWhere },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1, // fetch one extra to know if there's a next page
      select: {
        id: true,
        createdAt: true,
        channelId: true,
      },
    });

    const hasNext = follows.length > limit;
    const page = follows.slice(0, limit);

    const nextCursor = hasNext
      ? `${page[page.length - 1].createdAt.getTime()}_${
          page[page.length - 1].id
        }`
      : undefined;

    const channelIds = page.map((f) => f.channelId);
    if (channelIds.length === 0) {
      const emptyPayload = {
        items: [] as FollowingItem[],
        nextCursor: undefined as string | undefined,
      };
      if (cacheKey)
        await redis.set(
          cacheKey,
          JSON.stringify(emptyPayload),
          "EX",
          TTL_SECONDS
        );
      return successResponse("Following fetched", 200, emptyPayload);
    }

    // Get comprehensive bidirectional blocking using the same logic as recommendations
    const userChannel = await prisma.channel.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Get all mutual ban situations
    const allBans = await prisma.ban.findMany({
      where: {
        OR: [
          // Bans where this user is banned from other channels
          {
            userId,
            OR: [
              { expiresAt: null }, // Permanent ban
              { expiresAt: { gt: new Date() } }, // Non-expired ban
            ],
          },
          // Bans where this user has banned others from their channel
          userChannel ? {
            channelId: userChannel.id,
            OR: [
              { expiresAt: null }, // Permanent ban
              { expiresAt: { gt: new Date() } }, // Non-expired ban
            ],
          } : {},
        ].filter(Boolean),
      },
      select: {
        userId: true,
        channelId: true,
      },
    });

    // Extract all blocked channel IDs and user IDs
    const blockedChannelIds = new Set<string>();
    const blockedUserIds = new Set<string>();

    allBans.forEach((ban) => {
      if (ban.userId === userId) {
        // This user is banned from ban.channelId
        blockedChannelIds.add(ban.channelId);
      } else {
        // This user banned ban.userId, so block all their channels
        blockedUserIds.add(ban.userId);
      }
    });

    // Get all channels owned by blocked users
    if (blockedUserIds.size > 0) {
      const blockedUserChannels = await prisma.channel.findMany({
        where: { userId: { in: Array.from(blockedUserIds) } },
        select: { id: true },
      });
      blockedUserChannels.forEach((channel) => {
        blockedChannelIds.add(channel.id);
      });
    }

    const allBlockedChannelIds = Array.from(blockedChannelIds);
    
    const channels = await prisma.channel.findMany({
      where: { 
        id: { 
          in: channelIds,
          notIn: allBlockedChannelIds.length > 0 ? allBlockedChannelIds : [],
        },
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        avatarS3Key: true,
        bannerS3Key: true,
        user: { select: { imageUrl: true } },
        _count: { select: { follows: true } },
        // detect live with a cheap existence check
        sessions: {
          where: { endedAt: null },
          select: { id: true },
          take: 1,
        },
      },
    });

    const byId = new Map(channels.map((c) => [c.id, c]));
    const items: FollowingItem[] = page
      .map((f) => byId.get(f.channelId))
      .filter(Boolean)
      .map((c) => ({
        channelId: c!.id,
        slug: c!.slug,
        displayName: c!.displayName,
        followerCount: c!._count.follows,
        live: (c!.sessions?.length ?? 0) > 0,
        avatarUrl: getAvatarUrl(
          { avatarS3Key: c!.avatarS3Key, bannerS3Key: c!.bannerS3Key } as any,
          c!.user as any
        ),
        bannerUrl: getBannerUrl({ bannerS3Key: c!.bannerS3Key } as any),
      }));

    const payload = { items, nextCursor };

    if (cacheKey) {
      try {
        await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
      } catch {
        // ignore cache write errors (best-effort)
      }
    }

    return successResponse("Following fetched", 200, payload);
  } catch (err) {
    return errorResponse("Failed to fetch following", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
