import { z } from "zod";

export const EarningsQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
  status: z
    .enum(["ACTIVE", "PAST_DUE", "CANCEL_SCHEDULED", "CANCELED"])
    .optional(),
});

export const TipsQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});
