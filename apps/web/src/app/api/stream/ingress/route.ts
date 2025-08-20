import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { createIngress, resetIngress } from "@/lib/services/ingressService";
import { IngressInput } from "livekit-server-sdk";
import { errorResponse } from "@/lib/utils/responseWrapper";

export const POST = withLoggerAndErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || (type !== "RTMP_INPUT" && type !== "WHIP_INPUT")) {
      return errorResponse(
        "Invalid ingress type. Must be 'RTMP_INPUT' or 'WHIP_INPUT'",
        400
      );
    }

    const ingressType =
      type === "RTMP_INPUT" ? IngressInput.RTMP_INPUT : IngressInput.WHIP_INPUT;
    return await createIngress(ingressType);
  } catch (err) {
    return errorResponse("Failed to create ingress", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export const DELETE = withLoggerAndErrorHandler(async () => {
  return await resetIngress();
});
