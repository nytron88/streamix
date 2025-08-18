-- CreateTable
CREATE TABLE "public"."Stream" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT,
    "thumbnailS3Key" TEXT,
    "ingressId" TEXT,
    "serverUrl" TEXT,
    "streamKey" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "isChatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isChatDelayed" BOOLEAN NOT NULL DEFAULT false,
    "isChatFollowersOnly" BOOLEAN NOT NULL DEFAULT false,
    "currentSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stream_channelId_key" ON "public"."Stream"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Stream_ingressId_key" ON "public"."Stream"("ingressId");

-- CreateIndex
CREATE UNIQUE INDEX "Stream_currentSessionId_key" ON "public"."Stream"("currentSessionId");

-- AddForeignKey
ALTER TABLE "public"."Stream" ADD CONSTRAINT "Stream_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stream" ADD CONSTRAINT "Stream_currentSessionId_fkey" FOREIGN KEY ("currentSessionId") REFERENCES "public"."StreamSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
