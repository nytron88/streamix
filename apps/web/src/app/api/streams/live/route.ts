import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";

const TTL_SECONDS = 30; // Short cache for live data

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 50);
    const skip = (page - 1) * limit;

    // Cache key for live streams
    const cacheKey = `live_streams:${page}:${limit}`;
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return successResponse("Live streams fetched from cache", 200, JSON.parse(cached));
      }
    } catch (error) {
      // Continue without cache if Redis fails
    }

    // Fetch live streams with channel info
    const liveStreams = await prisma.stream.findMany({
      where: {
        isLive: true,
      },
      select: {
        id: true,
        name: true,
        thumbnailS3Key: true,
        createdAt: true,
        channel: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            bio: true,
            category: true,
            avatarS3Key: true,
            bannerS3Key: true,
            user: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
            _count: {
              select: {
                follows: true,
                subs: {
                  where: {
                    status: {
                      in: ["ACTIVE", "CANCEL_SCHEDULED"],
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Most recently started streams first
      },
      skip,
      take: limit,
    });

    // Format the response
    const formattedStreams = liveStreams.map((stream) => ({
      id: stream.id,
      name: stream.name || `${stream.channel.displayName || stream.channel.user.name}'s Stream`,
      thumbnailUrl: stream.thumbnailS3Key 
        ? getBannerUrl({ bannerS3Key: stream.thumbnailS3Key } as any)
        : null,
      startedAt: stream.createdAt,
      channel: {
        id: stream.channel.id,
        slug: stream.channel.slug,
        displayName: stream.channel.displayName || stream.channel.user.name,
        bio: stream.channel.bio,
        category: stream.channel.category,
        avatarUrl: getAvatarUrl(stream.channel as any, stream.channel.user as any),
        bannerUrl: getBannerUrl(stream.channel as any),
        followerCount: stream.channel._count.follows,
        subscriberCount: stream.channel._count.subs,
      },
    }));

    const totalCount = await prisma.stream.count({
      where: { isLive: true },
    });

    const response = {
      streams: formattedStreams,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: skip + limit < totalCount,
        hasPrev: page > 1,
      },
    };

    // Cache the response
    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", TTL_SECONDS);
    } catch (error) {
      // Ignore cache errors
    }

    return successResponse("Live streams fetched", 200, response);
  } catch (err) {
    return errorResponse("Failed to fetch live streams", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
