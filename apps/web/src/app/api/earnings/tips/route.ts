import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { TipsQuerySchema } from "@/schemas/earningsQuerySchema";

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  try {
    const authResult = await requireAuth();
    if (isNextResponse(authResult)) return authResult;
    const { userId } = authResult;
    const { searchParams } = new URL(req.url);

    const query = TipsQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
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
    const where = {
      channelId: channel.id,
      status: "SUCCEEDED" as const,
    };

    // Get tips with pagination
    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.tip.count({ where }),
    ]);

    // Transform the data for the frontend
    const tipEarnings = tips.map((tip) => ({
      id: tip.id,
      tipperName: tip.user?.name || "Anonymous",
      tipperEmail: tip.user?.email || "No email",
      amount: tip.amountCents / 100, // Convert cents to dollars
      message: undefined, // Tip model doesn't have message field in schema
      createdAt: tip.createdAt.toISOString(),
    }));

    return successResponse("Tip earnings retrieved successfully", 200, {
      tips: tipEarnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in earnings tips API:", error);
    return errorResponse("Internal server error", 500);
  }
});
