import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { WebhookEvent, WebhookReceiver } from "livekit-server-sdk";

const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

const receiver = new WebhookReceiver(LK_KEY, LK_SECRET);

async function handleEvent(e: WebhookEvent) {
  // We set roomName = userId when creating ingress
  const roomUserId = e.room?.name || e.ingressInfo?.roomName;
  if (!roomUserId) return;

  // Find the channel for this user
  const channel = await prisma.channel.findUnique({
    where: { userId: roomUserId },
    select: { id: true },
  });
  if (!channel) return;

  // Helper to ensure there’s a Stream row
  const ensureStream = async () => {
    const s = await prisma.stream.findUnique({
      where: { channelId: channel.id },
    });
    return s ?? prisma.stream.create({ data: { channelId: channel.id } });
  };

  switch (e.event) {
    // Live starts: either ingress begins pushing or room becomes active
    case "ingress_started":
    case "room_started": {
      await prisma.$transaction(async (tx) => {
        const s = await ensureStream();
        if (s.isLive && s.currentSessionId) return; // already live

        const session = await tx.streamSession.create({
          data: { channelId: channel.id },
          select: { id: true },
        });

        await tx.stream.update({
          where: { channelId: channel.id },
          data: { isLive: true, currentSessionId: session.id },
        });
      });
      break;
    }

    // Live ends: ingress stops or room finishes
    case "ingress_ended":
    case "room_finished": {
      await prisma.$transaction(async (tx) => {
        const s = await tx.stream.findUnique({
          where: { channelId: channel.id },
          select: { currentSessionId: true, isLive: true },
        });
        if (!s) {
          await tx.stream.create({
            data: { channelId: channel.id, isLive: false },
          });
          return;
        }

        if (s.currentSessionId) {
          await tx.streamSession.update({
            where: { id: s.currentSessionId },
            data: { endedAt: new Date() },
          });
        }

        await tx.stream.update({
          where: { channelId: channel.id },
          data: { isLive: false, currentSessionId: null },
        });
      });
      break;
    }

    // Optional: track viewer/chat metrics later with participant events
    // case "participant_joined":
    // case "participant_left":
    // case "egress_started":
    // case "egress_ended":
    //   break;

    default:
      // Ignore other events for now
      break;
  }
}

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  // LiveKit sends a signed JWT in the Authorization header; verify against raw body
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
    // Ensure events is always an array
    const eventArray = Array.isArray(events) ? events : [events];

    // Process all events sequentially (order matters for start/stop)
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
