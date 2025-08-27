import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { successResponse, errorResponse } from "@/lib/utils/responseWrapper";
import stripe from "@/lib/stripe/stripe";
import type { StripeCreatePortalSessionResponse } from "@/types/stripe";
import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma/prisma";
import { isNextResponse, requireAuth } from "@/lib/api/requireAuth";

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();

  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  let userStripeCustomer;
  try {
    userStripeCustomer = await prisma.stripeCustomer.findUnique({
      where: {
        userId,
      },
    });
  } catch (error: any) {
    return errorResponse(`Database error: ${error.message}`, 500);
  }

  if (!userStripeCustomer) {
    return errorResponse(
      "User has no stripe customer ID. Please create a subscription first. If you already have a subscription, please contact support.",
      400
    );
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  let session;
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: userStripeCustomer.stripeCustomerId,
      return_url: `${origin}/subscriptions`,
    });
  } catch (error: any) {
    return errorResponse(
      `Stripe portal session creation failed: ${error.message}`,
      500
    );
  }

  return successResponse<StripeCreatePortalSessionResponse>(
    "Portal session created",
    200,
    {
      url: session.url,
    }
  );
});
