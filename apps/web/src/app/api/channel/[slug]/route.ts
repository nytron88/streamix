import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { logger } from "@/lib/utils/logger";
import { NextRequest } from "next/server";

const TTL_SECONDS = 300;

export const GET = withLoggerAndErrorHandler(async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: viewerId } = auth;
  const { slug } = params;

  // Validate slug format to prevent injection
  if (!slug || typeof slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return errorResponse("Invalid channel slug format", 400);
  }

  const cacheKey = `channel:slug:${slug}`;

  try {
    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return successResponse(
        "Channel fetched (cache)",
        200,
        JSON.parse(cached)
      );
    }

    // Find channel by slug
    const channel = await prisma.channel.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        stream: {
          select: {
            isLive: true,
            isChatEnabled: true,
            isChatDelayed: true,
            isChatFollowersOnly: true,
            isChatSubscribersOnly: true,
            name: true,
            thumbnailS3Key: true,
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
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Check if viewer is following this channel
    const follow = await prisma.follow.findUnique({
      where: {
        userId_channelId: {
          userId: viewerId,
          channelId: channel.id,
        },
      },
    });

    // Check if viewer is banned from this channel
    const ban = await prisma.ban.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: viewerId,
        },
      },
      select: {
        reason: true,
        expiresAt: true,
      },
    });

    // Check if viewer is the owner
    const isOwner = channel.userId === viewerId;

    // Get avatar and banner URLs
    const avatarUrl = await getAvatarUrl(channel.avatarS3Key);
    const bannerUrl = await getBannerUrl(channel.bannerS3Key);

    const response = {
      channel: {
        id: channel.id,
        userId: channel.userId,
        slug: channel.slug,
        displayName: channel.displayName,
        bio: channel.bio,
        category: channel.category,
        followerCount: channel._count.follows,
        subscriberCount: channel._count.subs,
        createdAt: channel.createdAt.toISOString(),
        user: channel.user,
        stream: channel.stream,
      },
      assets: {
        avatarUrl,
        bannerUrl,
      },
      viewer: {
        isFollowing: !!follow,
        isBanned: !!ban && (!ban.expiresAt || ban.expiresAt > new Date()),
        banReason: ban?.reason || null,
        banExpiresAt: ban?.expiresAt?.toISOString() || null,
        isOwner,
      },
    };

    // Cache the response
    await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(response));

    return successResponse("Channel fetched successfully", 200, response);
  } catch (err) {
    logger.error('Failed to fetch channel', {
      slug,
      viewerId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return errorResponse("Failed to fetch channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
