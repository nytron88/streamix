export interface LiveStream {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  startedAt: string;
  channel: {
    id: string;
    slug: string | null;
    displayName: string | null;
    bio: string | null;
    category: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    followerCount: number;
    subscriberCount: number;
  };
}

export interface LiveStreamsResponse {
  streams: LiveStream[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
