import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import logger from "@/lib/utils/logger";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as createCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CLOUDFRONT_PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY!;
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID!;

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
  type: "avatar" | "banner" | "thumbnail",
  contentType?: string
): string {
  let folder: string;
  switch (type) {
    case "avatar":
      folder = "images/profile";
      break;
    case "banner":
      folder = "images/banner";
      break;
    case "thumbnail":
      folder = "thumbnails";
      break;
    default:
      folder = "images";
  }
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

export function getCloudFrontUrl(key: string): string {
  if (!CLOUDFRONT_DOMAIN) {
    // Fallback to S3 URL if CloudFront domain not configured
    return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  }
  return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

export function getCloudFrontSignedUrl(
  key: string,
  expiresInSeconds: number = 3600
): string {
  if (
    !CLOUDFRONT_DOMAIN ||
    !CLOUDFRONT_PRIVATE_KEY ||
    !CLOUDFRONT_KEY_PAIR_ID
  ) {
    // Fallback to unsigned URL if CloudFront signing not configured
    return getCloudFrontUrl(key);
  }

  const url = `https://${CLOUDFRONT_DOMAIN}/${key}`;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return createCloudFrontSignedUrl({
    url,
    keyPairId: CLOUDFRONT_KEY_PAIR_ID,
    privateKey: CLOUDFRONT_PRIVATE_KEY,
    dateLessThan: expiresAt.toISOString(),
  });
}

// Note: CloudFront invalidation requires distribution ID which is not available
// Signed URLs provide security through time-limited access instead

export async function deleteObjectIfExists(key?: string | null): Promise<void> {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    logger.error(`Failed to delete object ${key} from S3`, { error });
  }
}

export async function deleteFolderIfExists(
  folderPath?: string | null
): Promise<void> {
  if (!folderPath) return;

  // Ensure folder path ends with / for proper prefix matching
  const prefix = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;

  try {
    // List all objects in the folder
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });

    const listResponse = await s3.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      logger.info(`No objects found in folder: ${prefix}`);
      return;
    }

    // Delete all objects in the folder
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key! })),
        Quiet: false,
      },
    });

    const deleteResponse = await s3.send(deleteCommand);

    logger.info(
      `Deleted ${
        deleteResponse.Deleted?.length || 0
      } objects from folder: ${prefix}`
    );

    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      logger.error(`Some objects failed to delete from folder: ${prefix}`, {
        errors: deleteResponse.Errors,
      });
    }
  } catch (error) {
    logger.error(`Failed to delete folder ${prefix} from S3`, { error });
  }
}
