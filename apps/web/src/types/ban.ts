import { z } from "zod";
import { BanBodySchema } from "@/schemas/banBodySchema";
import { BanIdSchema } from "@/schemas/banIdSchema";

export type BanBody = z.infer<typeof BanBodySchema>;
export type BanId = z.infer<typeof BanIdSchema>;

export type BanItem = {
  id: string;
  userId: string;
  userName: string | null;
  userImageUrl: string | null;
  reason: string | null;
  createdAt: string; // API returns dates as strings
  expiresAt: string | null; // API returns dates as strings
};

export type BansResponse = {
  bans: BanItem[];
};
