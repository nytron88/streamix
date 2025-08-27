import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { successResponse, errorResponse } from "@/lib/utils/responseWrapper";
import stripe from "@/lib/stripe/stripe";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import logger from "@/lib/utils/logger";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { mapStripeSubscriptionStatus } from "@/types/stripe";
import { unixToDate } from "@/utils/helpers";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const stripeCustomerId = session.customer as string;

  if (!userId || !stripeCustomerId) {
    logger.warn("Missing userId or customerId in checkout session", {
      sessionId: session.id,
      eventType: "checkout.session.completed",
    });
    throw new Error("Missing userId or customerId in checkout session");
  }

  // Create StripeCustomer record
  await prisma.stripeCustomer.upsert({
    where: { userId },
    update: {
      stripeCustomerId,
    },
    create: {
      userId,
      stripeCustomerId,
    },
  });

  logger.info("StripeCustomer created/updated", {
    userId,
    stripeCustomerId,
    sessionId: session.id,
    eventType: "checkout.session.completed",
  });

  return null;
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId as string | undefined;
  const channelId = subscription.metadata?.channelId as string | undefined;

  if (!userId || !channelId) {
    logger.warn("Missing userId/channelId in subscription metadata", {
      subscriptionId: subscription.id,
      eventType: "customer.subscription.created",
    });
    throw new Error(
      "Missing userId/channelId metadata for subscription creation"
    );
  }

  await prisma.subscription.upsert({
    where: { userId_channelId: { userId, channelId } },
    update: {
      stripeSubId: subscription.id,
      status: mapStripeSubscriptionStatus(subscription),
      currentPeriodEnd: unixToDate(
        subscription.items.data[0].current_period_end
      ),
    },
    create: {
      userId,
      channelId,
      stripeSubId: subscription.id,
      status: mapStripeSubscriptionStatus(subscription),
      currentPeriodEnd: unixToDate(
        subscription.items.data[0].current_period_end
      ),
    },
  });

  // Clear user subscriptions cache
  await Promise.allSettled([redis.del(`subscriptions:${userId}`)]);

  logger.info("Subscription created/upserted", {
    stripeSubscriptionId: subscription.id,
    userId,
    channelId,
    eventType: "customer.subscription.created",
  });

  return null;
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const updated = await prisma.subscription.updateMany({
    where: { stripeSubId: subscription.id },
    data: {
      status: mapStripeSubscriptionStatus(subscription),
      currentPeriodEnd: unixToDate(
        subscription.items.data[0].current_period_end
      ),
    },
  });

  if (updated.count === 0) {
    logger.warn("Subscription not found in database for update event", {
      stripeSubscriptionId: subscription.id,
      eventType: "customer.subscription.updated",
    });
    throw new Error("No matching subscription found for update");
  }

  // Clear cache for the affected user
  const subscriptionRecord = await prisma.subscription.findUnique({
    where: { stripeSubId: subscription.id },
    select: { userId: true },
  });

  if (subscriptionRecord) {
    await Promise.allSettled([
      redis.del(`subscriptions:${subscriptionRecord.userId}`),
    ]);
  }

  logger.info("Subscription updated event processed", {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    eventType: "customer.subscription.updated",
  });

  return null;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const updated = await prisma.subscription.updateMany({
    where: { stripeSubId: subscription.id },
    data: {
      status: "CANCELED",
      currentPeriodEnd: null,
    },
  });

  if (updated.count === 0) {
    logger.warn("Subscription not found in database for delete event", {
      stripeSubscriptionId: subscription.id,
      eventType: "customer.subscription.deleted",
    });
    throw new Error("No matching subscription found for delete");
  }

  // Clear cache for the affected user
  const subscriptionRecord = await prisma.subscription.findUnique({
    where: { stripeSubId: subscription.id },
    select: { userId: true },
  });

  if (subscriptionRecord) {
    await Promise.allSettled([
      redis.del(`subscriptions:${subscriptionRecord.userId}`),
    ]);
  }

  logger.info("Subscription deleted event processed", {
    stripeSubscriptionId: subscription.id,
    eventType: "customer.subscription.deleted",
  });

  return null;
}

function handleUnknownEvent(eventType: string, eventId: string) {
  logger.warn("Unhandled Stripe webhook event type", { eventType, eventId });
  return null;
}

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return errorResponse("Stripe signature is required", 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (error: any) {
    logger.error("Stripe webhook signature verification failed", {
      error: error.message,
    });
    return errorResponse(`Webhook Error: ${error.message}`, 400);
  }

  logger.info("Processing Stripe webhook", {
    eventType: event.type,
    eventId: event.id,
  });

  try {
    let handlerResult: any = null;

    switch (event.type) {
      case "checkout.session.completed":
        handlerResult = await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        handlerResult = await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        handlerResult = await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        handlerResult = await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        handlerResult = handleUnknownEvent(event.type, event.id);
        break;
    }

    if (handlerResult instanceof NextResponse) return handlerResult;
  } catch (err) {
    logger.error(
      `Error processing Stripe webhook event type ${event.type}:`,
      err
    );
    return errorResponse(
      err instanceof Error
        ? err.message
        : `Error processing ${event.type} webhook`,
      500,
      err instanceof Error ? err.message : undefined
    );
  }

  return successResponse("Webhook processed successfully", 200);
});
