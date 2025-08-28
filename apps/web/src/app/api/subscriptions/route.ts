import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { successResponse, errorResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import redis from "@/lib/redis/redis";

const TTL_SECONDS = 300;

export const GET = withLoggerAndErrorHandler(async () => {
  const auth = await requireAuth();

  if (isNextResponse(auth)) return auth;

  const { userId } = auth;
  const cacheKey = `subscriptions:${userId}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return successResponse(
        "Subscriptions fetched (cache)",
        200,
        JSON.parse(cached)
      );
    }

    // Fetch all active subscriptions for the user
    // Note: Subscriptions to banned channels are auto-cancelled during ban creation
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: {
          in: ["ACTIVE", "CANCEL_SCHEDULED"],
        },
      },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        createdAt: true,
        stripeSubId: true,
        channel: {
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
        createdAt: "desc",
      },
    });

    // Format the response with assets
    const formattedSubscriptions = subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      createdAt: sub.createdAt,
      stripeSubId: sub.stripeSubId,
      channel: {
        id: sub.channel.id,
        slug: sub.channel.slug,
        displayName: sub.channel.displayName,
        bio: sub.channel.bio,
        category: sub.channel.category,
        followerCount: sub.channel._count.follows,
        subscriberCount: sub.channel._count.subs,
        isLive: sub.channel.stream?.isLive || false,
        user: sub.channel.user,
        assets: {
          avatarUrl: getAvatarUrl(sub.channel, sub.channel.user),
          bannerUrl: getBannerUrl(sub.channel),
        },
      },
    }));

    const payload = {
      subscriptions: formattedSubscriptions,
      total: formattedSubscriptions.length,
    };

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);

    return successResponse("Subscriptions fetched successfully", 200, payload);
  } catch (err) {
    return errorResponse("Failed to fetch subscriptions", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
