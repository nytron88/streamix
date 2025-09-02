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
import { Prisma } from "@prisma/client";

const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;
const S3_BUCKET = process.env.S3_BUCKET!;
const AWS_REGION = process.env.AWS_REGION!;

const receiver = new WebhookReceiver(LK_KEY, LK_SECRET);

// Extract the S3 object key from fileResults or legacy fields
function extractS3KeyAndMeta(e: WebhookEvent): {
  key: string | null;
  durationS?: number;
  etag?: string;
} {
  const info: any = e.egressInfo ?? {};
  const fr = info.fileResults?.[0] ?? undefined;
  if (fr) {
    if (typeof fr.filename === "string" && fr.filename.length > 0) {
      return {
        key: fr.filename,
        durationS: typeof fr.duration === "number" ? fr.duration : undefined,
        etag: typeof fr.etag === "string" ? fr.etag : undefined,
      };
    }
    if (typeof fr.location === "string" && fr.location.length > 0) {
      const loc: string = fr.location;
      const prefix = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`;
      if (loc.startsWith(prefix)) return { key: loc.slice(prefix.length) };
      const idx = loc.indexOf(`/${S3_BUCKET}/`);
      if (idx >= 0) return { key: loc.slice(idx + S3_BUCKET.length + 2) };
    }
  }
  const legacy = info.encodedFile ?? info.file;
  if (legacy?.filepath) {
    return {
      key: legacy.filepath,
      durationS:
        typeof legacy.duration === "number" ? legacy.duration : undefined,
      etag: typeof legacy.etag === "string" ? legacy.etag : undefined,
    };
  }
  return { key: null };
}

async function handleEvent(e: WebhookEvent) {
  const roomUserId =
    e.room?.name || e.ingressInfo?.roomName || e.egressInfo?.roomName;
  if (!roomUserId) return;

  // Idempotency: skip if already processed
  if (e.id) {
    try {
      await prisma.processedWebhookEvent.create({
        data: { provider: "livekit", eventId: e.id },
      });
    } catch {
      return;
    }
  }

  const channel = await prisma.channel.findUnique({
    where: { userId: roomUserId },
    select: { id: true },
  });
  if (!channel) return;

  const ensureStream = async (tx: Prisma.TransactionClient) => {
    const s = await tx.stream.findUnique({ where: { channelId: channel.id } });
    return s ?? tx.stream.create({ data: { channelId: channel.id } });
  };

  switch (e.event) {
    /* =================== LIVE START =================== */
    case "ingress_started": {
      await prisma.$transaction(async (tx) => {
        await ensureStream(tx);

        // Atomic flip to live
        const { count } = await tx.stream.updateMany({
          where: { channelId: channel.id, isLive: false },
          data: { isLive: true },
        });
        if (count === 0) return;

        await startRoomMp4Egress({
          roomName: roomUserId,
          channelId: channel.id,
        });
      });
      break;
    }

    case "room_started":
      // ignore to avoid duplicate egress starts
      break;

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
      const info: any = e.egressInfo;
      const hasFinalFiles =
        (Array.isArray(info?.fileResults) && info.fileResults.length > 0) ||
        info?.result?.case === "file";

      const isFinal =
        e.egressInfo?.status === EgressStatus.EGRESS_COMPLETE || hasFinalFiles;

      if (!isFinal) break;

      const { key: s3Key, durationS, etag } = extractS3KeyAndMeta(e);
      if (!s3Key) break;

      const providerAssetId = e.egressInfo?.egressId ?? null;

      if (providerAssetId) {
        const existing = await prisma.vod.findFirst({
          where: { providerAssetId },
          select: { id: true },
        });

        if (existing) {
          await prisma.vod.update({
            where: { id: existing.id },
            data: {
              s3Bucket: S3_BUCKET,
              s3Region: AWS_REGION,
              s3Key,
              s3ETag: etag ?? undefined,
              durationS: durationS ?? undefined,
              publishedAt: new Date(),
            },
          });
        } else {
          await prisma.vod.create({
            data: {
              channelId: channel.id,
              providerAssetId,
              s3Bucket: S3_BUCKET,
              s3Region: AWS_REGION,
              s3Key,
              s3ETag: etag ?? undefined,
              title: "Stream Recording",
              durationS: durationS ?? undefined,
              visibility: "PUBLIC",
              publishedAt: new Date(),
            },
          });
        }
      } else {
        const existingByPath = await prisma.vod.findFirst({
          where: { channelId: channel.id, s3Key },
          select: { id: true },
        });
        if (existingByPath) {
          await prisma.vod.update({
            where: { id: existingByPath.id },
            data: {
              s3Bucket: S3_BUCKET,
              s3Region: AWS_REGION,
              s3Key,
              s3ETag: etag ?? undefined,
              durationS: durationS ?? undefined,
              publishedAt: new Date(),
            },
          });
        } else {
          await prisma.vod.create({
            data: {
              channelId: channel.id,
              providerAssetId: null,
              s3Bucket: S3_BUCKET,
              s3Region: AWS_REGION,
              s3Key,
              s3ETag: etag ?? undefined,
              title: "Stream Recording",
              durationS: durationS ?? undefined,
              visibility: "PUBLIC",
              publishedAt: new Date(),
            },
          });
        }
      }
      break;
    }

    default:
      break;
  }
}

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
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
