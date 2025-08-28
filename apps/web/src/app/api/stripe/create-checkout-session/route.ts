import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { successResponse, errorResponse } from "@/lib/utils/responseWrapper";
import stripe from "@/lib/stripe/stripe";
import prisma from "@/lib/prisma/prisma";
import type { NextRequest } from "next/server";
import type { StripeCreateCheckoutSessionResponse } from "@/types/stripe";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();

  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  const { channelId } = await request.json();

  // Get the subscription product ID from environment
  const productId = process.env.STRIPE_SUBSCRIPTION_PRODUCT_ID;

  if (!productId) {
    return errorResponse("Stripe product not configured", 500);
  }

  // Get the active price for the product
  let finalPriceId: string;
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      return errorResponse(
        "No active price found for subscription product",
        500
      );
    }

    finalPriceId = prices.data[0].id;
  } catch (error: any) {
    return errorResponse(
      `Failed to fetch product pricing: ${error.message}`,
      500
    );
  }

  if (!channelId) {
    return errorResponse("Channel ID is required", 400);
  }

  // Verify channel exists and user is not banned
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      displayName: true,
      slug: true,
      user: {
        select: {
          name: true,
        },
      },
      bans: {
        where: {
          userId: userId,
          OR: [
            { expiresAt: null }, // Permanent ban
            { expiresAt: { gt: new Date() } }, // Non-expired ban
          ],
        },
        select: { id: true },
      },
    },
  });

  if (!channel) {
    return errorResponse("Channel not found", 404);
  }

  // Prevent banned users from subscribing
  if (channel.bans.length > 0) {
    return errorResponse("You cannot subscribe to this channel because you are banned", 403);
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  if (!origin) {
    return errorResponse("Origin is required", 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    client_reference_id: userId,
    metadata: {
      channelId,
      channelName: channel.displayName || "Unknown Channel",
    },
    subscription_data: {
      metadata: {
        userId,
        channelId,
      },
    },
    line_items: [
      {
        price: finalPriceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/channel/${
      channel.slug || channel.user?.name || channelId
    }`,
  });

  return successResponse<StripeCreateCheckoutSessionResponse>(
    "Checkout session created",
    200,
    {
      id: session.id,
    }
  );
});
