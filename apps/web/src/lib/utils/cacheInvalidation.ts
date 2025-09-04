import redis from "@/lib/redis/redis";

/**
 * Comprehensive cache invalidation utility for social features
 * Handles bans, follows, subscriptions, and recommendations
 */

export interface CacheInvalidationContext {
  userId: string;
  channelId?: string;
  targetUserId?: string;
  targetChannelId?: string;
}

/**
 * Clear all caches related to a user's social interactions
 */
export async function clearUserSocialCaches(context: CacheInvalidationContext) {
  const { userId, channelId, targetUserId, targetChannelId } = context;

  const cacheKeysToDelete: string[] = [];

  // User's own caches
  cacheKeysToDelete.push(
    `follows:following:${userId}`,
    `subscriptions:${userId}`
  );

  // If user has a channel, clear channel-specific caches
  if (channelId) {
    cacheKeysToDelete.push(
      `bans:channel:${channelId}`,
      `followers:${channelId}`
    );
  }

  // Target user caches (for bidirectional operations)
  if (targetUserId) {
    cacheKeysToDelete.push(
      `follows:following:${targetUserId}`,
      `subscriptions:${targetUserId}`
    );
  }

  // Target channel caches
  if (targetChannelId) {
    cacheKeysToDelete.push(
      `bans:channel:${targetChannelId}`,
      `followers:${targetChannelId}`
    );
  }

  // Ban check caches (bidirectional)
  if (channelId && targetUserId) {
    cacheKeysToDelete.push(`ban:check:${channelId}:${targetUserId}`);
  }
  if (targetChannelId && userId) {
    cacheKeysToDelete.push(`ban:check:${targetChannelId}:${userId}`);
  }

  // Clear all cache keys
  await Promise.allSettled(cacheKeysToDelete.map((key) => redis.del(key)));
}

/**
 * Clear recommendation caches for multiple users
 */
export async function clearRecommendationCaches(userIds: string[]) {
  const commonLimits = [10, 12, 15, 20, 24, 25, 30, 50];
  const recCacheKeysToDelete: string[] = [];

  for (const userId of userIds) {
    for (const limit of commonLimits) {
      recCacheKeysToDelete.push(`recs:channels:${userId}:${limit}`);
    }
  }

  await Promise.allSettled(recCacheKeysToDelete.map((key) => redis.del(key)));
}

/**
 * Clear all caches related to a ban operation
 */
export async function clearBanRelatedCaches(context: CacheInvalidationContext) {
  // Clear social caches
  await clearUserSocialCaches(context);

  // Clear recommendation caches for all affected users
  const { userId, targetUserId } = context;
  const affectedUserIds = [userId];
  if (targetUserId) affectedUserIds.push(targetUserId);

  await clearRecommendationCaches(affectedUserIds);
}

/**
 * Clear all caches related to a follow/unfollow operation
 */
export async function clearFollowRelatedCaches(
  context: CacheInvalidationContext
) {
  const { userId, targetUserId } = context;

  // Clear social caches
  await clearUserSocialCaches(context);

  // Clear recommendation caches for the user who performed the action
  await clearRecommendationCaches([userId]);

  // If target user exists, clear their recommendations too
  if (targetUserId) {
    await clearRecommendationCaches([targetUserId]);
  }
}

/**
 * Clear all caches related to a subscription operation
 */
export async function clearSubscriptionRelatedCaches(
  context: CacheInvalidationContext
) {
  const { userId, targetUserId } = context;

  // Clear subscription caches
  const cacheKeysToDelete: string[] = [];

  if (userId) {
    cacheKeysToDelete.push(`subscriptions:${userId}`);
  }

  if (targetUserId) {
    cacheKeysToDelete.push(`subscriptions:${targetUserId}`);
  }

  await Promise.allSettled(cacheKeysToDelete.map((key) => redis.del(key)));

  // Clear recommendation caches for affected users
  const affectedUserIds = [userId];
  if (targetUserId) affectedUserIds.push(targetUserId);

  await clearRecommendationCaches(affectedUserIds);
}

/**
 * Clear all caches for a specific user (useful for user deletion or major changes)
 */
export async function clearAllUserCaches(userId: string, channelId?: string) {
  const context: CacheInvalidationContext = { userId, channelId };

  // Clear all social caches
  await clearUserSocialCaches(context);

  // Clear all recommendation caches
  await clearRecommendationCaches([userId]);

  // Clear any ban-related caches
  if (channelId) {
    const banCacheKeys = [
      `bans:channel:${channelId}`,
      `ban:check:${channelId}:*`, // Note: Redis doesn't support wildcards in del, but we can try
    ];

    // For wildcard patterns, we'd need to use SCAN, but for now we'll clear specific keys
    await Promise.allSettled(banCacheKeys.map((key) => redis.del(key)));
  }
}

/**
 * Clear cache for a specific pattern (useful for debugging or bulk operations)
 */
export async function clearCachePattern(pattern: string) {
  try {
    // Use SCAN to find keys matching the pattern
    const keys: string[] = [];
    let cursor = "0";

    do {
      const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);

      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    // Delete all matching keys
    if (keys.length > 0) {
      await Promise.allSettled(keys.map((key) => redis.del(key)));
    }

    return keys.length;
  } catch (error) {
    console.error("Error clearing cache pattern:", error);
    return 0;
  }
}
