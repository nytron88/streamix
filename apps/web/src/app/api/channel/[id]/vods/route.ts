import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { ViewTrackingService } from "@/lib/services/viewTrackingService";
import { z } from "zod";

const QuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  visibility: z.enum(["PUBLIC", "SUB_ONLY"]).optional(),
});

export const GET = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { id: slug } = params;
  const { searchParams } = new URL(req.url);

  const query = QuerySchema.parse({
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    visibility: searchParams.get("visibility") || undefined,
  });

  const page = parseInt(query.page);
  const limit = Math.min(parseInt(query.limit), 50); // Max 50 per page
  const skip = (page - 1) * limit;

  // Get channel by slug
  const channel = await prisma.channel.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Build where clause
  const where: Record<string, unknown> = {
    channelId: channel.id,
    publishedAt: { not: null }, // Only published VODs
  };

  if (query.visibility) {
    where.visibility = query.visibility;
  } else {
    // Default to only public VODs for non-authenticated users
    where.visibility = "PUBLIC";
  }

  // Get VODs with pagination
  const [vods, total] = await Promise.all([
    prisma.vod.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
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
      },
    }),
    prisma.vod.count({ where }),
  ]);

  // Get view counts from Redis for all VODs
  const vodIds = vods.map(vod => vod.id);
  const viewCounts = await ViewTrackingService.getViewCounts(vodIds);

  // Add CloudFront URLs and view counts
  const vodsWithUrls = vods.map((vod) => ({
    ...vod,
    s3Url: vod.s3Key ? getCloudFrontUrl(vod.s3Key) : null,
    thumbnailUrl: vod.thumbnailS3Key
      ? getCloudFrontUrl(vod.thumbnailS3Key)
      : null,
    viewCount: viewCounts[vod.id] || 0,
  }));

  return successResponse("Channel VODs retrieved successfully", 200, {
    vods: vodsWithUrls,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
});
