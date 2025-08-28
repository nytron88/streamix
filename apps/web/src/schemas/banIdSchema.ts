import { z } from "zod";

export const BanIdSchema = z.object({
  banId: z.string().min(1, "banId is required"),
});

