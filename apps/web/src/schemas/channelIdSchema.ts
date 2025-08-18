import { z } from "zod";

export const ChannelIdSchema = z.object({
  channelId: z.string().min(1, "channelId is required"),
});
