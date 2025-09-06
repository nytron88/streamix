import Fuse from 'fuse.js';
import prisma from '@/lib/prisma/prisma';
import { getCloudFrontUrl } from '@/lib/services/s3Service';
import { getAvatarUrl } from '@/lib/services/cdnService';
import { ViewTrackingService } from './viewTrackingService';

export interface SearchOptions {
  query: string;
  type?: 'all' | 'vods' | 'users';
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  filters?: {
    visibility?: 'PUBLIC' | 'SUB_ONLY';
    isLive?: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface SearchResult {
  id: string;
  title: string;
  type: 'vod' | 'user';
  thumbnailUrl?: string;
  avatarUrl?: string;
  slug?: string;
  displayName?: string;
  followerCount?: number;
  viewCount?: number;
  publishedAt?: string;
  isLive?: boolean;
  visibility?: 'PUBLIC' | 'SUB_ONLY';
  score?: number; // Relevance score for fuzzy search
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query: string;
  type: 'all' | 'vods' | 'users';
  suggestions?: string[];
}

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.8 },
    { name: 'displayName', weight: 0.7 },
    { name: 'slug', weight: 0.6 },
    { name: 'description', weight: 0.4 },
    { name: 'tags', weight: 0.3 },
  ],
  threshold: 0.3, // Lower = more strict matching (0.0 = exact match, 1.0 = match anything)
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 1,
  shouldSort: true,
  findAllMatches: true,
  useExtendedSearch: true,
  ignoreLocation: true,
  ignoreFieldNorm: false,
};

export class SearchService {
  private static instance: SearchService;
  private fuseCache = new Map<string, Fuse<any>>();

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      type = 'all',
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      filters = {},
    } = options;

    const results: SearchResult[] = [];
    let totalCount = 0;

    // Search VODs if type is 'all' or 'vods'
    if (type === 'all' || type === 'vods') {
      const vodResults = await this.searchVods(query, page, limit, sortBy, filters);
      results.push(...vodResults);
    }

    // Search users if type === 'all' or 'users'
    if (type === 'all' || type === 'users') {
      const userResults = await this.searchUsers(query, page, limit, sortBy, filters);
      results.push(...userResults);
    }

    // Apply fuzzy search and scoring
    const fuzzyResults = this.applyFuzzySearch(results, query);

    // Sort results
    const sortedResults = this.sortResults(fuzzyResults, sortBy);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    // Get search suggestions
    const suggestions = await this.getSearchSuggestions(query);

    return {
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total: sortedResults.length,
        totalPages: Math.ceil(sortedResults.length / limit),
        hasNext: endIndex < sortedResults.length,
        hasPrev: page > 1,
      },
      query,
      type,
      suggestions,
    };
  }

  private async searchVods(
    query: string,
    page: number,
    limit: number,
    sortBy: string,
    filters: any
  ) {
    const where: any = {
      publishedAt: { not: null },
      title: {
        contains: query,
        mode: 'insensitive',
      },
    };

    if (filters.visibility) {
      where.visibility = filters.visibility;
    }

    if (filters.dateRange) {
      where.publishedAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end,
      };
    }

    const vods = await prisma.vod.findMany({
      where,
      take: Math.ceil(limit / 2),
      orderBy: this.getVodOrderBy(sortBy),
      select: {
        id: true,
        title: true,
        visibility: true,
        thumbnailS3Key: true,
        publishedAt: true,
        channel: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarS3Key: true,
            user: {
              select: {
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    // Get view counts from Redis for all VODs
    const vodIds = vods.map(vod => vod.id);
    const viewCounts = await ViewTrackingService.getViewCounts(vodIds);

    return vods.map((vod) => {
      let thumbnailUrl: string | undefined;
      let avatarUrl: string | undefined;

      try {
        thumbnailUrl = vod.thumbnailS3Key ? getCloudFrontUrl(vod.thumbnailS3Key) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        avatarUrl = getAvatarUrl(vod.channel as any, vod.channel.user as any);
      } catch (error) {
        // Silently handle URL generation errors
      }

      return {
        id: vod.id,
        title: vod.title,
        type: 'vod' as const,
        thumbnailUrl,
        viewCount: viewCounts[vod.id] || 0,
        publishedAt: vod.publishedAt!.toISOString(),
        visibility: vod.visibility,
        slug: vod.channel.slug || vod.channel.id,
        displayName: vod.channel.displayName || 'Unknown',
        avatarUrl,
      };
    });
  }

  private async searchUsers(
    query: string,
    page: number,
    limit: number,
    sortBy: string,
    filters: any
  ) {
    const where: any = {
      OR: [
        {
          displayName: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          slug: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          user: {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
        },
      ],
    };

    if (filters.isLive !== undefined) {
      where.stream = {
        isLive: filters.isLive,
      };
    }

    const channels = await prisma.channel.findMany({
      where,
      take: Math.ceil(limit / 2),
      orderBy: this.getUserOrderBy(sortBy),
      include: {
        user: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
        stream: {
          select: {
            isLive: true,
          },
        },
        _count: {
          select: {
            follows: true,
          },
        },
      },
    });

    return channels.map((channel) => {
      let avatarUrl: string | undefined;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        avatarUrl = getAvatarUrl(channel as any, channel.user as any);
      } catch (error) {
        // Silently handle URL generation errors
      }


      return {
        id: channel.id,
        title: channel.displayName || channel.user?.name || 'Unknown',
        type: 'user' as const,
        slug: channel.slug || channel.id,
        displayName: channel.displayName || channel.user?.name || 'Unknown',
        avatarUrl,
        followerCount: channel._count.follows,
        isLive: channel.stream?.isLive ?? false,
      };
    });
  }

  private applyFuzzySearch(results: SearchResult[], query: string): SearchResult[] {
    if (!query.trim()) return results;

    // Create enhanced search data with additional fields for better matching
    const enhancedResults = results.map(result => ({
      ...result,
      searchText: `${result.title} ${result.displayName || ''} ${result.slug || ''}`.toLowerCase(),
      titleLower: result.title.toLowerCase(),
      displayNameLower: (result.displayName || '').toLowerCase(),
      slugLower: (result.slug || '').toLowerCase(),
    }));

    const fuse = new Fuse(enhancedResults, fuseOptions);
    
    // Try multiple search strategies
    const searchStrategies = [
      query, // Original query
      query.toLowerCase(), // Lowercase
      query.replace(/[^\w\s]/g, ''), // Remove special characters
      query.split(' ').filter(word => word.length > 2).join(' '), // Remove short words
    ];

    let bestResults: any[] = [];
    let bestScore = Infinity;

    for (const searchQuery of searchStrategies) {
      if (!searchQuery.trim()) continue;
      
      const fuseResults = fuse.search(searchQuery);
      if (fuseResults.length > 0) {
        const avgScore = fuseResults.reduce((sum, r) => sum + (r.score || 0), 0) / fuseResults.length;
        if (avgScore < bestScore) {
          bestResults = fuseResults;
          bestScore = avgScore;
        }
      }
    }

    // If no fuzzy results, try exact matches
    if (bestResults.length === 0) {
      const exactMatches = enhancedResults.filter(result => 
        result.titleLower.includes(query.toLowerCase()) ||
        result.displayNameLower.includes(query.toLowerCase()) ||
        result.slugLower.includes(query.toLowerCase())
      );
      
      return exactMatches.map(result => ({
        ...result,
        score: 0.1, // High score for exact matches
      }));
    }

    return bestResults.map((result) => ({
      ...result.item,
      score: result.score || 0,
    }));
  }

  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => {
          const dateA = new Date(a.publishedAt || 0).getTime();
          const dateB = new Date(b.publishedAt || 0).getTime();
          return dateB - dateA;
        });
      case 'popularity':
        return results.sort((a, b) => {
          const popularityA = (a.followerCount || 0) + (a.viewCount || 0);
          const popularityB = (b.followerCount || 0) + (b.viewCount || 0);
          return popularityB - popularityA;
        });
      case 'relevance':
      default:
        return results.sort((a, b) => {
          // Live users first, then by score, then by popularity
          if (a.type === 'user' && a.isLive && b.type !== 'user') return -1;
          if (b.type === 'user' && b.isLive && a.type !== 'user') return 1;
          
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          
          const popularityA = (a.followerCount || 0) + (a.viewCount || 0);
          const popularityB = (b.followerCount || 0) + (b.viewCount || 0);
          return popularityB - popularityA;
        });
    }
  }

  private getVodOrderBy(sortBy: string) {
    switch (sortBy) {
      case 'date':
        return { publishedAt: 'desc' as const };
      case 'popularity':
        return { createdAt: 'desc' as const }; // Fallback since we don't have view counts yet
      case 'relevance':
      default:
        return { publishedAt: 'desc' as const };
    }
  }

  private getUserOrderBy(sortBy: string) {
    switch (sortBy) {
      case 'popularity':
        return { _count: { follows: 'desc' as const } };
      case 'date':
        return { createdAt: 'desc' as const };
      case 'relevance':
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query.trim() || query.length < 2) return [];

    // Get popular search terms that start with the query
    const suggestions = await prisma.channel.findMany({
      where: {
        OR: [
          {
            displayName: {
              startsWith: query,
              mode: 'insensitive',
            },
          },
          {
            slug: {
              startsWith: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        displayName: true,
        slug: true,
      },
      take: 5,
    });

    return suggestions
      .map((s) => s.displayName || s.slug)
      .filter((s): s is string => Boolean(s))
      .slice(0, 5);
  }
}

export const searchService = SearchService.getInstance();
