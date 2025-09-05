import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(100, "Search query too long"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  type: z.enum(["all", "vods", "users"]).optional().default("all"),
});

export const VodSearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(100, "Search query too long"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  visibility: z.enum(["PUBLIC", "SUB_ONLY"]).optional(),
});

export const UserSearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(100, "Search query too long"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  live: z.enum(["true", "false"]).optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type VodSearchQuery = z.infer<typeof VodSearchQuerySchema>;
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
