import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";
import { NextRequest } from "next/server";
import { ChannelUpdateSchema } from "@/schemas/channelUpdateSchema";
import { ChannelUpdateInput } from "@/types/channel";
import { deleteObjectIfExists } from "@/lib/services/s3Service";

const TTL_SECONDS = 300;

export const GET = withLoggerAndErrorHandler(async () => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId, user } = auth;
  const cacheKey = `channel:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return successResponse(
        "Channel fetched (cache)",
        200,
        JSON.parse(cached)
      );
    }

    let channel = await prisma.channel.findUnique({ where: { userId } });
    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          userId,
          displayName: user?.name ?? null,
        },
      });
    }

    const payload = {
      channel,
      assets: {
        avatarUrl: getAvatarUrl(channel, user),
        bannerUrl: getBannerUrl(channel),
      },
    };

    await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
    return successResponse("Channel fetched successfully", 200, payload);
  } catch (err) {
    return errorResponse("Database/cache error while fetching channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export const PATCH = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId, user } = auth;
  const cacheKey = `channel:${userId}`;

  let updateData: ChannelUpdateInput;
  try {
    updateData = ChannelUpdateSchema.parse(await request.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  try {
    if (updateData.slug) {
      const taken = await prisma.channel.findFirst({
        where: { slug: updateData.slug, NOT: { userId } },
        select: { id: true },
      });
      if (taken) return errorResponse("This channel URL is already taken", 409);
    }

    const { oldAvatarKey, oldBannerKey, updatedChannel } =
      await prisma.$transaction(async (tx) => {
        const current = await tx.channel.findUnique({
          where: { userId },
          select: { avatarS3Key: true, bannerS3Key: true },
        });
        if (!current) throw new Error("Channel not found");

        // Only include fields that are actually provided (not undefined)
        const fieldsToUpdate: Partial<ChannelUpdateInput> = {};

        if (updateData.displayName !== undefined)
          fieldsToUpdate.displayName = updateData.displayName;
        if (updateData.bio !== undefined) fieldsToUpdate.bio = updateData.bio;
        if (updateData.category !== undefined)
          fieldsToUpdate.category = updateData.category;
        if (updateData.slug !== undefined)
          fieldsToUpdate.slug = updateData.slug;
        if (updateData.avatarS3Key !== undefined)
          fieldsToUpdate.avatarS3Key = updateData.avatarS3Key;
        if (updateData.bannerS3Key !== undefined)
          fieldsToUpdate.bannerS3Key = updateData.bannerS3Key;

        // If no fields to update, return current channel
        if (Object.keys(fieldsToUpdate).length === 0) {
          const currentChannel = await tx.channel.findUnique({
            where: { userId },
          });
          if (!currentChannel) throw new Error("Channel not found");

          return {
            oldAvatarKey: current.avatarS3Key,
            oldBannerKey: current.bannerS3Key,
            updatedChannel: currentChannel,
          };
        }

        const ch = await tx.channel.update({
          where: { userId },
          data: fieldsToUpdate,
        });

        return {
          oldAvatarKey: current.avatarS3Key,
          oldBannerKey: current.bannerS3Key,
          updatedChannel: ch,
        };
      });

    if (
      updateData.avatarS3Key !== undefined &&
      updateData.avatarS3Key !== oldAvatarKey
    ) {
      await deleteObjectIfExists(oldAvatarKey);
    }
    if (
      updateData.bannerS3Key !== undefined &&
      updateData.bannerS3Key !== oldBannerKey &&
      oldBannerKey !== "defaults/default_banner.png"
    ) {
      await deleteObjectIfExists(oldBannerKey);
    }

    const payload = {
      channel: updatedChannel,
      assets: {
        avatarUrl: getAvatarUrl(updatedChannel, user),
        bannerUrl: getBannerUrl(updatedChannel),
      },
    };

    await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
    return successResponse("Channel updated successfully", 200, payload);
  } catch (err) {
    return errorResponse("Error while updating channel", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
