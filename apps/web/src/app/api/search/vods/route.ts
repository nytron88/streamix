import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { getAvatarUrl } from "@/lib/services/cdnService";
import { ViewCountHelper } from "@/lib/services/viewCountHelper";
import { VodSearchQuerySchema } from "@/schemas/searchQuerySchema";
import { VodSearchResponse, VodSearchResult } from "@/types/search";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 300; // 5 minutes

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Parse and validate query parameters
  const query = VodSearchQuerySchema.parse({
    q: searchParams.get("q") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    visibility: searchParams.get("visibility") || undefined,
  });

  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit)));
  const skip = (page - 1) * limit;

  // Create cache key
  const cacheKey = `search:vods:${query.q}:${page}:${limit}:${query.visibility || 'all'}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("VODs search results (cache)", 200, parsed);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      publishedAt: { not: null }, // Only published VODs
      title: {
        contains: query.q,
        mode: "insensitive",
      },
    };

    if (query.visibility) {
      where.visibility = query.visibility;
    }

    // Get VODs with pagination
    const [vods, total] = await Promise.all([
      prisma.vod.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          visibility: true,
          thumbnailS3Key: true,
          viewCount: true,
          publishedAt: true,
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
      }),
      prisma.vod.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Get combined view counts for all VODs
    const vodIds = vods.map(vod => vod.id);
    const dbViewCounts = vods.reduce((acc, vod) => {
      acc[vod.id] = vod.viewCount;
      return acc;
    }, {} as Record<string, number>);
    
    const combinedViewCounts = await ViewCountHelper.getCombinedViewCounts(vodIds, dbViewCounts);

    // Format results
    const results: VodSearchResult[] = vods.map((vod) => ({
      id: vod.id,
      title: vod.title,
      thumbnailUrl: vod.thumbnailS3Key ? getCloudFrontUrl(vod.thumbnailS3Key) : undefined,
      viewCount: combinedViewCounts[vod.id] || vod.viewCount,
      publishedAt: vod.publishedAt!.toISOString(),
      visibility: vod.visibility,
      channel: {
        id: vod.channel.id,
        slug: vod.channel.slug || vod.channel.id,
        displayName: vod.channel.displayName || "Unknown",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        avatarUrl: getAvatarUrl(vod.channel as any, vod.channel.user as any),
      },
    }));

    const response: VodSearchResponse = {
      vods: results,
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

    return successResponse("VODs search results", 200, response);
  } catch (err) {
    return errorResponse("Failed to search VODs", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
