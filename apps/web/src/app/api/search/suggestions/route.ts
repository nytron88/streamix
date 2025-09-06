import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import redis from "@/lib/redis/redis";
import prisma from "@/lib/prisma/prisma";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const TTL_SECONDS = 300; // 5 minutes

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return successResponse("Search suggestions", 200, { suggestions: [] });
  }

  // Create cache key
  const cacheKey = `search:suggestions:${query}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("Search suggestions (cache)", 200, parsed);
    }

    // Get suggestions from channels and VODs
    const [channelSuggestions, vodSuggestions] = await Promise.all([
      prisma.channel.findMany({
        where: {
          OR: [
            {
              displayName: {
                startsWith: query,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                startsWith: query,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          displayName: true,
          slug: true,
        },
        take: 3,
      }),
      prisma.vod.findMany({
        where: {
          publishedAt: { not: null },
          title: {
            startsWith: query,
            mode: 'insensitive',
          },
        },
        select: {
          title: true,
        },
        take: 2,
      }),
    ]);

    const suggestions = [
      ...channelSuggestions.map(c => c.displayName || c.slug).filter(Boolean),
      ...vodSuggestions.map(v => v.title).filter(Boolean),
    ].slice(0, 5);

    const response = { suggestions };

    // Cache the results
    await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(response));

    return successResponse("Search suggestions", 200, response);
  } catch (err) {
    return errorResponse("Failed to get suggestions", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
