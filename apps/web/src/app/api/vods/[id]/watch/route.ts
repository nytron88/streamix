import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { getCloudFrontSignedUrl } from "@/lib/services/s3Service";
import { z } from "zod";

const WatchSchema = z.object({
  expiresIn: z.number().min(300).max(86400).optional().default(3600), // 5 min to 24 hours, default 1 hour
});

export const POST = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const vodId = params.id;

  try {
    const body = await req.json();
    const { expiresIn } = WatchSchema.parse(body);

    // Get user's channel
    const channel = await prisma.channel.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Get VOD
    const vod = await prisma.vod.findFirst({
      where: {
        id: vodId,
        channelId: channel.id,
      },
      select: {
        id: true,
        s3Key: true,
        title: true,
        visibility: true,
      },
    });

    if (!vod) {
      return errorResponse("VOD not found", 404);
    }

    if (!vod.s3Key) {
      return errorResponse("Video file not available", 400);
    }

    // Generate signed URL for video access
    const signedUrl = getCloudFrontSignedUrl(vod.s3Key, expiresIn);

    return successResponse("Signed URL generated successfully", 200, {
      signedUrl,
      expiresIn,
      vod: {
        id: vod.id,
        title: vod.title,
        visibility: vod.visibility,
      },
    });
  } catch (error: any) {
    return errorResponse("Failed to generate watch URL", 500, {
      message: error.message,
    });
  }
});
