import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { WebhookEvent } from "@clerk/nextjs/server";
import { Webhook } from "svix";
import logger from "@/lib/utils/logger";
import { deleteObjectIfExists } from "@/lib/services/s3Service";
import { ingress } from "@/lib/services/ingressService";

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
  const DEFAULT_AVATAR_KEY = "defaults/default_profile.png";

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

    const channel = await tx.channel.create({
      data: {
        userId: user.id,
        slug,
        displayName: displayName ?? slug,
        bio: null,
        category: null,
        avatarS3Key: data.image_url ? undefined : DEFAULT_AVATAR_KEY,
        bannerS3Key: DEFAULT_BANNER_KEY,
      },
      select: { id: true },
    });

    await tx.stream.create({
      data: {
        channelId: channel.id,
        name: displayName ?? slug,
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
  if (!data.id) return null;

  // 1) In a txn: read what we need + delete rows
  const toCleanup: {
    roomName?: string; // LiveKit roomName (userId)
    streamThumbKey?: string | null;
    avatarKey?: string | null;
    bannerKey?: string | null;
    channelId?: string | null;
  } = {};

  await prisma.$transaction(async (tx) => {
    // channel (by user)
    const channel = await tx.channel.findUnique({
      where: { userId: data.id },
      select: { id: true, avatarS3Key: true, bannerS3Key: true },
    });

    if (channel) {
      toCleanup.channelId = channel.id;
      toCleanup.avatarKey = channel.avatarS3Key;
      toCleanup.bannerKey = channel.bannerS3Key;

      // stream (by channel)
      const stream = await tx.stream.findUnique({
        where: { channelId: channel.id },
        select: { id: true, thumbnailS3Key: true },
      });

      if (stream) {
        toCleanup.streamThumbKey = stream.thumbnailS3Key;
        // This delete is optional; deleting channel (cascade) will delete stream anyway.
        await tx.stream.delete({ where: { id: stream.id } }).catch(() => null);
      }

      // Delete channel (will cascade other relations due to onDelete rules)
      await tx.channel.delete({ where: { id: channel.id } }).catch(() => null);
    }

    // Delete user last
    await tx.user.delete({ where: { id: data.id } }).catch(() => null);
  });

  // 2) Outside txn: best-effort external cleanup

  // LiveKit: delete ALL ingresses for this user's room (roomName = userId)
  try {
    const all = await ingress.listIngress({ roomName: data.id! });
    await Promise.allSettled(
      all.map((i) => ingress.deleteIngress(i.ingressId))
    );
  } catch {
    // ignore
  }

  // S3: delete non-default assets (avatar/banner/stream thumbnail)
  try {
    if (toCleanup.avatarKey && !toCleanup.avatarKey.startsWith("defaults/")) {
      await deleteObjectIfExists(toCleanup.avatarKey);
    }
    if (toCleanup.bannerKey && !toCleanup.bannerKey.startsWith("defaults/")) {
      await deleteObjectIfExists(toCleanup.bannerKey);
    }
    if (toCleanup.streamThumbKey) {
      await deleteObjectIfExists(toCleanup.streamThumbKey);
    }
  } catch {
    // ignore best-effort failures
  }

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
