import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";

export const GET = withLoggerAndErrorHandler(async (_) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  try {
    let channel = await prisma.channel.findUnique({
      where: {
        userId,
      },
    });

    // edge case: user has no channel, create one
    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          userId,
          displayName: auth.user.name ?? null,
        },
      });
    }
    return successResponse("Channel fetched successfully", 200, { channel });
  } catch (err) {
    return errorResponse("Database error while fetching channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
