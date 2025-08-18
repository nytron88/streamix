import { z } from "zod";
import { BanBodySchema } from "@/schemas/banBodySchema";

export type BanBody = z.infer<typeof BanBodySchema>;

export type BanItem = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
};
