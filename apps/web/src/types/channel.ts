import { Channel as PrismaChannel } from "@prisma/client";
import { z } from "zod";
import { ChannelUpdateSchema } from "@/schemas/channelUpdateSchema";

export type Channel = PrismaChannel;

export type ChannelPayload = {
  channel: Channel;
  assets: {
    avatarUrl: string;
    bannerUrl: string;
  };
};

export type ChannelUpdateInput = z.infer<typeof ChannelUpdateSchema>;
