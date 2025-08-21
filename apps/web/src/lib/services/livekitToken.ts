import { AccessToken } from "livekit-server-sdk";
import { ViewerTokenOpts } from "@/types/livekit";

const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

export function mintViewerToken({
  viewerId,
  roomName,
  viewerName,
  ttlSeconds = 600,
  subscribeOnly = true,
}: ViewerTokenOpts) {
  const at = new AccessToken(LK_KEY, LK_SECRET, {
    identity: viewerId,
    ttl: ttlSeconds,
    name: viewerName ?? undefined,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: !subscribeOnly,
    canPublishData: true,
  });

  return at.toJwt();
}
