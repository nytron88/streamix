import { z } from "zod";

export const CleanupSchema = z.object({
  keys: z.array(z.string()).min(1).max(10),
});
