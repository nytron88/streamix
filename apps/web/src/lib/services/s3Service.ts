import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;

const s3 = new S3Client({ region: REGION });

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function generateImageKey(
  userId: string,
  type: "avatar" | "banner",
  contentType?: string
): string {
  const folder = type === "avatar" ? "images/profile" : "images/banner";
  const ext = contentType ? extFromMime(contentType) : "jpg";
  const ts = Date.now();
  return `${folder}/${userId}-${ts}.${ext}`;
}

export async function getUploadSignedUrl(args: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{
  url: string;
  requiredHeaders: Record<string, string>;
  expiresIn: number;
}> {
  const expiresIn = args.expiresInSeconds ?? 300;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: args.key,
    ContentType: args.contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });

  return {
    url,
    requiredHeaders: {
      "Content-Type": args.contentType,
    },
    expiresIn,
  };
}

export async function deleteObjectIfExists(key?: string | null): Promise<void> {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // TODO: Log error using logger
  }
}
