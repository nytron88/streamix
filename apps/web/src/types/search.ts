export type SearchResult = {
  id: string;
  title: string;
  type: "vod" | "user";
  thumbnailUrl?: string;
  avatarUrl?: string;
  slug?: string;
  displayName?: string;
  followerCount?: number;
  viewCount?: number;
  publishedAt?: string;
  isLive?: boolean;
  visibility?: "PUBLIC" | "SUB_ONLY";
};

export type SearchResponse = {
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
  type: "all" | "vods" | "users";
};

export type VodSearchResult = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  viewCount: number;
  publishedAt: string;
  visibility: "PUBLIC" | "SUB_ONLY";
  channel: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl?: string;
  };
};

export type UserSearchResult = {
  id: string;
  slug: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followerCount: number;
  isLive: boolean;
  description?: string;
};

export type VodSearchResponse = {
  vods: VodSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query: string;
};

export type UserSearchResponse = {
  users: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  query: string;
};
