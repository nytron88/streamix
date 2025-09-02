export interface Vod {
  id: string;
  title: string;
  visibility: "PUBLIC" | "SUB_ONLY";
  s3Key: string | null;
  s3Bucket: string | null;
  s3Region: string | null;
  s3ETag: string | null;
  providerAssetId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  thumbnailS3Key: string | null;
  viewCount: number;
  s3Url: string | null;
  thumbnailUrl: string | null;
}

export interface VodUpdateData {
  title?: string;
  visibility?: "PUBLIC" | "SUB_ONLY";
  thumbnailS3Key?: string;
}

export interface VodsResponse {
  vods: Vod[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface VodResponse {
  vod: Vod;
}
