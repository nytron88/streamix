import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  try {
    const authResult = await requireAuth();
    if (isNextResponse(authResult)) return authResult;
    const { userId } = authResult;

    // Get user's channel
    const channel = await prisma.channel.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get subscription data
    const subscriptions = await prisma.subscription.findMany({
      where: {
        channelId: channel.id,
        status: {
          in: ["ACTIVE", "PAST_DUE", "CANCEL_SCHEDULED", "CANCELED"],
        },
      },
    });

    const activeSubscriptions = subscriptions.filter(
      (sub) => sub.status === "ACTIVE"
    );
    const totalSubscriptions = subscriptions.length;
    const activeSubscribers = activeSubscriptions.length;

    // Calculate subscription earnings
    const subscriptionEarnings = subscriptions.reduce((total, sub) => {
      const amount = 9.99; // Default subscription amount - you may want to store this in the database
      return total + amount;
    }, 0);

    // Get tip data
    const tips = await prisma.tip.findMany({
      where: {
        channelId: channel.id,
        status: "SUCCEEDED" as const,
      },
    });

    const totalTips = tips.reduce(
      (total, tip) => total + tip.amountCents / 100,
      0
    );

    // Get monthly tip earnings
    const monthlyTips = tips.filter((tip) => tip.createdAt >= monthStart);
    const monthlyTipEarnings = monthlyTips.reduce(
      (total, tip) => total + tip.amountCents / 100,
      0
    );

    // Calculate monthly subscription earnings (only active subscriptions count for current month)
    const monthlySubscriptionEarnings = activeSubscriptions.reduce(
      (total, sub) => {
        const amount = 9.99; // Default subscription amount - you may want to store this in the database
        return total + amount;
      },
      0
    );

    const totalEarnings = subscriptionEarnings + totalTips;
    const monthlyEarnings = monthlySubscriptionEarnings + monthlyTipEarnings;

    const summary = {
      totalSubscriptions,
      totalTips,
      totalEarnings,
      monthlyEarnings,
      activeSubscribers,
    };

    return successResponse(
      "Earnings summary retrieved successfully",
      200,
      summary
    );
  } catch (error) {
    console.error("Error in earnings summary API:", error);
    return errorResponse("Internal server error", 500);
  }
});
