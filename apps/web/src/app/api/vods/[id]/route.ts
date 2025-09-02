import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { z } from "zod";

const VodUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  visibility: z.enum(["PUBLIC", "SUB_ONLY"]).optional(),
});

export const GET = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const vodId = params.id;

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
      title: true,
      visibility: true,
      durationS: true,
      s3Key: true,
      s3Bucket: true,
      s3Region: true,
      s3ETag: true,
      providerAssetId: true,
      publishedAt: true,
      createdAt: true,
      thumbnailS3Key: true,
    },
  });

  if (!vod) {
    return errorResponse("VOD not found", 404);
  }

  return successResponse("VOD retrieved successfully", 200, {
    vod: {
      ...vod,
      viewCount: 0, // TODO: Implement view tracking
      s3Url: vod.s3Key ? `https://${vod.s3Bucket}.s3.${vod.s3Region}.amazonaws.com/${vod.s3Key}` : null,
    },
  });
});

export const PATCH = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const vodId = params.id;

  const body = await req.json();
  const updateData = VodUpdateSchema.parse(body);

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Update VOD
  const updatedVod = await prisma.vod.updateMany({
    where: {
      id: vodId,
      channelId: channel.id,
    },
    data: updateData,
  });

  if (updatedVod.count === 0) {
    return errorResponse("VOD not found", 404);
  }

  return successResponse("VOD updated successfully", 200, {
    updated: true,
  });
});

export const DELETE = withLoggerAndErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;
  const vodId = params.id;

  // Get user's channel
  const channel = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Delete VOD
  const deletedVod = await prisma.vod.deleteMany({
    where: {
      id: vodId,
      channelId: channel.id,
    },
  });

  if (deletedVod.count === 0) {
    return errorResponse("VOD not found", 404);
  }

  return successResponse("VOD deleted successfully", 200, {
    deleted: true,
  });
});
