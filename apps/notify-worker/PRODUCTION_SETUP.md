# Notify Worker Production Setup

## Environment Variables

The notify-worker service requires the following environment variables to be set in production:

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/streamix

# Redis
REDIS_URL=redis://host:6379

# CDN Configuration (CRITICAL for notification details)
# This MUST be set to your actual CloudFront domain
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### ⚠️ CRITICAL: CLOUDFRONT_DOMAIN

**If `CLOUDFRONT_DOMAIN` is not set, notifications will show incomplete details like:**
- "Follow Someone started following you on your channel"
- Missing avatar URLs and channel names

**This is the most common cause of notification display issues in production.**

### Optional Environment Variables

```bash
# Worker Configuration
BATCH_SIZE=50
PROCESSING_INTERVAL=5000
MAX_RETRIES=3

# Logging
LOG_LEVEL=info
```

## Production Deployment

### Docker Deployment

When deploying with Docker, make sure to pass the environment variables:

```bash
docker run -d \
  --name notify-worker \
  -e DATABASE_URL="your-database-url" \
  -e REDIS_URL="your-redis-url" \
  -e CLOUDFRONT_DOMAIN="your-cloudfront-domain.cloudfront.net" \
  your-image:tag
```

### Docker Compose

```yaml
services:
  notify-worker:
    build: ./apps/notify-worker
    environment:
      - DATABASE_URL=postgresql://username:password@postgres:5432/streamix
      - REDIS_URL=redis://redis:6379
      - CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
    depends_on:
      - postgres
      - redis
```

## Troubleshooting

### Notification Details Not Showing

If notifications show "Someone started following you" instead of proper names and avatars, check:

1. **CLOUDFRONT_DOMAIN is set**: The service needs this to generate proper avatar URLs
2. **Database connectivity**: Ensure the worker can connect to the database to fetch user/channel details
3. **Redis connectivity**: Ensure the worker can connect to Redis for processing notifications

### Check Environment Variables

You can verify the environment variables are loaded by checking the logs:

```bash
# The worker should log the CDN domain on startup
docker logs notify-worker | grep -i cdn
```

### Manual Test

To test if the CDN domain is working, you can check the notification payload in the database:

```sql
SELECT payload FROM notifications WHERE type = 'FOLLOW' ORDER BY "createdAt" DESC LIMIT 1;
```

The payload should contain proper `followerName`, `followerChannelName`, and `followerChannelAvatarUrl` fields with your CloudFront domain.
