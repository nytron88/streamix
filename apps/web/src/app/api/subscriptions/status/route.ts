import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { successResponse, errorResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { type NextRequest } from "next/server";

export const GET = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();

  if (isNextResponse(auth)) return auth;

  const { userId } = auth;
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");

  if (!channelId) {
    return errorResponse("Channel ID is required", 400);
  }

  // Check if user has an active subscription to this channel
  // Note: Subscriptions are auto-cancelled when bans occur, so no need to check ban status
  const subscription = await prisma.subscription.findUnique({
    where: {
      userId_channelId: {
        userId,
        channelId,
      },
    },
    select: {
      id: true,
      status: true,
      currentPeriodEnd: true,
    },
  });

  const isSubscribed =
    subscription &&
    ["ACTIVE", "CANCEL_SCHEDULED"].includes(subscription.status);

  return successResponse("Subscription status retrieved", 200, {
    isSubscribed,
    subscription: isSubscribed ? subscription : undefined,
  });
});
