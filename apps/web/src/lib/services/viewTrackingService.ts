import redis from '../redis/redis';

export class ViewTrackingService {
  private static readonly VIEW_COUNT_PREFIX = 'vod:views:';
  private static readonly VIEW_SESSION_PREFIX = 'vod:session:';
  private static readonly SESSION_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Track a view for a VOD
   * @param vodId - The VOD ID
   * @param sessionId - Optional session ID to prevent duplicate views
   * @returns Promise<boolean> - true if view was counted, false if already viewed
   */
  static async trackView(vodId: string, sessionId?: string): Promise<boolean> {
    try {
      // If sessionId provided, check if already viewed in this session
      if (sessionId) {
        const sessionKey = `${this.VIEW_SESSION_PREFIX}${vodId}:${sessionId}`;
        const alreadyViewed = await redis.get(sessionKey);
        
        if (alreadyViewed) {
          return false; // Already viewed in this session
        }
        
        // Mark as viewed in this session
        await redis.setex(sessionKey, this.SESSION_TTL, '1');
      }

      // Increment view count in Redis
      const viewKey = `${this.VIEW_COUNT_PREFIX}${vodId}`;
      await redis.incr(viewKey);
      
      // Publish update for real-time processing
      await redis.publish('view_count_updates', JSON.stringify({
        vodId,
        count: 1
      }));
      
      return true;
    } catch (error) {
      console.error('Error tracking view:', error);
      return false;
    }
  }

  /**
   * Get view count for a VOD from Redis
   * @param vodId - The VOD ID
   * @returns Promise<number> - The view count
   */
  static async getViewCount(vodId: string): Promise<number> {
    try {
      const viewKey = `${this.VIEW_COUNT_PREFIX}${vodId}`;
      const count = await redis.get(viewKey);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      console.error('Error getting view count:', error);
      return 0;
    }
  }

  /**
   * Get view counts for multiple VODs
   * @param vodIds - Array of VOD IDs
   * @returns Promise<Record<string, number>> - Object mapping VOD ID to view count
   */
  static async getViewCounts(vodIds: string[]): Promise<Record<string, number>> {
    try {
      if (vodIds.length === 0) return {};

      const keys = vodIds.map(id => `${this.VIEW_COUNT_PREFIX}${id}`);
      const counts = await redis.mget(...keys);
      
      const result: Record<string, number> = {};
      vodIds.forEach((vodId, index) => {
        result[vodId] = counts[index] ? parseInt(counts[index]!, 10) : 0;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting view counts:', error);
      return {};
    }
  }

  /**
   * Get all VOD view counts (for batch processing)
   * @returns Promise<Record<string, number>> - All VOD view counts
   */
  static async getAllViewCounts(): Promise<Record<string, number>> {
    try {
      const pattern = `${this.VIEW_COUNT_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return {};

      const counts = await redis.mget(...keys);
      const result: Record<string, number> = {};
      
      keys.forEach((key, index) => {
        const vodId = key.replace(this.VIEW_COUNT_PREFIX, '');
        result[vodId] = counts[index] ? parseInt(counts[index]!, 10) : 0;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting all view counts:', error);
      return {};
    }
  }

  /**
   * Clear view count for a VOD (for testing or cleanup)
   * @param vodId - The VOD ID
   */
  static async clearViewCount(vodId: string): Promise<void> {
    try {
      const viewKey = `${this.VIEW_COUNT_PREFIX}${vodId}`;
      await redis.del(viewKey);
    } catch (error) {
      console.error('Error clearing view count:', error);
    }
  }

  /**
   * Clear all view counts (for testing or cleanup)
   */
  static async clearAllViewCounts(): Promise<void> {
    try {
      const pattern = `${this.VIEW_COUNT_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Error clearing all view counts:', error);
    }
  }
}
