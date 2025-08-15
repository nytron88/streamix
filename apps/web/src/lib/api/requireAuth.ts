import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma/prisma";
import { errorResponse } from "@/lib/utils/responseWrapper";
import { NextResponse } from "next/server";
import type { User } from "@/types/user";

type RequireAuthOk = { userId: string; user: User };
export type RequireAuthResult = RequireAuthOk | NextResponse;

export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}

export async function requireAuth(): Promise<RequireAuthResult> {
  const { userId } = await auth();
  if (!userId) return errorResponse("Authentication required", 401);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);
    return { userId, user };
  } catch (err) {
    return errorResponse("Database error while fetching user", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
