import Redis from "ioredis";
import { errorResponse } from "@/lib/utils/responseWrapper";
import { NextResponse } from "next/server";

if (!process.env.REDIS_URL) {
  // Immediately return an API-style error if Redis URL is missing
  throw errorResponse("REDIS_URL env variable is not set", 500);
}

const options = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let redis: Redis;

if (process.env.NODE_ENV === "production") {
  redis = new Redis(process.env.REDIS_URL, options);
} else {
  // @ts-expect-error - Global redis instance for development
  if (!global.redis) {
    // @ts-expect-error - Global redis instance for development
    global.redis = new Redis(process.env.REDIS_URL, options);
  }
  // @ts-expect-error - Global redis instance for development
  redis = global.redis;
}

// Optional: attach connection error listener that uses errorResponse
redis.on("error", (err) => {
  console.error("Redis connection error:", err);
  return NextResponse.json(
    errorResponse("Redis connection failed", 500, err),
    { status: 500 }
  );
});

export default redis;
