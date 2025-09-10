import { ViewTrackingService } from './viewTrackingService';

/**
 * Get combined view count from database and Redis
 * This provides the most accurate real-time view count
 */
export class ViewCountHelper {
  /**
   * Get view count for a single VOD
   * @param vodId - The VOD ID
   * @param dbViewCount - View count from database
   * @returns Combined view count (DB + Redis)
   */
  static async getCombinedViewCount(vodId: string, dbViewCount: number): Promise<number> {
    try {
      // Get Redis view count (pending updates)
      const redisViewCount = await ViewTrackingService.getViewCount(vodId);
      
      // Return database count + Redis pending count
      return dbViewCount + redisViewCount;
    } catch (error) {
      console.error('Error getting combined view count:', error);
      // Fallback to database count if Redis fails
      return dbViewCount;
    }
  }

  /**
   * Get view counts for multiple VODs
   * @param vodIds - Array of VOD IDs
   * @param dbViewCounts - View counts from database (VOD ID -> count mapping)
   * @returns Combined view counts (DB + Redis)
   */
  static async getCombinedViewCounts(
    vodIds: string[], 
    dbViewCounts: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      // Get Redis view counts for all VODs
      const redisViewCounts = await ViewTrackingService.getViewCounts(vodIds);
      
      // Combine database and Redis counts
      const combined: Record<string, number> = {};
      
      vodIds.forEach(vodId => {
        const dbCount = dbViewCounts[vodId] || 0;
        const redisCount = redisViewCounts[vodId] || 0;
        combined[vodId] = dbCount + redisCount;
      });
      
      return combined;
    } catch (error) {
      console.error('Error getting combined view counts:', error);
      // Fallback to database counts if Redis fails
      return dbViewCounts;
    }
  }

  /**
   * Get view count for a single VOD (simplified version)
   * @param vodId - The VOD ID
   * @returns Combined view count
   */
  static async getViewCount(vodId: string): Promise<number> {
    try {
      // Get Redis view count (this includes all pending updates)
      const redisViewCount = await ViewTrackingService.getViewCount(vodId);
      return redisViewCount;
    } catch (error) {
      console.error('Error getting view count:', error);
      return 0;
    }
  }
}
