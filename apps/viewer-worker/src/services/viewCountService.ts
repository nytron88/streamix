import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { config } from "../config";

export class ViewCountService {
  private static readonly VIEW_COUNT_PREFIX = "vod:views:";
  private static readonly BATCH_UPDATE_PREFIX = "vod:batch:";

  /**
   * Get all view counts from Redis
   */
  static async getAllViewCounts(): Promise<Record<string, number>> {
    try {
      const pattern = `${this.VIEW_COUNT_PREFIX}*`;
      const keys = await redis.keys(pattern);

      if (keys.length === 0) return {};

      const counts = await redis.mGet(keys);
      const result: Record<string, number> = {};

      keys.forEach((key, index) => {
        const vodId = key.replace(this.VIEW_COUNT_PREFIX, "");
        result[vodId] = counts[index] ? parseInt(counts[index]!, 10) : 0;
      });

      return result;
    } catch (error) {
      console.error("Error getting all view counts from Redis:", error);
      return {};
    }
  }

  /**
   * Batch update view counts in the database
   */
  static async batchUpdateViewCounts(
    viewCounts: Record<string, number>
  ): Promise<void> {
    if (Object.keys(viewCounts).length === 0) return;

    try {
      const vodIds = Object.keys(viewCounts);
      console.log(`Batch updating view counts for ${vodIds.length} VODs`);

      // Get current view counts from database
      const currentVods = await prisma.vod.findMany({
        where: {
          id: {
            in: vodIds,
          },
        },
        select: {
          id: true,
          viewCount: true,
        },
      });

      const currentViewCounts = currentVods.reduce(
        (acc: Record<string, number>, vod: any) => {
          acc[vod.id] = vod.viewCount;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate updates needed
      const updates: Array<{ id: string; newCount: number }> = [];

      for (const [vodId, redisCount] of Object.entries(viewCounts)) {
        const currentCount = currentViewCounts[vodId] || 0;
        const newCount = currentCount + redisCount;

        if (redisCount > 0) {
          updates.push({ id: vodId, newCount });
        }
      }

      if (updates.length === 0) {
        console.log("No view count updates needed");
        return;
      }

      // Batch update in database
      await prisma.$transaction(
        updates.map(({ id, newCount }) =>
          prisma.vod.update({
            where: { id },
            data: { viewCount: newCount },
          })
        )
      );

      console.log(
        `Successfully updated view counts for ${updates.length} VODs`
      );

      // Clear Redis counts after successful database update
      await this.clearProcessedViewCounts(Object.keys(viewCounts));
    } catch (error) {
      console.error("Error batch updating view counts:", error);
      throw error;
    }
  }

  /**
   * Clear processed view counts from Redis
   */
  static async clearProcessedViewCounts(vodIds: string[]): Promise<void> {
    try {
      const keys = vodIds.map((id) => `${this.VIEW_COUNT_PREFIX}${id}`);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`Cleared ${keys.length} processed view counts from Redis`);
      }
    } catch (error) {
      console.error("Error clearing processed view counts:", error);
    }
  }

  /**
   * Get view count for a specific VOD from database
   */
  static async getViewCountFromDatabase(vodId: string): Promise<number> {
    try {
      const vod = await prisma.vod.findUnique({
        where: { id: vodId },
        select: { viewCount: true },
      });
      return vod?.viewCount || 0;
    } catch (error) {
      console.error("Error getting view count from database:", error);
      return 0;
    }
  }

  /**
   * Get view counts for multiple VODs from database
   */
  static async getViewCountsFromDatabase(
    vodIds: string[]
  ): Promise<Record<string, number>> {
    try {
      const vods = await prisma.vod.findMany({
        where: {
          id: {
            in: vodIds,
          },
        },
        select: {
          id: true,
          viewCount: true,
        },
      });

      return vods.reduce((acc: Record<string, number>, vod: any) => {
        acc[vod.id] = vod.viewCount;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error("Error getting view counts from database:", error);
      return {};
    }
  }

  /**
   * Process a single batch of view counts
   */
  static async processBatch(): Promise<number> {
    try {
      const viewCounts = await this.getAllViewCounts();
      const count = Object.keys(viewCounts).length;

      if (count === 0) {
        return 0;
      }

      await this.batchUpdateViewCounts(viewCounts);
      return count;
    } catch (error) {
      console.error("Error processing view count batch:", error);
      return 0;
    }
  }
}
