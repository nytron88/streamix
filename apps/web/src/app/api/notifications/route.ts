import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { NotificationsQuerySchema } from "@/schemas/notificationsQuerySchema";

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;
  
  // Rate limiting check (basic implementation)
  const rateLimitKey = `notifications:rate:${userId}`;
  const rateLimitCount = await redis.get(rateLimitKey);
  if (rateLimitCount && parseInt(rateLimitCount) > 100) { // 100 requests per minute
    return errorResponse("Rate limit exceeded", 429);
  }
  
  // Increment rate limit counter
  await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, 60); // 1 minute expiry
  const { searchParams } = new URL(req.url);

  // Parse query parameters
  const queryParams = {
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
    type: searchParams.get("type"),
  };

  let parsedQuery;
  try {
    parsedQuery = NotificationsQuerySchema.parse(queryParams);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid query parameters",
      400
    );
  }

  const { limit, offset, type } = parsedQuery;

  try {
    // Build where clause for filtering
    const whereClause: any = {
      userId: userId,
    };

    if (type) {
      whereClause.type = type;
    }

    // Fetch notifications with pagination
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100), // Cap at 100
        skip: offset,
        select: {
          id: true,
          type: true,
          payload: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: whereClause,
      }),
    ]);

    // Transform notifications to match frontend format
    const transformedNotifications = notifications.map((notification) => {
      const payload = notification.payload as any;
      return {
        id: notification.id,
        type: notification.type,
        userId: userId,
        channelId: payload.channelId || "",
        data: payload,
        createdAt: notification.createdAt.toISOString(),
      };
    });

    return successResponse("Notifications fetched successfully", 200, {
      notifications: transformedNotifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (err) {
    return errorResponse("Failed to fetch notifications", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
