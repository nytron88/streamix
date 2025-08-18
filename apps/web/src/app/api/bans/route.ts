import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { BanItem } from "@/types/ban";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 60;

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  const sp = req.nextUrl.searchParams;
  const limitParam = sp.get("limit");
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      limitParam ? parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT
    )
  );
  const cursor = sp.get("cursor"); // "<createdAtMs>_<banId>"

  // Find the caller's channel
  const myChannel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!myChannel) {
    return errorResponse("Channel not found for current user", 404);
  }

  // Cache only the first page (no cursor)
  const cacheKey = cursor ? null : `bans:channel:${myChannel.id}:${limit}`;
  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return successResponse("Bans fetched (cache)", 200, JSON.parse(cached));
      }
    } catch {
      // ignore cache read errors
    }
  }

  try {
    // Build cursor condition for tuple pagination (createdAt desc, id desc)
    let cursorWhere = {};
    if (cursor) {
      const [createdAtMsStr, banId] = cursor.split("_");
      const createdAtMs = Number(createdAtMsStr);
      if (!Number.isFinite(createdAtMs) || !banId) {
        return errorResponse("Invalid cursor", 400);
      }
      const createdAt = new Date(createdAtMs);
      cursorWhere = {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: banId } },
        ],
      };
    }

    const now = new Date();

    // 1) Pull active bans (no expiry, or expiry in the future)
    const bans = await prisma.ban.findMany({
      where: {
        channelId: myChannel.id,
        ...cursorWhere,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        userId: true,
        reason: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const hasNext = bans.length > limit;
    const page = bans.slice(0, limit);
    const nextCursor = hasNext
      ? `${page[page.length - 1].createdAt.getTime()}_${
          page[page.length - 1].id
        }`
      : undefined;

    if (page.length === 0) {
      const empty = { items: [] as BanItem[], nextCursor };
      if (cacheKey) {
        try {
          await redis.set(cacheKey, JSON.stringify(empty), "EX", TTL_SECONDS);
        } catch {}
      }
      return successResponse("Bans fetched", 200, empty);
    }

    const bannedUserIds = page.map((b) => b.userId);

    // 2) Load user + their channel (for avatar/banner keys)
    const users = await prisma.user.findMany({
      where: { id: { in: bannedUserIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        channel: {
          select: { avatarS3Key: true, bannerS3Key: true },
        },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    // 3) Compose items preserving order
    const items: BanItem[] = page.map((b) => {
      const u = byId.get(b.userId);
      return {
        userId: b.userId,
        name: u?.name ?? null,
        avatarUrl: u ? getAvatarUrl(u.channel as any, u as any) : null,
        bannerUrl: u ? getBannerUrl(u.channel as any) : null,
        reason: b.reason ?? null,
        createdAt: b.createdAt.toISOString(),
        expiresAt: b.expiresAt ? b.expiresAt.toISOString() : null,
      };
    });

    const payload = { items, nextCursor };

    // 4) Cache first page
    if (cacheKey) {
      try {
        await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
      } catch {
        // ignore cache write errors
      }
    }

    return successResponse("Bans fetched", 200, payload);
  } catch (err) {
    return errorResponse("Failed to fetch bans", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
