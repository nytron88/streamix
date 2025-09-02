import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { generateImageKey, getUploadSignedUrl } from "@/lib/services/s3Service";
import { z } from "zod";

const UploadSchema = z.object({
  contentType: z.string().min(1),
  vodId: z.string().min(1),
});

export const POST = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const authResult = await requireAuth();
  if (isNextResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    const body = await req.json();
    const { contentType, vodId } = UploadSchema.parse(body);

    // Validate file type
    if (!contentType.startsWith('image/')) {
      return errorResponse("File must be an image", 400);
    }

    // Generate unique S3 key for thumbnail
    const s3Key = generateImageKey(userId, "thumbnail", contentType);

    // Get signed URL for upload
    const { url, requiredHeaders, expiresIn } = await getUploadSignedUrl({
      key: s3Key,
      contentType,
      expiresInSeconds: 300, // 5 minutes
    });

    return successResponse("Signed URL generated successfully", 200, {
      uploadUrl: url,
      s3Key,
      requiredHeaders,
      expiresIn,
    });
  } catch (error: any) {
    return errorResponse("Failed to generate upload URL", 500, {
      message: error.message,
    });
  }
});
