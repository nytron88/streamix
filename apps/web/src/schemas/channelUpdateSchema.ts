import { z } from "zod";

const slugRegex = /^[a-z0-9-]+$/;

export const ChannelUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),

    bio: z
      .string()
      .trim()
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),

    category: z
      .string()
      .trim()
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v.length === 0 || slugRegex.test(v), {
        message: "Slug may contain only a–z, 0–9, and hyphens.",
      })
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),

    avatarS3Key: z
      .string()
      .trim()
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),

    bannerS3Key: z
      .string()
      .trim()
      .transform((v) => (v.length ? v : null))
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Provide at least one field to update.",
  });
