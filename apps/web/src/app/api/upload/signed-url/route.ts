import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { getUploadSignedUrl, generateImageKey } from "@/lib/services/s3Service";

interface SignedUrlRequest {
  type: "avatar" | "banner";
  contentType: string;
}

const VALID_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;

  let body: SignedUrlRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { type, contentType } = body;

  if (type !== "avatar" && type !== "banner") {
    return errorResponse(
      "Invalid upload type. Must be 'avatar' or 'banner'",
      400
    );
  }
  if (!VALID_IMAGE_TYPES.has(contentType)) {
    return errorResponse(
      "Unsupported image type. Only JPEG, PNG, and WebP are allowed",
      400
    );
  }

  const key = generateImageKey(userId, type, contentType);

  const maxSize = type === "avatar" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

  const { url, requiredHeaders, expiresIn } = await getUploadSignedUrl({
    key,
    contentType,
    expiresInSeconds: 300,
  });

  return successResponse("Signed URL generated successfully", 200, {
    key,
    url,
    headers: requiredHeaders,
    maxSize,
    expiresIn,
    type,
  });
});
