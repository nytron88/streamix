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
import { TipNotificationService, TipNotificationData } from "@/lib/services/tipNotificationService";
import { SubscriptionNotificationService, SubscriptionNotificationData } from "@/lib/services/subscriptionNotificationService";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/* =============== CHECKOUT (ONE-TIME TIPS) =============== */
async function handleTipCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  if (metadata.purpose !== "tip") return null; // ignore non-tip sessions

  const channelId = metadata.channelId;
  const viewerId = metadata.viewerId;
  const amountCents = Number(session.amount_total ?? 0);

  if (!channelId || !amountCents) {
    logger.warn("Tip checkout missing channelId/amount", {
      sessionId: session.id,
      metadata,
    });
    return null;
  }

  // Ensure we have a Stripe customer record for the viewer (if logged in)
  if (viewerId && session.customer) {
    await prisma.stripeCustomer.upsert({
      where: { userId: viewerId },
      update: { stripeCustomerId: session.customer as string },
      create: {
        userId: viewerId,
        stripeCustomerId: session.customer as string,
      },
    });
  }

  // Record the tip in DB
  const tip = await prisma.tip.create({
    data: {
      userId: viewerId ?? null,
      channelId,
      amountCents,
      currency: session.currency ?? "usd",
      stripePaymentIntent: session.payment_intent as string,
      status: "SUCCEEDED",
    },
  });

  // Store tip notification in Redis
  const tipNotification: TipNotificationData = {
    id: tip.id,
    userId: viewerId ?? null,
    channelId,
    amountCents,
    currency: session.currency ?? "usd",
    stripePaymentIntent: session.payment_intent as string,
    status: "SUCCEEDED",
    createdAt: tip.createdAt.toISOString(),
    // Additional metadata will be populated by the worker
  };

  await TipNotificationService.storeNotification(tipNotification);

  logger.info("Tip recorded and notification stored", {
    channelId,
    viewerId,
    amountCents,
    sessionId: session.id,
    tipId: tip.id,
    eventType: "checkout.session.completed",
  });

  return null;
}

/* =============== CHECKOUT (CUSTOMER SAVE) =============== */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Only handle non-tip sessions here (subscriptions etc.)
  if (session.metadata?.purpose === "tip") return null;

  const userId = session.client_reference_id;
  const stripeCustomerId = session.customer as string;

  if (!userId || !stripeCustomerId) {
    logger.warn("Missing userId or customerId in checkout session", {
      sessionId: session.id,
      eventType: "checkout.session.completed",
    });
    return null;
  }

  await prisma.stripeCustomer.upsert({
    where: { userId },
    update: { stripeCustomerId },
    create: { userId, stripeCustomerId },
  });

  logger.info("StripeCustomer created/updated", {
    userId,
    stripeCustomerId,
    sessionId: session.id,
  });

  return null;
}

/* =============== SUBSCRIPTIONS =============== */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId as string | undefined;
  const channelId = subscription.metadata?.channelId as string | undefined;

  if (!userId || !channelId) {
    logger.warn("Missing userId/channelId in subscription metadata", {
      subscriptionId: subscription.id,
      eventType: "customer.subscription.created",
    });
    return null;
  }

  const sub = await prisma.subscription.upsert({
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

  // Store subscription notification in Redis
  const subscriptionNotification: SubscriptionNotificationData = {
    id: sub.id,
    userId,
    channelId,
    stripeSubId: subscription.id,
    status: mapStripeSubscriptionStatus(subscription),
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    createdAt: sub.createdAt.toISOString(),
    action: 'CREATED',
    // Additional metadata will be populated by the worker
  };

  await SubscriptionNotificationService.storeNotification(subscriptionNotification);

  await redis.del(`subscriptions:${userId}`);

  logger.info("Subscription created/upserted and notification stored", {
    stripeSubscriptionId: subscription.id,
    userId,
    channelId,
    subscriptionId: sub.id,
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
    });
    return null;
  }

  const record = await prisma.subscription.findUnique({
    where: { stripeSubId: subscription.id },
    select: { id: true, userId: true, channelId: true, currentPeriodEnd: true, createdAt: true },
  });

  if (record) {
    // Store subscription update notification in Redis
    const subscriptionNotification: SubscriptionNotificationData = {
      id: record.id,
      userId: record.userId,
      channelId: record.channelId,
      stripeSubId: subscription.id,
      status: mapStripeSubscriptionStatus(subscription),
      currentPeriodEnd: record.currentPeriodEnd?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      action: 'UPDATED',
      // Additional metadata will be populated by the worker
    };

    await SubscriptionNotificationService.storeNotification(subscriptionNotification);
    await redis.del(`subscriptions:${record.userId}`);
  }

  logger.info("Subscription updated and notification stored", {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    subscriptionId: record?.id,
  });

  return null;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const updated = await prisma.subscription.updateMany({
    where: { stripeSubId: subscription.id },
    data: { status: "CANCELED", currentPeriodEnd: null },
  });

  if (updated.count === 0) {
    logger.warn("Subscription not found in database for delete event", {
      stripeSubscriptionId: subscription.id,
    });
    return null;
  }

  const record = await prisma.subscription.findUnique({
    where: { stripeSubId: subscription.id },
    select: { id: true, userId: true, channelId: true, createdAt: true },
  });

  if (record) {
    // Store subscription delete notification in Redis
    const subscriptionNotification: SubscriptionNotificationData = {
      id: record.id,
      userId: record.userId,
      channelId: record.channelId,
      stripeSubId: subscription.id,
      status: "CANCELED",
      currentPeriodEnd: null,
      createdAt: record.createdAt.toISOString(),
      action: 'DELETED',
      // Additional metadata will be populated by the worker
    };

    await SubscriptionNotificationService.storeNotification(subscriptionNotification);
    await redis.del(`subscriptions:${record.userId}`);
  }

  logger.info("Subscription deleted and notification stored", {
    stripeSubscriptionId: subscription.id,
    subscriptionId: record?.id,
  });

  return null;
}

/* =============== INVOICE (RENEWALS) =============== */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.lines.data[0].subscription) return null;
  const subscriptionId = invoice.lines.data[0].subscription as string;

  const updated = await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: unixToDate(invoice.lines.data[0].period.end),
    },
  });

  if (updated.count > 0) {
    logger.info("Invoice payment succeeded → subscription extended", {
      stripeSubId: subscriptionId,
      periodEnd: invoice.lines.data[0].period.end,
    });
  }

  return null;
}

/* =============== FALLBACK =============== */
function handleUnknownEvent(eventType: string, eventId: string) {
  logger.warn("Unhandled Stripe webhook event type", { eventType, eventId });
  return null;
}

/* =============== MAIN HANDLER =============== */
export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return errorResponse("Stripe signature is required", 400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", {
      error: (err as Error).message,
    });
    return errorResponse(`Webhook Error: ${(err as Error).message}`, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleTipCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        handleUnknownEvent(event.type, event.id);
        break;
    }
  } catch (err) {
    logger.error(
      `Error processing Stripe webhook event type ${event.type}`,
      err
    );
    return errorResponse(
      err instanceof Error
        ? err.message
        : `Error processing ${event.type} webhook`,
      500
    );
  }

  return successResponse("Webhook processed successfully", 200);
});
