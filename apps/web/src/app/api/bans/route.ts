import { NextRequest } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import stripe from "@/lib/stripe/stripe";
import { BanBodySchema } from "@/schemas/banBodySchema";
import { BanBody } from "@/types/ban";

/**
 * POST /api/bans - Ban a user from the authenticated user's channel
 */
export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: channelOwnerId } = auth;

  // Parse and validate request body
  let body: BanBody;
  try {
    body = BanBodySchema.parse(await req.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  const { userId, reason, expiresAt, isPermanent } = body;
  // Handle permanent vs temporary bans
  const expirationDate = isPermanent ? null : (expiresAt ? new Date(expiresAt) : undefined);

  try {
    // Get channel for the authenticated user
    const channel = await prisma.channel.findUnique({
      where: { userId: channelOwnerId },
      select: { id: true, userId: true },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Check if user is trying to ban themselves
    if (userId === channelOwnerId) {
      return errorResponse("You cannot ban yourself", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check if user exists
      const userToBan = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      });

      if (!userToBan) {
        throw new Error("User not found");
      }

      // Check if user is already banned
      const existingBan = await tx.ban.findUnique({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId: userId,
          },
        },
      });

      if (existingBan) {
        throw new Error("User is already banned");
      }

      // Get the banned user's channel for bidirectional cleanup
      const bannedUserChannel = await tx.channel.findUnique({
        where: { userId: userId },
        select: { id: true },
      });

      // Remove follow relationships BOTH ways for complete isolation
      await Promise.all([
        // Remove banned user following this channel
        tx.follow.deleteMany({
          where: { userId: userId, channelId: channel.id },
        }),
        // Remove channel owner following banned user's channel (if exists)
        bannedUserChannel ? tx.follow.deleteMany({
          where: { userId: channelOwnerId, channelId: bannedUserChannel.id },
        }) : Promise.resolve(),
      ]);

      // Check if user has existing paid subscription and cancel it
      const existingSubscription = await tx.subscription.findUnique({
        where: {
          userId_channelId: {
            userId: userId,
            channelId: channel.id,
          },
        },
        select: { id: true, status: true, stripeSubId: true },
      });

      // Auto-cancel active subscriptions bidirectionally
      const subscriptionsToCancel: Array<{id: string, stripeSubId: string}> = [];
      
      // 1. Cancel banned user's subscription to this channel
      if (existingSubscription && 
          existingSubscription.stripeSubId && 
          ["ACTIVE", "CANCEL_SCHEDULED"].includes(existingSubscription.status)) {
        subscriptionsToCancel.push({
          id: existingSubscription.id,
          stripeSubId: existingSubscription.stripeSubId
        });
      }

      // 2. Cancel channel owner's subscription to banned user's channel (if exists)
      if (bannedUserChannel) {
        const reverseSubscription = await tx.subscription.findUnique({
          where: {
            userId_channelId: {
              userId: channelOwnerId,
              channelId: bannedUserChannel.id,
            },
          },
          select: { id: true, status: true, stripeSubId: true },
        });

        if (reverseSubscription && 
            reverseSubscription.stripeSubId && 
            ["ACTIVE", "CANCEL_SCHEDULED"].includes(reverseSubscription.status)) {
          subscriptionsToCancel.push({
            id: reverseSubscription.id,
            stripeSubId: reverseSubscription.stripeSubId
          });
        }
      }

      // Cancel all subscriptions
      for (const sub of subscriptionsToCancel) {
        try {
          // Cancel subscription in Stripe immediately
          await stripe.subscriptions.cancel(sub.stripeSubId);
          
          // Update subscription status in our database
          await tx.subscription.update({
            where: { id: sub.id },
            data: { 
              status: "CANCELED",
              // Stripe will set the actual cancellation date
            },
          });
        } catch (stripeError) {
          // Log the error but don't fail the ban operation
          console.error("Failed to cancel Stripe subscription during ban:", stripeError);
          // Continue with ban creation even if Stripe cancellation fails
        }
      }

      // Create the ban
      const ban = await tx.ban.create({
        data: {
          channelId: channel.id,
          userId: userId,
          reason: reason,
          expiresAt: expirationDate,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        id: ban.id,
        userId: ban.userId,
        userName: ban.user.name,
        reason: ban.reason,
        expiresAt: ban.expiresAt?.toISOString() || null,
        createdAt: ban.createdAt.toISOString(),
        bannedUserChannel, // Include for cache invalidation
      };
    });

    // Clear relevant cache entries (comprehensive bidirectional cache invalidation)
    const cacheKeysToDelete = [
      // Ban-specific caches
      `bans:channel:${channel.id}`,
      `bans:user:${userId}`,
      `ban:check:${channel.id}:${userId}`,
      
      // Banned user's caches
      `follows:following:${userId}`,
      `subscriptions:${userId}`,
      
      // Channel owner's caches  
      `follows:following:${channelOwnerId}`,
      `subscriptions:${channelOwnerId}`,
      
      // Bidirectional follower caches
      `followers:${channel.id}`,
    ];

    // Add banned user's channel follower cache if they have a channel
    if (result.bannedUserChannel) {
      cacheKeysToDelete.push(`followers:${result.bannedUserChannel.id}`);
      cacheKeysToDelete.push(`ban:check:${result.bannedUserChannel.id}:${channelOwnerId}`);
    }

    // Delete exact cache keys
    await Promise.allSettled(cacheKeysToDelete.map(key => redis.del(key)));

    // Delete recommendation caches for both users (all limit variations)
    // Note: Redis doesn't have a simple pattern delete, so we'll clear common limits
    const commonLimits = [10, 12, 15, 20, 24, 25];
    const recCacheKeysToDelete = [];
    
    for (const limit of commonLimits) {
      recCacheKeysToDelete.push(`recs:channels:${userId}:${limit}`);
      recCacheKeysToDelete.push(`recs:channels:${channelOwnerId}:${limit}`);
    }
    
    await Promise.allSettled(recCacheKeysToDelete.map(key => redis.del(key)));

    return successResponse("User banned successfully", 200, {
      ban: result,
    });
  } catch (err) {
    return errorResponse("Failed to ban user", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * GET /api/bans - Get all bans for the authenticated user's channel
 */
export const GET = withLoggerAndErrorHandler(async () => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: channelOwnerId } = auth;

  try {
    // Get channel for the authenticated user
    const channel = await prisma.channel.findUnique({
      where: { userId: channelOwnerId },
      select: { id: true },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Check cache first
    const cacheKey = `bans:channel:${channel.id}`;
    const cachedBans = await redis.get(cacheKey);

    if (cachedBans) {
      return successResponse("Bans retrieved successfully", 200, {
        bans: JSON.parse(cachedBans),
      });
    }

    // Get active bans (not expired)
    const bans = await prisma.ban.findMany({
      where: {
        channelId: channel.id,
        OR: [
          { expiresAt: null }, // Permanent bans
          { expiresAt: { gt: new Date() } }, // Non-expired bans
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedBans = bans.map((ban) => ({
      id: ban.id,
      userId: ban.userId,
      userName: ban.user.name,
      userImageUrl: ban.user.imageUrl,
      reason: ban.reason,
      expiresAt: ban.expiresAt?.toISOString() || null,
      createdAt: ban.createdAt.toISOString(),
    }));

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(formattedBans));

    return successResponse("Bans retrieved successfully", 200, {
      bans: formattedBans,
    });
  } catch (err) {
    return errorResponse("Failed to fetch bans", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

