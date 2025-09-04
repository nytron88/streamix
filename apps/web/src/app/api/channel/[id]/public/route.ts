import { NextRequest } from "next/server";
import { withLoggerAndErrorHandler } from "@/lib/api/withLoggerAndErrorHandler";
import { errorResponse, successResponse } from "@/lib/utils/responseWrapper";
import prisma from "@/lib/prisma/prisma";
import { getAvatarUrl, getBannerUrl } from "@/lib/services/cdnService";

export const GET = withLoggerAndErrorHandler(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const slug = params.id;

    if (!slug) {
      return errorResponse("Channel slug is required", 400);
    }

    try {
      // Find channel by slug
      const channel = await prisma.channel.findUnique({
        where: { slug },
        select: {
          id: true,
          userId: true,
          slug: true,
          displayName: true,
          bio: true,
          category: true,
          avatarS3Key: true,
          bannerS3Key: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              follows: true,
              subs: {
                where: {
                  status: {
                    in: ["ACTIVE", "CANCEL_SCHEDULED"],
                  },
                },
              },
            },
          },
        },
      });

      if (!channel) {
        return errorResponse("Channel not found", 404);
      }

      const payload = {
        channel: {
          id: channel.id,
          userId: channel.userId,
          slug: channel.slug,
          displayName: channel.displayName,
          bio: channel.bio,
          category: channel.category,
          followerCount: channel._count.follows,
          subscriberCount: channel._count.subs,
          createdAt: channel.createdAt,
          user: channel.user,
        },
        assets: {
          avatarUrl: getAvatarUrl(channel, channel.user),
          bannerUrl: getBannerUrl(channel),
        },
      };

      return successResponse("Channel fetched successfully", 200, payload);
    } catch (err) {
      return errorResponse("Failed to fetch channel", 500, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
);
