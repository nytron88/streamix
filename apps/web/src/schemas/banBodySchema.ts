import { z } from "zod";

export const BanBodySchema = z.object({
  userId: z.string().min(1, "userId is required"),
  reason: z.string().trim().max(300).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});
