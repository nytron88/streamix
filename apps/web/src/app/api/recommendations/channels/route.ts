import { getRecommendedList } from "@/lib/api/recommendedList";
import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit =
    limitParam && !isNaN(parseInt(limitParam, 10))
      ? parseInt(limitParam, 10)
      : 12;

  return getRecommendedList(limit);
});
