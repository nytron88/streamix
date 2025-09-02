import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { z } from "zod";

const QuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  status: z.enum(["PUBLIC", "SUB_ONLY"]).optional(),
  search: z.string().nullable().optional(),
});

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const { searchParams } = new URL(req.url);

  const query = QuerySchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    status: searchParams.get("status") || undefined,
    search: searchParams.get("search"),
  });

  const page = parseInt(query.page);
  const limit = Math.min(parseInt(query.limit), 50); // Max 50 per page
  const skip = (page - 1) * limit;

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Build where clause
  const where: Record<string, unknown> = {
    channelId: channel.id,
  };

  if (query.status) {
    where.visibility = query.status;
  }

  if (query.search) {
    where.title = {
      contains: query.search,
      mode: "insensitive",
    };
  }

  // Get VODs with pagination
  const [vods, total] = await Promise.all([
    prisma.vod.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  // Add CloudFront URLs (view counts would need to be implemented separately)
  const vodsWithStats = vods.map((vod) => ({
    ...vod,
    viewCount: 0, // TODO: Implement view tracking
    s3Url: vod.s3Key ? getCloudFrontUrl(vod.s3Key) : null,
    thumbnailUrl: vod.thumbnailS3Key
      ? getCloudFrontUrl(vod.thumbnailS3Key)
      : null,
  }));

  return successResponse("VODs retrieved successfully", 200, {
    vods: vodsWithStats,
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
