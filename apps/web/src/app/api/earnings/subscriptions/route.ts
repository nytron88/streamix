import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import { EarningsQuerySchema } from "@/schemas/earningsQuerySchema";

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  try {
    const authResult = await requireAuth();
    if (isNextResponse(authResult)) return authResult;
    const { userId } = authResult;
    const { searchParams } = new URL(req.url);

    const query = EarningsQuerySchema.parse({
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      status: searchParams.get("status") || undefined,
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
      where.status = query.status;
    } else {
      where.status = {
        in: ["ACTIVE", "PAST_DUE", "CANCEL_SCHEDULED", "CANCELED"],
      };
    }

    // Get subscriptions with pagination
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
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
      prisma.subscription.count({ where }),
    ]);

    // Transform the data for the frontend
    const subscriptionEarnings = subscriptions.map((sub) => ({
      id: sub.id,
      subscriberId: sub.userId,
      subscriberName: sub.user.name || "Anonymous",
      subscriberEmail: sub.user.email || "No email",
      amount: 9.99, // Default subscription amount - you may want to store this in the database
      status: sub.status,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    }));

    return successResponse(
      "Subscription earnings retrieved successfully",
      200,
      {
        subscriptions: subscriptionEarnings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      }
    );
  } catch (error) {
    console.error("Error in earnings subscriptions API:", error);
    return errorResponse("Internal server error", 500);
  }
});
