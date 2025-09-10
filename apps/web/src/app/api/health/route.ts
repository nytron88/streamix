import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import redis from "@/lib/redis/redis";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";

export const GET = withLoggerAndErrorHandler(async () => {
  const redisPing = await redis.ping();
  const prismaPing = await prisma?.user.findUnique({
    where: {
      id: "1",
    },
  });

  if (!redisPing || !prismaPing) {
    return errorResponse("Health check failed", 500);
  }

  return successResponse("Health check", 200, {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "web",
    redisPing,
    prismaPing,
  });
});
