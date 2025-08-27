import { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

export type StripeCreateCheckoutSessionResponse = {
  id: string;
};

export type StripeCheckoutSession = Stripe.Checkout.Session;

export type StripeCreatePortalSessionResponse = {
  url: string;
};

export type StripeCheckoutSessionMetadata = {
  userId: string;
};

export function mapStripeSubscriptionStatus(
  s: Stripe.Subscription
): SubscriptionStatus {
  if (s.status === "canceled") return "CANCELED";
  if (s.cancel_at_period_end) return "CANCEL_SCHEDULED";
  if (s.status === "active" || s.status === "trialing") return "ACTIVE";
  // unpaid | past_due | incomplete | paused -> treat as PAST_DUE
  return "PAST_DUE";
}
