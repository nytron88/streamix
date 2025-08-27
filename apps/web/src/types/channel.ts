import { Channel as PrismaChannel } from "@prisma/client";
import { z } from "zod";
import { ChannelUpdateSchema } from "@/schemas/channelUpdateSchema";
import { ChannelIdSchema } from "@/schemas/channelIdSchema";

export type Channel = PrismaChannel;

export type ChannelWithCounts = Omit<Channel, 'createdAt' | 'updatedAt'> & {
  followerCount: number;
  subscriberCount: number;
  createdAt: string;  // API returns dates as strings
  updatedAt: string;  // API returns dates as strings
};

export type ChannelPayload = {
  channel: ChannelWithCounts;
  assets: {
    avatarUrl: string;
    bannerUrl: string;
  };
};

export type ChannelUpdateInput = z.infer<typeof ChannelUpdateSchema>;

export type ChannelId = z.infer<typeof ChannelIdSchema>;
