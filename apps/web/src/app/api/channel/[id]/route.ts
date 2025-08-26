import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";

const TTL_SECONDS = 60;

export const GET = withLoggerAndErrorHandler(
  async (_, { params }: { params: { id: string } }) => {
    const auth = await requireAuth();
    if (isNextResponse(auth)) return auth;

    const { userId: viewerId } = auth;
    const slug = params.id;

    if (!slug) {
      return errorResponse("Username is required", 400);
    }

    const cacheKey = `channel:slug:${slug}:viewer:${viewerId}`;

    try {
      // Try cache first
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
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          bio: true,
          category: true,
          avatarS3Key: true,
          bannerS3Key: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          stream: {
            select: {
              isLive: true,
              isChatEnabled: true,
              isChatDelayed: true,
              isChatFollowersOnly: true,
              name: true,
              thumbnailS3Key: true,
            },
          },
          _count: {
            select: {
              follows: true,
            },
          },
        },
      });

      if (!channel) {
        return errorResponse("Channel not found", 404);
      }

      // Check if viewer is following this channel
      const isFollowing = await prisma.follow.findUnique({
        where: {
          userId_channelId: {
            userId: viewerId,
            channelId: channel.id,
          },
        },
        select: { id: true },
      });

      // Check if viewer is banned
      const ban = await prisma.ban.findUnique({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId: viewerId,
          },
        },
        select: {
          id: true,
          reason: true,
          expiresAt: true,
        },
      });

      const isBanned = ban
        ? !ban.expiresAt || ban.expiresAt > new Date()
        : false;

      const payload = {
        channel: {
          id: channel.id,
          userId: channel.userId,
          slug: channel.slug,
          displayName: channel.displayName,
          bio: channel.bio,
          category: channel.category,
          followerCount: channel._count.follows,
          createdAt: channel.createdAt,
          user: channel.user,
          stream: channel.stream,
        },
        assets: {
          avatarUrl: getAvatarUrl(channel, channel.user),
          bannerUrl: getBannerUrl(channel),
        },
        viewer: {
          isFollowing: Boolean(isFollowing),
          isBanned,
          banReason: ban?.reason || null,
          banExpiresAt: ban?.expiresAt || null,
          isOwner: channel.userId === viewerId,
        },
      };

      // Cache for shorter time since it includes viewer-specific data
      await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);

      return successResponse("Channel fetched successfully", 200, payload);
    } catch (err) {
      return errorResponse("Failed to fetch channel", 500, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
