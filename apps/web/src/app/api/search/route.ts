import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { SearchQuerySchema } from "@/schemas/searchQuerySchema";
import { SearchResponse, SearchResult } from "@/types/search";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 300; // 5 minutes

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Parse and validate query parameters
  let query;
  try {
    query = SearchQuerySchema.parse({
      q: searchParams.get("q") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      type: searchParams.get("type") || undefined,
    });
  } catch (err) {
    return errorResponse("Invalid query parameters", 400, {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit)));

  // Create cache key
  const cacheKey = `search:combined:${query.q}:${page}:${limit}:${query.type}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("Search results (cache)", 200, parsed);
    }

    const results: SearchResult[] = [];

    // Search VODs if type is 'all' or 'vods'
    if (query.type === "all" || query.type === "vods") {
      const vods = await prisma.vod.findMany({
        where: {
          publishedAt: { not: null },
          title: {
            contains: query.q,
            mode: "insensitive",
          },
        },
        take: Math.ceil(limit / 2), // Half the results for VODs
        orderBy: { publishedAt: "desc" },
        include: {
          channel: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              avatarS3Key: true,
              user: {
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      const vodResults: SearchResult[] = vods.map((vod) => {
        let thumbnailUrl: string | undefined;
        let avatarUrl: string | undefined;
        
        try {
          thumbnailUrl = vod.thumbnailS3Key ? getCloudFrontUrl(vod.thumbnailS3Key) : undefined;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          avatarUrl = getAvatarUrl(vod.channel as any, vod.channel.user as any);
        } catch (error) {
          // Silently handle URL generation errors
        }

        return {
          id: vod.id,
          title: vod.title,
          type: "vod" as const,
          thumbnailUrl,
          viewCount: 0, // View tracking not yet implemented
          publishedAt: vod.publishedAt!.toISOString(),
          visibility: vod.visibility,
          slug: vod.channel.slug || vod.channel.id,
          displayName: vod.channel.displayName || "Unknown",
          avatarUrl,
        };
      });

      results.push(...vodResults);
    }

    // Search users if type is 'all' or 'users'
    if (query.type === "all" || query.type === "users") {
      const channels = await prisma.channel.findMany({
        where: {
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
        },
        take: Math.ceil(limit / 2), // Half the results for users
        orderBy: { createdAt: "desc" }, // Order by creation date instead of follower count
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
      });

      const userResults: SearchResult[] = channels.map((channel) => {
        let avatarUrl: string | undefined;
        
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          avatarUrl = getAvatarUrl(channel as any, channel.user as any);
        } catch (error) {
          // Silently handle URL generation errors
        }

        return {
          id: channel.id,
          title: channel.displayName || channel.user?.name || "Unknown",
          type: "user" as const,
          slug: channel.slug || channel.id,
          displayName: channel.displayName || channel.user?.name || "Unknown",
          avatarUrl,
          followerCount: channel._count.follows,
          isLive: channel.stream?.isLive ?? false,
        };
      });

      results.push(...userResults);
    }

    // Sort combined results by relevance (live users first, then by follower count/recency)
    results.sort((a, b) => {
      // Live users first
      if (a.type === "user" && a.isLive && b.type !== "user") return -1;
      if (b.type === "user" && b.isLive && a.type !== "user") return 1;
      
      // Then by follower count for users
      if (a.type === "user" && b.type === "user") {
        return (b.followerCount || 0) - (a.followerCount || 0);
      }
      
      // Then by recency for VODs
      if (a.type === "vod" && b.type === "vod") {
        return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
      }
      
      return 0;
    });

    // Limit results to requested amount
    const limitedResults = results.slice(0, limit);

    const response: SearchResponse = {
      results: limitedResults,
      pagination: {
        page,
        limit,
        total: limitedResults.length,
        totalPages: Math.ceil(limitedResults.length / limit),
        hasNext: limitedResults.length === limit,
        hasPrev: page > 1,
      },
      query: query.q,
      type: query.type,
    };

    // Cache the results
    await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(response));

    return successResponse("Search results", 200, response);
  } catch (err) {
    return errorResponse("Failed to search", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
