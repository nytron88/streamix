import { z } from "zod";

export const NotificationsQuerySchema = z.object({
  limit: z.string().optional().default("50")
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100"),
  offset: z.string().optional().default("0")
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 0, "Offset must be non-negative"),
  type: z.enum(["TIP", "FOLLOW", "SUB"]).optional().nullable().transform(val => val === null ? undefined : val),
});

export const ClearNotificationsBodySchema = z.object({
  type: z.enum(["TIP", "FOLLOW", "SUB"]).optional(),
});
