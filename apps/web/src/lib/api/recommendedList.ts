import prisma from "@/lib/prisma/prisma";
import { requireAuth, isNextResponse } from "./requireAuth";
import { successResponse, errorResponse } from "../utils/responseWrapper";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { RecommendedChannel } from "@/types/recommendations";
import redis from "@/lib/redis/redis";

const TTL_SECONDS = 90;

export async function getRecommendedList(limit = 12) {
  const result = await requireAuth();
  if (isNextResponse(result)) return result;

  const { userId } = result;
  const cacheKey = `recs:channels:${userId}:${limit}`;

  // 1) Try cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("Recommended list fetched (cache)", 200, data);
    }
  } catch {
    // ignore cache read errors
  }

  try {
    // 2) IDs this user follows
    const followed = await prisma.follow.findMany({
      where: { userId },
      select: { channelId: true },
    });
    const followedIds = followed.map((f) => f.channelId);

    const baseSelect = {
      id: true,
      slug: true,
      displayName: true,
      avatarS3Key: true,
      bannerS3Key: true,
      user: { select: { imageUrl: true } }, // fallback for avatar
      _count: { select: { follows: true } },
      stream: { select: { isLive: true } },
    } as const;

    // 3) Followed — live first
    const followedLive = await prisma.channel.findMany({
      where: {
        id: { in: followedIds.length ? followedIds : ["_none_"] },
        stream: { is: { isLive: true } },
      },
      select: baseSelect,
      orderBy: { follows: { _count: "desc" } },
      take: limit,
    });

    const needAfterFollowedLive = Math.max(0, limit - followedLive.length);

    const followedOffline =
      needAfterFollowedLive > 0
        ? await prisma.channel.findMany({
            where: {
              id: { in: followedIds.length ? followedIds : ["_none_"] },
              OR: [
                { stream: { is: { isLive: false } } },
                { stream: null }, // safety in case stream row is missing
              ],
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: needAfterFollowedLive,
          })
        : [];

    const collectedIds = new Set<string>([
      ...followedLive.map((c) => c.id),
      ...followedOffline.map((c) => c.id),
    ]);

    // 4) Non-followed — live first (exclude self & already picked)
    const needAfterFollowed =
      limit - (followedLive.length + followedOffline.length);

    const nonFollowedLive =
      needAfterFollowed > 0
        ? await prisma.channel.findMany({
            where: {
              id: { notIn: [...collectedIds, ...followedIds] },
              userId: { not: userId },
              stream: { is: { isLive: true } },
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: needAfterFollowed,
          })
        : [];

    const needAfterNonFollowedLive =
      limit -
      (followedLive.length + followedOffline.length + nonFollowedLive.length);

    const nonFollowedOffline =
      needAfterNonFollowedLive > 0
        ? await prisma.channel.findMany({
            where: {
              id: {
                notIn: [
                  ...collectedIds,
                  ...followedIds,
                  ...nonFollowedLive.map((c) => c.id),
                ],
              },
              userId: { not: userId },
              OR: [{ stream: { is: { isLive: false } } }, { stream: null }],
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: needAfterNonFollowedLive,
          })
        : [];

    // 5) Compose → payload
    const all = [
      ...followedLive,
      ...followedOffline,
      ...nonFollowedLive,
      ...nonFollowedOffline,
    ].slice(0, limit);

    const normalized: RecommendedChannel[] = all.map((c) => ({
      channelId: c.id,
      slug: c.slug,
      displayName: c.displayName,
      followerCount: c._count.follows,
      live: Boolean(c.stream?.isLive),
      avatarUrl: getAvatarUrl({ ...c } as any, c.user as any),
      bannerUrl: getBannerUrl({ ...c } as any),
    }));

    // 6) Cache write (TTL)
    try {
      await redis.set(cacheKey, JSON.stringify(normalized), "EX", TTL_SECONDS);
    } catch {
      // ignore cache write errors
    }

    return successResponse(
      "Recommended list fetched successfully",
      200,
      normalized
    );
  } catch (err) {
    return errorResponse("Failed to build recommended list", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
