import { z } from "zod";

export const UserIdSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});
