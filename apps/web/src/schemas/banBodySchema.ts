import { z } from "zod";

export const BanBodySchema = z.object({
  userId: z.string().min(1, "userId is required"),
  reason: z.string().trim().max(500, "Reason cannot exceed 500 characters").optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isPermanent: z.boolean().optional().default(false),
}).refine((data) => {
  // If permanent ban is selected, expiresAt should be null
  if (data.isPermanent && data.expiresAt) {
    return false;
  }
  // If not permanent and expiresAt is provided, it should be in the future
  if (!data.isPermanent && data.expiresAt) {
    const expiry = new Date(data.expiresAt);
    return expiry > new Date();
  }
  return true;
}, {
  message: "Invalid ban configuration: permanent bans cannot have expiry dates, and temporary bans must expire in the future"
});
