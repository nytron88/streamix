import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { mintViewerToken } from "@/lib/services/livekitToken";

const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!;

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId: viewerId, user } = auth;
  const { slug, channelId } = await req.json().catch(() => ({}));

  if (!slug && !channelId) {
    return errorResponse("slug or channelId required", 400);
  }

  const channel = await prisma.channel.findFirst({
    where: slug ? { slug } : { id: channelId },
    select: {
      id: true,
      userId: true,
      displayName: true,
      stream: {
        select: {
          isLive: true,
          isChatEnabled: true,
          isChatDelayed: true,
          isChatFollowersOnly: true,
          isChatSubscribersOnly: true,
        },
      },
    },
  });
  if (!channel) return errorResponse("Channel not found", 404);

  // Check for bidirectional bans with caching
  const banCacheKey = `ban:check:${channel.id}:${viewerId}`;
  let isBanned = false;
  
  const cachedBanResult = await redis.get(banCacheKey);
  if (cachedBanResult !== null) {
    isBanned = cachedBanResult === "true";
  } else {
    // Get viewer's channel for bidirectional check
    const viewerChannel = await prisma.channel.findUnique({
      where: { userId: viewerId },
      select: { id: true },
    });

    // Check for bans in either direction
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
      select: { id: true },
    });

    isBanned = bans.length > 0;
    
    // Cache the result for 5 minutes
    await redis.setex(banCacheKey, 300, isBanned ? "true" : "false");
  }
  
  if (isBanned) {
    return errorResponse("Access denied. Stream is not available.", 403);
  }

  // Check if user is following this channel (for follower-only chat)
  const isFollowing = await prisma.follow.findUnique({
    where: {
      userId_channelId: {
        userId: viewerId,
        channelId: channel.id,
      },
    },
    select: { id: true },
  });

  // Check if user is subscribed to this channel (for subscriber-only chat)
  const isSubscribed = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId: viewerId,
        channelId: channel.id,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  const hasActiveSubscription =
    isSubscribed &&
    ["ACTIVE", "CANCEL_SCHEDULED"].includes(isSubscribed.status);

  // Check if user is the channel owner
  const isChannelOwner = channel.userId === viewerId;

  // Determine chat permissions
  const chatSettings = channel.stream;
  const canChat = chatSettings
    ? chatSettings.isChatEnabled &&
      (isChannelOwner ||
        ((!chatSettings.isChatFollowersOnly || Boolean(isFollowing)) &&
          (!chatSettings.isChatSubscribersOnly || hasActiveSubscription)))
    : false;

  // Generate unique identity for this connection to allow multiple devices/tabs
  const uniqueIdentity = `${viewerId}_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Create user metadata for the chat
  const userMetadata = {
    userId: viewerId,
    username: user.name || "Anonymous",
    isChannelOwner,
    isFollowing: Boolean(isFollowing),
    isSubscribed: hasActiveSubscription,
    canChat,
  };

  const token = await mintViewerToken({
    viewerId: uniqueIdentity,
    viewerName: user.name ?? null,
    roomName: channel.userId,
    subscribeOnly: true,
    canPublishData: Boolean(canChat), // Allow data publishing (chat) based on permissions
    metadata: JSON.stringify(userMetadata),
    ttlSeconds: 600,
  });

  return successResponse("OK", 200, {
    token,
    wsUrl: LIVEKIT_WS_URL,
    roomName: channel.userId,
  });
});
