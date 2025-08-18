import { Channel as PrismaChannel } from "@prisma/client";
import { z } from "zod";
import { ChannelUpdateSchema } from "@/schemas/channelUpdateSchema";
import { ChannelIdSchema } from "@/schemas/channelIdSchema";

export type Channel = PrismaChannel;

export type ChannelPayload = {
  channel: Channel;
  assets: {
    avatarUrl: string;
    bannerUrl: string;
  };
};

export type ChannelUpdateInput = z.infer<typeof ChannelUpdateSchema>;

export type ChannelId = z.infer<typeof ChannelIdSchema>;
