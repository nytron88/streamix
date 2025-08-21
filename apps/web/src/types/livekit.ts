export type ViewerTokenOpts = {
  viewerId: string;
  roomName: string;
  viewerName?: string | null;
  ttlSeconds?: number;
  subscribeOnly?: boolean;
};
