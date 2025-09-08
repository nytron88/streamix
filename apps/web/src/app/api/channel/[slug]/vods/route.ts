import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { getCloudFrontUrl } from "@/lib/services/s3Service";
import { z } from "zod";
import logger from "@/lib/utils/logger";

const QuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  status: z.enum(["PUBLIC", "SUB_ONLY"]).optional(),
  search: z.string().nullable().optional(),
});

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params;

  try {
    const authResult = await requireAuth();
    if (isNextResponse(authResult)) return authResult;
    const { userId: viewerId } = authResult;
    const { searchParams } = new URL(req.url);

    // Validate slug format
    if (!slug || typeof slug !== "string" || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return errorResponse("Invalid channel slug format", 400);
    }

    const query = QuerySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search"),
    });

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 50); // Max 50 per page
    const skip = (page - 1) * limit;

    // Find channel by slug
    const channel = await prisma.channel.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        displayName: true,
        slug: true,
      },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Check if viewer is banned from this channel
    const ban = await prisma.ban.findUnique({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: viewerId,
        },
      },
      select: {
        reason: true,
        expiresAt: true,
      },
    });

    // If banned, return error
    if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
      return errorResponse(
        "Access denied. You are banned from this channel.",
        403
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      channelId: channel.id,
    };

    // If not the channel owner, only show public VODs
    if (channel.userId !== viewerId) {
      where.visibility = "PUBLIC";
    } else if (query.status) {
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
          viewCount: true,
        },
      }),
      prisma.vod.count({ where }),
    ]);

    // Add CloudFront URLs
    const vodsWithStats = vods.map((vod) => ({
      ...vod,
      s3Url: vod.s3Key ? getCloudFrontUrl(vod.s3Key) : null,
      thumbnailUrl: vod.thumbnailS3Key
        ? getCloudFrontUrl(vod.thumbnailS3Key)
        : null,
    }));

    return successResponse("Channel VODs retrieved successfully", 200, {
      channel: {
        id: channel.id,
        displayName: channel.displayName,
        slug: channel.slug,
      },
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
  } catch (err) {
    logger.error("Failed to fetch channel VODs", {
      slug: slug,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return errorResponse("Failed to fetch channel VODs", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
