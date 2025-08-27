import { z } from "zod";

export const ChatSettingsUpdateSchema = z.object({
  isChatEnabled: z.boolean().optional(),
  isChatDelayed: z.boolean().optional(),
  isChatFollowersOnly: z.boolean().optional(),
  isChatSubscribersOnly: z.boolean().optional(),
});
