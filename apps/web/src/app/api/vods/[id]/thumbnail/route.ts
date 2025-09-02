import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { z } from "zod";

const ThumbnailUploadSchema = z.object({
  thumbnailS3Key: z.string().min(1),
});

export const POST = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const vodId = params.id;

  const body = await req.json();
  const { thumbnailS3Key } = ThumbnailUploadSchema.parse(body);

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Update VOD thumbnail
  const updatedVod = await prisma.vod.updateMany({
    where: {
      id: vodId,
      channelId: channel.id,
    },
    data: {
      thumbnailS3Key,
    },
  });

  if (updatedVod.count === 0) {
    return errorResponse("VOD not found", 404);
  }

  return successResponse("Thumbnail updated successfully", 200, {
    thumbnailS3Key,
  });
});
