import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { ViewTrackingService } from "@/lib/services/viewTrackingService";

export const GET = withLoggerAndErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const vodId = params.id;

    // Get VOD with channel information
    const vod = await prisma.vod.findUnique({
      where: {
        id: vodId,
        publishedAt: { not: null }, // Only published VODs
      },
      select: {
        id: true,
        title: true,
        visibility: true,
        s3Key: true,
        s3Bucket: true,
        s3Region: true,
        s3ETag: true,
        providerAssetId: true,
        publishedAt: true,
        createdAt: true,
        thumbnailS3Key: true,
        channel: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!vod) {
      return errorResponse("VOD not found", 404);
    }

    // Get view count from Redis
    const viewCount = await ViewTrackingService.getViewCount(vodId);

    // Add CloudFront URLs and view count
    const vodWithUrls = {
      ...vod,
      s3Url: vod.s3Key ? getCloudFrontUrl(vod.s3Key) : null,
      thumbnailUrl: vod.thumbnailS3Key
        ? getCloudFrontUrl(vod.thumbnailS3Key)
        : null,
      viewCount,
    };

    return successResponse("VOD retrieved successfully", 200, vodWithUrls);
  }
);
