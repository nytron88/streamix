import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { ClearNotificationsBodySchema } from "@/schemas/notificationsQuerySchema";

export const DELETE = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  let body: { type?: 'TIP' | 'FOLLOW' | 'SUB' } = {};
  try {
    const contentType = req.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = ClearNotificationsBodySchema.parse(await req.json());
    }
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  const { type } = body;

  try {
    // Build where clause for deletion
    const whereClause: any = {
      userId: userId,
    };

    if (type) {
      whereClause.type = type;
    }

    // Delete notifications from database
    const deleteResult = await prisma.notification.deleteMany({
      where: whereClause,
    });

    return successResponse("Notifications cleared successfully", 200, {
      deletedCount: deleteResult.count,
      clearedType: type || 'all',
    });
  } catch (err) {
    return errorResponse("Failed to clear notifications", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
