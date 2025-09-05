import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { UserSearchQuerySchema } from "@/schemas/searchQuerySchema";
import { UserSearchResponse, UserSearchResult } from "@/types/search";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 300; // 5 minutes

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Parse and validate query parameters
  const query = UserSearchQuerySchema.parse({
    q: searchParams.get("q") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    live: searchParams.get("live") || undefined,
  });

  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit)));
  const skip = (page - 1) * limit;

  // Create cache key
  const cacheKey = `search:users:${query.q}:${page}:${limit}:${query.live || 'all'}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("Users search results (cache)", 200, parsed);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      OR: [
        {
          displayName: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        {
          user: {
            name: {
              contains: query.q,
              mode: "insensitive",
            },
          },
        },
      ],
    };

    // Add live filter if specified
    if (query.live === "true") {
      where.stream = {
        isLive: true,
      };
    } else if (query.live === "false") {
      where.stream = {
        isLive: false,
      };
    }

    // Get users with pagination
    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }, // Sort by follower count
        include: {
          user: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
          stream: {
            select: {
              isLive: true,
            },
          },
          _count: {
            select: {
              follows: true,
            },
          },
        },
      }),
      prisma.channel.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format results
    const results: UserSearchResult[] = channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug || channel.id,
      displayName: channel.displayName || channel.user?.name || "Unknown",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      avatarUrl: getAvatarUrl(channel as any, channel.user as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bannerUrl: getBannerUrl(channel as any),
      followerCount: channel._count.follows,
      isLive: channel.stream?.isLive ?? false,
      description: channel.description || undefined,
    }));

    const response: UserSearchResponse = {
      users: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      query: query.q,
    };

    // Cache the results
    await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(response));

    return successResponse("Users search results", 200, response);
  } catch (err) {
    return errorResponse("Failed to search users", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
