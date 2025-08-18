import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import { deleteObjectIfExists } from "@/lib/services/s3Service";
import { CleanupSchema } from "@/schemas/cleanupSchema";

export const DELETE = withLoggerAndErrorHandler(
  async (request: NextRequest) => {
    const auth = await requireAuth();
    if (isNextResponse(auth)) return auth;

    let body: { keys: string[] };
    try {
      body = CleanupSchema.parse(await request.json());
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Invalid request body",
        400
      );
    }

    try {
      // Delete all provided S3 keys
      await Promise.all(body.keys.map((key) => deleteObjectIfExists(key)));

      return successResponse(
        `Successfully cleaned up ${body.keys.length} object(s)`,
        200,
        { deletedCount: body.keys.length }
      );
    } catch (err) {
      return errorResponse("Error while cleaning up S3 objects", 500, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
