import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
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
        },
      },
    },
  });
  if (!channel) return errorResponse("Channel not found", 404);

  const ban = await prisma.ban.findUnique({
    where: { channelId_userId: { channelId: channel.id, userId: viewerId } },
    select: { expiresAt: true },
  });
  if (ban) {
    const expired = ban.expiresAt && ban.expiresAt < new Date();
    if (!expired) return errorResponse("You are banned from this channel", 403);
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

  // Check if user is the channel owner
  const isChannelOwner = channel.userId === viewerId;

  // Determine chat permissions
  const chatSettings = channel.stream;
  const canChat = chatSettings
    ? chatSettings.isChatEnabled &&
      (isChannelOwner ||
        !chatSettings.isChatFollowersOnly ||
        Boolean(isFollowing))
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
    canChat,
  };

  const token = await mintViewerToken({
    viewerId: uniqueIdentity,
    viewerName: user.name ?? null,
    roomName: channel.userId,
    subscribeOnly: true,
    canPublishData: canChat, // Allow data publishing (chat) based on permissions
    metadata: JSON.stringify(userMetadata),
    ttlSeconds: 600,
  });

  return successResponse("OK", 200, {
    token,
    wsUrl: LIVEKIT_WS_URL,
    roomName: channel.userId,
  });
});
