import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import {
  EgressStatus,
  WebhookEvent,
  WebhookReceiver,
} from "livekit-server-sdk";
import { startRoomMp4Egress } from "@/lib/services/egressService";

const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;
const S3_BUCKET = process.env.S3_BUCKET!;
const AWS_REGION = process.env.AWS_REGION!;

const receiver = new WebhookReceiver(LK_KEY, LK_SECRET);

async function handleEvent(e: WebhookEvent) {
  // We set roomName = userId when creating ingress
  const roomUserId =
    e.room?.name || e.ingressInfo?.roomName || e.egressInfo?.roomName;
  if (!roomUserId) return;

  // Find the channel for this user
  const channel = await prisma.channel.findUnique({
    where: { userId: roomUserId },
    select: { id: true },
  });
  if (!channel) return;

  // Helper to ensure a Stream row exists (no sessions in this schema)
  const ensureStream = async (tx: any) => {
    const s = await tx.stream.findUnique({ where: { channelId: channel.id } });
    return s ?? tx.stream.create({ data: { channelId: channel.id } });
  };

  switch (e.event) {
    /* =================== LIVE START =================== */
    case "ingress_started":
    case "room_started": {
      await prisma.$transaction(async (tx) => {
        const s = await ensureStream(tx);
        if (s.isLive) return; // already live

        await tx.stream.update({
          where: { channelId: channel.id },
          data: { isLive: true },
        });

        // Kick off MP4 egress → S3 (no sessionId needed; service can embed timestamp in path)
        await startRoomMp4Egress({
          roomName: roomUserId,
          channelId: channel.id,
        });
      });
      break;
    }

    /* =================== LIVE END =================== */
    case "ingress_ended":
    case "room_finished": {
      await prisma.$transaction(async (tx) => {
        const s = await tx.stream.findUnique({
          where: { channelId: channel.id },
          select: { isLive: true },
        });
        if (!s) {
          await tx.stream.create({
            data: { channelId: channel.id, isLive: false },
          });
          return;
        }

        if (s.isLive) {
          await tx.stream.update({
            where: { channelId: channel.id },
            data: { isLive: false },
          });
        }
      });
      break;
    }

    /* ============== EGRESS STATUS → CREATE VOD ============== */
    case "egress_updated": {
      if (e.egressInfo?.status !== EgressStatus.EGRESS_COMPLETE) break;

      // Read actual file path from egress payload (no StreamSession needed)
      const s3Key =
        (e.egressInfo as any)?.encodedFile?.filepath ??
        (e.egressInfo as any)?.file?.filepath ??
        null;
      if (!s3Key) break; // nothing to persist

      const durationS =
        (e.egressInfo as any)?.encodedFile?.duration ??
        (e.egressInfo as any)?.file?.duration ??
        null;

      const s3ETag =
        (e.egressInfo as any)?.encodedFile?.etag ??
        (e.egressInfo as any)?.file?.etag ??
        null;

      await prisma.vod.create({
        data: {
          channelId: channel.id,
          providerAssetId: e.egressInfo?.egressId ?? null,
          s3Bucket: S3_BUCKET,
          s3Region: AWS_REGION,
          s3Key, // <- taken directly from LiveKit payload
          s3ETag: s3ETag ?? undefined,
          title: "Stream Recording",
          durationS: durationS ?? undefined,
          visibility: "PUBLIC", // change to SUB_ONLY if you want default gating
          publishedAt: new Date(),
        },
      });

      break;
    }

    default:
      break;
  }
}

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  // LiveKit signs the webhook; verify against raw body
  const authz = req.headers.get("authorization") || "";
  const bodyText = await req.text();

  let events: WebhookEvent | WebhookEvent[] = [];
  try {
    events = await receiver.receive(bodyText, authz);
  } catch (err) {
    return errorResponse(
      `Webhook verification failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
      401
    );
  }

  try {
    const eventArray = Array.isArray(events) ? events : [events];
    for (const e of eventArray) {
      await handleEvent(e);
    }
    return successResponse("LiveKit webhook processed", 200, {
      handled: eventArray.length,
    });
  } catch (err) {
    return errorResponse("Failed to process LiveKit webhook", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
