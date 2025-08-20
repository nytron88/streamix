import {
  IngressClient,
  IngressInput,
  IngressAudioEncodingPreset,
  IngressVideoEncodingPreset,
  IngressVideoOptions,
  IngressAudioOptions,
  RoomServiceClient,
  type CreateIngressOptions,
  TrackSource,
} from "livekit-server-sdk";
import prisma from "@/lib/prisma/prisma";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";

const LK_URL = process.env.LIVEKIT_API_URL!;
const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

export const roomSvc = new RoomServiceClient(LK_URL, LK_KEY, LK_SECRET);
export const ingress = new IngressClient(LK_URL, LK_KEY, LK_SECRET);

async function getMyChannelId(userId: string) {
  const ch = await prisma.channel.findUnique({
    where: { userId },
    select: { id: true },
  });
  return ch?.id ?? null;
}
async function ensureStreamRow(channelId: string) {
  const s = await prisma.stream.findUnique({ where: { channelId } });
  return s ?? prisma.stream.create({ data: { channelId } });
}

/** Create RTMP or WHIP ingress for the authed user’s room (roomName = userId). */
export async function createIngress(ingressType: IngressInput) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { userId, user } = auth;

  const channelId = await getMyChannelId(userId);
  if (!channelId) return errorResponse("Channel not found", 404);
  await ensureStreamRow(channelId);

  const opts: CreateIngressOptions = {
    name: user.name ?? `stream-${channelId}`,
    roomName: userId,
    participantName: user.name ?? "",
    participantIdentity: userId,
  };

  if (ingressType === IngressInput.WHIP_INPUT) {
    // WHIP defaults to no transcoding; be explicit:
    opts.enableTranscoding = false; // forward media unchanged
  } else {
    // RTMP with presets
    opts.enableTranscoding = true;
    opts.video = new IngressVideoOptions({
      source: TrackSource.CAMERA,
      encodingOptions: {
        case: "preset",
        value: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
      },
    });
    opts.audio = new IngressAudioOptions({
      source: TrackSource.MICROPHONE,
      encodingOptions: {
        case: "preset",
        value: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
      },
    });
  }

  // (Optional) Safety: nuke any old ingresses for this room before creating a new one.
  const existing = await ingress.listIngress({ roomName: userId }); // list by room
  await Promise.allSettled(
    existing.map((i) => ingress.deleteIngress(i.ingressId))
  );

  const ig = await ingress.createIngress(ingressType, opts);

  const ingressId = ig.ingressId;
  const serverUrl = ig.url ?? ""; // RTMP and WHIP both expose .url
  const streamKey = ig.streamKey ?? null; // RTMP only (WHIP returns null)

  if (!ingressId || !serverUrl)
    return errorResponse("Failed to create ingress", 500);

  const saved = await prisma.stream.update({
    where: { channelId },
    data: { ingressId, serverUrl, streamKey },
    select: {
      channelId: true,
      ingressId: true,
      serverUrl: true,
      streamKey: true,
    },
  });

  return successResponse("Ingress created", 200, {
    type: ingressType,
    ...saved,
  });
}

/** Delete ALL ingresses for the user’s room, kick participant, clear DB fields. */
export async function resetIngress() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { userId } = auth;

  const channelId = await getMyChannelId(userId);
  if (!channelId) return errorResponse("Channel not found", 404);

  // delete every ingress tied to this room
  const all = await ingress.listIngress({ roomName: userId });
  await Promise.allSettled(all.map((i) => ingress.deleteIngress(i.ingressId)));

  // kick the participant (best-effort)
  await roomSvc.removeParticipant(userId, userId).catch(() => {});

  await prisma.stream.update({
    where: { channelId },
    data: { ingressId: null, serverUrl: null, streamKey: null },
  });

  return successResponse("Ingress reset", 200, {
    channelId,
    removed: all.length,
  });
}
