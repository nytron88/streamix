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

    // Cache only static channel data, not viewer-specific data
    const staticCacheKey = `channel:slug:${slug}`;

    try {
      // Try cache first for static channel data only
      const cached = await redis.get(staticCacheKey);
      let cachedChannel = null;
      if (cached) {
        cachedChannel = JSON.parse(cached);
      }

      // Use cached channel data if available, otherwise fetch from DB
      let baseChannel = cachedChannel;

      if (!baseChannel) {
        // Find channel by slug
        baseChannel = await prisma.channel.findUnique({
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

        // If not found by slug, try to find by displayName or user name as fallback for channels without slugs
        if (!baseChannel) {
          baseChannel = await prisma.channel.findFirst({
            where: {
              OR: [
                { displayName: { equals: slug, mode: "insensitive" } },
                { user: { name: { equals: slug, mode: "insensitive" } } },
              ],
            },
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
        }

        if (!baseChannel) {
          return errorResponse("Channel not found", 404);
        }

        // Cache only static channel data (no counts - they change frequently)
        const channelDataToCache = {
          id: baseChannel.id,
          userId: baseChannel.userId,
          slug: baseChannel.slug,
          displayName: baseChannel.displayName,
          bio: baseChannel.bio,
          category: baseChannel.category,
          avatarS3Key: baseChannel.avatarS3Key,
          bannerS3Key: baseChannel.bannerS3Key,
          createdAt: baseChannel.createdAt,
          updatedAt: baseChannel.updatedAt,
          user: baseChannel.user,
          // Note: stream status and counts are fetched fresh each time
        };
        await redis.set(
          staticCacheKey,
          JSON.stringify(channelDataToCache),
          "EX",
          TTL_SECONDS
        );
      }

      // Always fetch fresh counts and stream status (not cached)
      const dynamicData = await prisma.channel.findUnique({
        where: { id: baseChannel.id },
        select: {
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

      if (!dynamicData) {
        return errorResponse("Channel data not found", 404);
      }

      // Combine cached static data with fresh dynamic data
      const channel = {
        ...baseChannel,
        stream: dynamicData.stream,
        _count: dynamicData._count,
      };

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

      // Check for bidirectional bans (either direction blocks access)
      const viewerChannel = await prisma.channel.findUnique({
        where: { userId: viewerId },
        select: { id: true },
      });

      const bans = await prisma.ban.findMany({
        where: {
          OR: [
            // Viewer is banned from this channel
            {
              channelId: channel.id,
              userId: viewerId,
              OR: [
                { expiresAt: null }, // Permanent ban
                { expiresAt: { gt: new Date() } }, // Non-expired ban
              ],
            },
            // Channel owner is banned from viewer's channel (mutual blocking)
            viewerChannel ? {
              channelId: viewerChannel.id,
              userId: channel.userId,
              OR: [
                { expiresAt: null }, // Permanent ban
                { expiresAt: { gt: new Date() } }, // Non-expired ban
              ],
            } : {},
          ].filter(Boolean),
        },
        select: {
          id: true,
          reason: true,
          expiresAt: true,
          userId: true,
          channelId: true,
        },
      });

      // If ANY ban exists in either direction, block access completely
      if (bans.length > 0) {
        return errorResponse("Access denied. Channel is not available.", 403);
      }

      const isBanned = false; // No bans found

      const payload = {
        channel: {
          id: channel.id,
          userId: channel.userId,
          slug: channel.slug,
          displayName: channel.displayName,
          bio: channel.bio,
          category: channel.category,
          followerCount: channel._count.follows,
          subscriberCount: channel._count.subs,
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
          isOwner: channel.userId === viewerId,
        },
      };

      // Note: We don't cache the full payload since it includes viewer-specific data
      // Static channel data is already cached above
      return successResponse("Channel fetched successfully", 200, payload);
    } catch (err) {
      return errorResponse("Failed to fetch channel", 500, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
