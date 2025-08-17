import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { errorResponse } from "@/lib/utils/responseWrapper";
import { NextResponse } from "next/server";
import type { User } from "@/types/user";

type RequireAuthOk = { userId: string; user: User };
export type RequireAuthResult = RequireAuthOk | NextResponse;

export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

const USER_TTL_SECONDS = 300;

export async function requireAuth(): Promise<RequireAuthResult> {
  const { userId } = await auth();
  if (!userId) return errorResponse("Authentication required", 401);

  const cacheKey = `user:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const user = JSON.parse(cached) as User;
      return { userId, user };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);

    await redis.set(cacheKey, JSON.stringify(user), "EX", USER_TTL_SECONDS);
    return { userId, user };
  } catch (err) {
    return errorResponse("Database/cache error while fetching user", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
