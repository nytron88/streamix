import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import logger from "@/lib/utils/logger";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: { id: string; email_address: string }[];
};

type HandlerResult = null | NextResponse;

export async function handleUserCreated(
  data: ClerkUser,
  svixId: string,
  svixTimestamp: string
): Promise<HandlerResult> {
  const email =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ?? null;
  const displayName =
    `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null;

  const DEFAULT_BANNER_KEY = "defaults/default_banner.png";
  const DEFAULT_AVATAR_KEY = undefined as string | undefined;

  const base =
    (
      email?.split("@")[0] ||
      displayName?.replace(/\s+/g, "-") ||
      data.id.slice(0, 8)
    )
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "") || data.id.slice(0, 8).toLowerCase();

  const slug = base.length >= 3 ? base : `${base}-${data.id.slice(0, 4)}`;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { id: data.id },
      update: {
        email,
        name: displayName,
        imageUrl: data.image_url ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: data.id,
        email,
        name: displayName,
        imageUrl: data.image_url ?? undefined,
      },
    });

    await tx.channel.create({
      data: {
        userId: user.id,
        slug,
        displayName: displayName ?? slug,
        bio: null,
        category: null,
        avatarS3Key: DEFAULT_AVATAR_KEY,
        bannerS3Key: DEFAULT_BANNER_KEY,
      },
    });
  });

  return null;
}

export async function handleUserUpdated(
  data: ClerkUser,
  svixId: string,
  svixTimestamp: string
): Promise<HandlerResult> {
  const email =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
      ?.email_address ?? null;
  const name =
    `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || null;

  await prisma.user
    .update({
      where: { id: data.id },
      data: {
        email,
        name,
        imageUrl: data.image_url ?? undefined,
        updatedAt: new Date(),
      },
    })
    .catch(() => {
      // If user doesn’t exist (rare race), upsert instead
      return prisma.user.upsert({
        where: { id: data.id },
        update: {
          email,
          name,
          imageUrl: data.image_url ?? undefined,
          updatedAt: new Date(),
        },
        create: {
          id: data.id,
          email,
          name,
          imageUrl: data.image_url ?? undefined,
        },
      });
    });

  return null;
}

export async function handleUserDeleted(
  data: { id?: string },
  svixId: string,
  svixTimestamp: string
): Promise<HandlerResult> {
  if (!data.id) {
    return null;
  }

  await prisma.user.delete({ where: { id: data.id } }).catch(() => null);
  return null;
}

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  if (!WEBHOOK_SECRET) {
    return errorResponse("CLERK_WEBHOOK_SECRET is not set", 500);
  }

  const requestHeaders = await headers();

  const svixId = requestHeaders.get("svix-id");
  const svixTimestamp = requestHeaders.get("svix-timestamp");
  const svixSignature = requestHeaders.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return errorResponse("Missing svix headers", 400);
  }

  const payload = await request.json();

  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error("Clerk webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      `Webhook Error: ${
        err instanceof Error ? err.message : "Unknown verification error"
      }`,
      400
    );
  }

  const { type, data } = evt;

  try {
    let handlerResult: HandlerResult = null;

    switch (type) {
      case "user.created":
        handlerResult = await handleUserCreated(data, svixId, svixTimestamp);
        break;

      case "user.updated":
        handlerResult = await handleUserUpdated(data, svixId, svixTimestamp);
        break;

      case "user.deleted":
        handlerResult = await handleUserDeleted(data, svixId, svixTimestamp);
        break;

      default:
        logger.warn("Unhandled Clerk webhook event type", {
          eventType: type,
          eventId: svixId,
        });
        return successResponse(
          "Unhandled webhook type, but processed successfully",
          200
        );
    }

    if (handlerResult === null) {
      return successResponse("Webhook processed successfully", 200);
    }
    if (handlerResult instanceof NextResponse) {
      return handlerResult;
    }
  } catch (err) {
    logger.error(`Error processing Clerk webhook event type ${type}:`, err);
    return errorResponse(
      err instanceof Error ? err.message : `Error processing ${type} webhook`,
      500,
      err instanceof Error ? err.message : undefined
    );
  }

  return successResponse("Webhook processed successfully", 200);
});
