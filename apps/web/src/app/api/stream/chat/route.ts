import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { requireAuth, isNextResponse } from "@/lib/api/requireAuth";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import redis from "@/lib/redis/redis";
import { ChatSettingsUpdateSchema } from "@/schemas/chatSettingSchema";
import { ChatSettingsInput } from "@/types/chat";

const TTL_SECONDS = 60;

export const GET = withLoggerAndErrorHandler(async () => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;
  const cacheKey = `stream:chat:${userId}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return successResponse(
        "Chat settings fetched (cache)",
        200,
        JSON.parse(cached)
      );
    }

    // Find or create stream record for the user
    let stream = await prisma.stream.findFirst({
      where: {
        channel: { userId },
      },
      select: {
        id: true,
        isChatEnabled: true,
        isChatDelayed: true,
        isChatFollowersOnly: true,
        isChatSubscribersOnly: true,
        channelId: true,
      },
    });

    if (!stream) {
      // Get or create the user's channel first
      let channel = await prisma.channel.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!channel) {
        // Create channel if it doesn't exist
        channel = await prisma.channel.create({
          data: { userId },
          select: { id: true },
        });
      }

      // Create default stream record
      stream = await prisma.stream.create({
        data: {
          channelId: channel.id,
          isChatEnabled: true,
          isChatDelayed: false,
          isChatFollowersOnly: false,
          isChatSubscribersOnly: false,
        },
        select: {
          id: true,
          isChatEnabled: true,
          isChatDelayed: true,
          isChatFollowersOnly: true,
          isChatSubscribersOnly: true,
          channelId: true,
        },
      });
    }

    const payload = {
      chatSettings: {
        isChatEnabled: stream.isChatEnabled,
        isChatDelayed: stream.isChatDelayed,
        isChatFollowersOnly: stream.isChatFollowersOnly,
        isChatSubscribersOnly: stream.isChatSubscribersOnly,
      },
    };

    // Cache the result
    await redis.set(cacheKey, JSON.stringify(payload), "EX", TTL_SECONDS);
    return successResponse("Chat settings fetched successfully", 200, payload);
  } catch (err) {
    return errorResponse(
      "Database/cache error while fetching chat settings",
      500,
      {
        message: err instanceof Error ? err.message : String(err),
      }
    );
  }
});

export const PATCH = withLoggerAndErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { userId } = auth;
  const cacheKey = `stream:chat:${userId}`;

  let updateData: ChatSettingsInput;
  try {
    updateData = ChatSettingsUpdateSchema.parse(await request.json());
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Invalid request body",
      400
    );
  }

  try {
    // Check if any settings are actually provided
    const hasUpdates = Object.keys(updateData).length > 0;
    if (!hasUpdates) {
      return errorResponse("No chat settings provided", 400);
    }

    const { updatedStream, hasChanges } = await prisma.$transaction(
      async (tx) => {
        // Find or create stream record for the user
        let stream = await tx.stream.findFirst({
          where: {
            channel: { userId },
          },
          select: {
            id: true,
            channelId: true,
            isChatEnabled: true,
            isChatDelayed: true,
            isChatFollowersOnly: true,
            isChatSubscribersOnly: true,
          },
        });

        if (!stream) {
          // Get or create the user's channel first
          let channel = await tx.channel.findUnique({
            where: { userId },
            select: { id: true },
          });

          if (!channel) {
            // Create channel if it doesn't exist
            channel = await tx.channel.create({
              data: { userId },
              select: { id: true },
            });
          }

          // Create default stream record
          stream = await tx.stream.create({
            data: {
              channelId: channel.id,
              isChatEnabled: true,
              isChatDelayed: false,
              isChatFollowersOnly: false,
              isChatSubscribersOnly: false,
            },
            select: {
              id: true,
              channelId: true,
              isChatEnabled: true,
              isChatDelayed: true,
              isChatFollowersOnly: true,
              isChatSubscribersOnly: true,
            },
          });
        }

        // Check if there are actual changes to prevent unnecessary updates
        const currentSettings = {
          isChatEnabled: stream.isChatEnabled,
          isChatDelayed: stream.isChatDelayed,
          isChatFollowersOnly: stream.isChatFollowersOnly,
          isChatSubscribersOnly: stream.isChatSubscribersOnly,
        };

        const hasChanges = Object.entries(updateData).some(
          ([key, value]) =>
            currentSettings[key as keyof typeof currentSettings] !== value
        );

        if (!hasChanges) {
          return {
            updatedStream: stream,
            hasChanges: false,
          };
        }

        // Only include fields that are actually provided (not undefined)
        const fieldsToUpdate: Partial<ChatSettingsInput> = {};

        if (updateData.isChatEnabled !== undefined)
          fieldsToUpdate.isChatEnabled = updateData.isChatEnabled;
        if (updateData.isChatDelayed !== undefined)
          fieldsToUpdate.isChatDelayed = updateData.isChatDelayed;
        if (updateData.isChatFollowersOnly !== undefined)
          fieldsToUpdate.isChatFollowersOnly = updateData.isChatFollowersOnly;
        if (updateData.isChatSubscribersOnly !== undefined)
          fieldsToUpdate.isChatSubscribersOnly =
            updateData.isChatSubscribersOnly;

        const updatedStream = await tx.stream.update({
          where: { id: stream.id },
          data: fieldsToUpdate,
          select: {
            id: true,
            isChatEnabled: true,
            isChatDelayed: true,
            isChatFollowersOnly: true,
            isChatSubscribersOnly: true,
            updatedAt: true,
          },
        });

        return {
          updatedStream,
          hasChanges: true,
        };
      }
    );

    const payload = {
      chatSettings: {
        isChatEnabled: updatedStream.isChatEnabled,
        isChatDelayed: updatedStream.isChatDelayed,
        isChatFollowersOnly: updatedStream.isChatFollowersOnly,
        isChatSubscribersOnly: updatedStream.isChatSubscribersOnly,
      },
      updatedAt:
        "updatedAt" in updatedStream ? updatedStream.updatedAt : new Date(),
    };

    const message = hasChanges
      ? "Chat settings updated successfully"
      : "No changes detected";

    // Update cache with new data
    await redis.set(
      cacheKey,
      JSON.stringify({ chatSettings: payload.chatSettings }),
      "EX",
      TTL_SECONDS
    );

    return successResponse(message, 200, payload);
  } catch (err) {
    return errorResponse("Error while updating chat settings", 500, {
      message: err instanceof Error ? err.message : String(err),
    });
  }
});
