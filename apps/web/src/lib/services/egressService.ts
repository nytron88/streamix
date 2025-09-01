// lib/services/egressService.ts
import {
  EgressClient,
  EncodedFileOutput,
  SegmentedFileOutput,
  SegmentedFileProtocol,
  S3Upload,
  EncodingOptionsPreset,
  RoomCompositeOptions,
} from "livekit-server-sdk";

const LK_URL = process.env.LIVEKIT_API_URL!;
const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

const AWS_REGION = process.env.AWS_REGION!;
const S3_BUCKET = process.env.S3_BUCKET!;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;

const egress = new EgressClient(LK_URL, LK_KEY, LK_SECRET);

type StartOpts = {
  roomName: string; // LiveKit room = userId
  channelId: string; // Channel.id
  subfolder?: string; // optional override, default = timestamp
  layout?:
    | "grid"
    | "speaker"
    | "single-speaker"
    | "grid-light"
    | "speaker-light"
    | "single-speaker-light";
  encodingOptions?: EncodingOptionsPreset;
  customBaseUrl?: string;
};

function s3Upload(): S3Upload {
  return new S3Upload({
    accessKey: AWS_ACCESS_KEY_ID,
    secret: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
    bucket: S3_BUCKET,
  });
}

function tsFolder() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function compositeOptions(opts?: StartOpts): RoomCompositeOptions {
  return {
    layout: opts?.layout ?? "grid",
    encodingOptions:
      opts?.encodingOptions ?? EncodingOptionsPreset.H264_720P_30,
    customBaseUrl: opts?.customBaseUrl,
  };
}

/** Start MP4 egress (single file) to S3 */
export async function startRoomMp4Egress(opts: StartOpts) {
  const folder = opts.subfolder ?? tsFolder();

  const file = new EncodedFileOutput({
    filepath: `vods/${opts.channelId}/${folder}/recording.mp4`,
    output: { case: "s3", value: s3Upload() },
  });

  return egress.startRoomCompositeEgress(
    opts.roomName,
    { file },
    compositeOptions(opts)
  );
}

/** Start HLS egress (segmented) to S3 */
export async function startRoomHlsEgress(opts: StartOpts) {
  const folder = opts.subfolder ?? tsFolder();

  const segments = new SegmentedFileOutput({
    filenamePrefix: `vods/${opts.channelId}/${folder}/hls/segment`,
    playlistName: "index.m3u8",
    segmentDuration: 4,
    protocol: SegmentedFileProtocol.HLS_PROTOCOL,
    output: { case: "s3", value: s3Upload() },
  });

  return egress.startRoomCompositeEgress(
    opts.roomName,
    { segments },
    compositeOptions(opts)
  );
}

/** Stop an ongoing egress */
export async function stopEgress(egressId: string) {
  return egress.stopEgress(egressId);
}
