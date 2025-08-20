import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";

export const GET = withLoggerAndErrorHandler(async () => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  try {
    const channel = await prisma.channel.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    const stream = await prisma.stream.findUnique({
      where: { channelId: channel.id },
      select: {
        channelId: true,
        ingressId: true,
        serverUrl: true,
        streamKey: true,
        isLive: true,
        isChatEnabled: true,
        isChatDelayed: true,
        isChatFollowersOnly: true,
        name: true,
        thumbnailS3Key: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse("Stream information fetched", 200, stream);
  } catch (err) {
    return errorResponse("Failed to fetch stream information", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
