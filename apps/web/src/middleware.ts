import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { errorResponse } from "./lib/utils/responseWrapper";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

const isPublicApiRoute = createRouteMatcher(["/api/health(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId } = await auth();
    const path = req.nextUrl.pathname;

    // API route handling
    if (path.startsWith("/api")) {
      if (isPublicApiRoute(req)) {
        return NextResponse.next();
      }
      if (!userId) {
        return errorResponse("Unauthorized", 401);
      }
      return NextResponse.next();
    }

    // Non-API routes
    if (userId && isPublicRoute(req)) {
      return NextResponse.redirect(new URL("/home", req.url));
    }

    if (!isPublicRoute(req) && !userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error(
      "Middleware error",
      process.env.NODE_ENV === "development" ? error : (error as Error).message
    );

    if (req.nextUrl.pathname.startsWith("/api")) {
      return errorResponse("Internal server error", 500);
    }

    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
