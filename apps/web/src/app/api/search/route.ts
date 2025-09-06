import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import redis from "@/lib/redis/redis";
import { searchService, SearchOptions } from "@/lib/services/searchService";
import { SearchQuerySchema } from "@/schemas/searchQuerySchema";
import { SearchResponse } from "@/types/search";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const TTL_SECONDS = 300; // 5 minutes

export const GET = withLoggerAndErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  // Parse and validate query parameters
  let query;
  try {
    query = SearchQuerySchema.parse({
      q: searchParams.get("q") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      type: searchParams.get("type") || undefined,
    });
  } catch (err) {
    return errorResponse("Invalid query parameters", 400, {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit)));
  const sortBy = searchParams.get("sortBy") || "relevance";

  // Create cache key
  const cacheKey = `search:enhanced:${query.q}:${page}:${limit}:${query.type}:${sortBy}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return successResponse("Search results (cache)", 200, parsed);
    }

    // Use enhanced search service
    const searchOptions: SearchOptions = {
      query: query.q,
      type: query.type as 'all' | 'vods' | 'users',
      page,
      limit,
      sortBy: sortBy as 'relevance' | 'date' | 'popularity',
    };

    const response = await searchService.search(searchOptions);

    // Cache the results
    await redis.setex(cacheKey, TTL_SECONDS, JSON.stringify(response));

    return successResponse("Search results", 200, response);
  } catch (err) {
    return errorResponse("Failed to search", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
