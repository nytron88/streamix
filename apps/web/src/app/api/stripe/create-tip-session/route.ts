import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import prisma from "@/lib/prisma/prisma";
import stripe from "@/lib/stripe/stripe";
import logger from "@/lib/utils/logger";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { userId } = auth;

  const body = (await req.json()) as {
    channelId?: string;
    amountCents?: number; // required: collect on UI
    min?: number; // optional safeguard (default 100 = $1.00)
    max?: number; // optional safeguard (default 100000 = $1000)
  };

  const channelId = body.channelId;
  if (!channelId) return errorResponse("Missing channelId", 400);

  // Don't allow tipping your own channel
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: {
      userId: true,
      displayName: true,
      slug: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });
  if (!channel) return errorResponse("Channel not found", 404);
  if (channel.userId === userId) {
    return errorResponse("Cannot tip your own channel", 400);
  }

  // Amount: must be provided by client
  const min = Number.isFinite(body.min)
    ? Math.max(1, Math.floor(body.min!))
    : 100; // default $1.00
  const max = Number.isFinite(body.max) ? Math.floor(body.max!) : 100000; // default $1000.00
  const amountCents = Math.floor(body.amountCents ?? 0);

  if (!Number.isFinite(amountCents) || amountCents < min || amountCents > max) {
    return errorResponse(`Amount must be between ${min} and ${max} cents`, 400);
  }

  // Reuse Stripe Customer if exists
  const sc = await prisma.stripeCustomer.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  const customer = sc?.stripeCustomerId;

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Stream Tip" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      // Put identifiers in both Session and PaymentIntent metadata
      payment_intent_data: {
        metadata: {
          purpose: "tip",
          channelId,
          channelName: channel.displayName || "Unknown Channel",
          viewerId: userId,
          amountCents: String(amountCents),
        },
      },
      metadata: {
        purpose: "tip",
        channelId,
        channelName: channel.displayName || "Unknown Channel",
        viewerId: userId,
        min_amount: String(min),
        max_amount: String(max),
      },
      success_url: `${SITE_URL}/tip/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/channel/${
        channel.slug || channel.user?.name || channelId
      }`,
      allow_promotion_codes: false,
    },
    {
      // Best-effort idempotency if user double-clicks the tip button
      idempotencyKey: `tip_${userId}_${channelId}_${amountCents}`,
    }
  );

  logger.info("Created tip checkout session", {
    sessionId: session.id,
    channelId,
    viewerId: userId,
    amountCents,
  });

  return successResponse("Tip checkout session created", 200, {
    id: session.id,
    url: session.url,
  });
});
