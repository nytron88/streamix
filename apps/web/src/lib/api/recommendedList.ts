import prisma from "@/lib/prisma/prisma";
import { requireAuth, isNextResponse } from "./requireAuth";
import { successResponse, errorResponse } from "../utils/responseWrapper";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { RecommendedChannel } from "@/types/recommendations";

export async function getRecommendedList(limit = 12) {
  const result = await requireAuth();
  if (isNextResponse(result)) return result;

  const { userId } = result;

  try {
    // 1) who does this user follow?
    const followed = await prisma.follow.findMany({
      where: { userId },
      select: { channelId: true },
    });
    const followedIds = followed.map((f) => f.channelId);

    // Helpers
    const baseSelect = {
      id: true,
      slug: true,
      displayName: true,
      avatarS3Key: true,
      bannerS3Key: true,
      user: { select: { imageUrl: true } }, // for avatar fallback
      _count: { select: { follows: true } },
    };

    // 2) Followed — live first
    const followedLive = await prisma.channel.findMany({
      where: {
        id: { in: followedIds.length ? followedIds : ["_none_"] }, // guard empty IN
        sessions: { some: { endedAt: null } },
      },
      select: baseSelect,
      orderBy: { follows: { _count: "desc" } },
      take: limit,
    });

    const stillNeedAfterFollowedLive = Math.max(0, limit - followedLive.length);

    const followedOffline =
      stillNeedAfterFollowedLive > 0
        ? await prisma.channel.findMany({
            where: {
              id: { in: followedIds.length ? followedIds : ["_none_"] },
              sessions: { none: { endedAt: null } },
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: stillNeedAfterFollowedLive,
          })
        : [];

    const collectedIds = new Set<string>([
      ...followedLive.map((c) => c.id),
      ...followedOffline.map((c) => c.id),
    ]);

    // 3) Non-followed — live first, excluding self
    const needAfterFollowed = Math.max(
      0,
      limit - (followedLive.length + followedOffline.length)
    );

    const notFollowedWhere = {
      id: { notIn: [...collectedIds, ...followedIds] },
      userId: { not: userId },
    };

    const nonFollowedLive =
      needAfterFollowed > 0
        ? await prisma.channel.findMany({
            where: {
              ...notFollowedWhere,
              sessions: { some: { endedAt: null } },
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: needAfterFollowed,
          })
        : [];

    const stillNeedAfterNonFollowedLive = Math.max(
      0,
      limit -
        (followedLive.length + followedOffline.length + nonFollowedLive.length)
    );

    const nonFollowedOffline =
      stillNeedAfterNonFollowedLive > 0
        ? await prisma.channel.findMany({
            where: {
              ...notFollowedWhere,
              sessions: { none: { endedAt: null } },
            },
            select: baseSelect,
            orderBy: { follows: { _count: "desc" } },
            take: stillNeedAfterNonFollowedLive,
          })
        : [];

    // 4) Compose & map to payload
    const all = [
      ...followedLive,
      ...followedOffline,
      ...nonFollowedLive,
      ...nonFollowedOffline,
    ].slice(0, limit);

    const items: RecommendedChannel[] = all.map((c) => {
      const live = Boolean((c as any).sessions?.some?.((s: any) => !s.endedAt)); // not selected; infer via query branch
      return {
        channelId: c.id,
        slug: c.slug,
        displayName: c.displayName,
        followerCount: c._count.follows,
        live, // value is implied by which list it came from; see below for accurate flag
        avatarUrl: getAvatarUrl(
          // pass a Channel-like object for avatar/banner keys
          {
            ...c,
            avatarS3Key: c.avatarS3Key,
            bannerS3Key: c.bannerS3Key,
          } as any,
          // pass the channel's user for Clerk fallback (has imageUrl)
          c.user as any
        ),
        bannerUrl: getBannerUrl({ ...c } as any),
      };
    });

    // We know which group each item came from; mark `live` accurately:
    const liveSet = new Set<string>([
      ...followedLive.map((c) => c.id),
      ...nonFollowedLive.map((c) => c.id),
    ]);
    const normalized = items.map((it) => ({
      ...it,
      live: liveSet.has(it.channelId),
    }));

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
