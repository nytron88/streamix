# Notification Worker

A background worker service that processes notifications from Redis and stores them in PostgreSQL while publishing real-time updates.

## Overview

The notification worker is responsible for:

1. **Reading** pending notifications from Redis (stored by the main web app)
2. **Processing** and validating notification data
3. **Storing** notifications in PostgreSQL for persistence
4. **Publishing** real-time updates to Redis channels for WebSocket consumption

## Architecture

```
Redis (Pending List) → Worker → PostgreSQL + Redis (Real-time)
```

### Notification Types

- **TIP**: User tips sent to channels
- **FOLLOW**: New followers for channels  
- **SUB**: Subscription events (created, updated, etc.)

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/streamix"

# Redis
REDIS_URL="redis://localhost:6379"

# Worker Configuration
BATCH_SIZE=50
PROCESSING_INTERVAL=5000
MAX_RETRIES=3

# Logging
LOG_LEVEL=info
```

## Development

### Quick Setup
```bash
# Run the setup script (recommended)
npm run setup

# Copy environment file and configure
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL
```

### Manual Setup
```bash
# Install dependencies
npm install

# Generate Prisma client from web app schema
npm run db:generate

# Copy and configure environment
cp .env.example .env
```

### Running the Worker
```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Database Management
```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Run database migrations (from web app schema)
npm run db:migrate

# Reset database (development only)
npm run db:reset
```

### Production Deployment
```bash
# Build the application
npm run build

# Start in production mode
npm start
```

## Data Flow

1. **Web App** stores notifications in Redis:
   - Adds to `notification:pending:list` set
   - Stores data under `notification:{type}:{id}` keys
   - Sets pending markers under `notification:pending:{type}:{id}`

2. **Worker** processes notifications:
   - Reads from `notification:pending:list`
   - Fetches notification data by ID
   - Validates data structure
   - Stores in PostgreSQL `Notification` table
   - Publishes to Redis channels for real-time updates
   - Marks as processed (removes from pending)

3. **Real-time Updates** published to:
   - `user:notifications:{userId}` - User-specific notifications
   - `channel:notifications:{channelId}` - Channel-specific notifications
   - `notifications:all` - Global notification stream

## Error Handling

- **Validation Errors**: Invalid notifications are marked as processed to prevent retry loops
- **Storage Errors**: Failed notifications remain in pending list for retry
- **Max Retries**: Worker stops after configured max retries to prevent infinite failures
- **Graceful Shutdown**: Handles SIGTERM/SIGINT for clean shutdown

## Monitoring

The worker logs detailed information about:
- Batch processing results
- Failed notifications
- Connection status
- Performance metrics

Use structured logging (JSON) in production for easy parsing and monitoring.

## Integration with WebSocket Service

After this worker processes notifications and publishes to Redis, a WebSocket service can:

1. Subscribe to Redis channels for real-time updates:
   - `user:notifications:{userId}` - User-specific notifications
   - `channel:notifications:{channelId}` - Channel-specific notifications  
   - `notifications:all` - Global notification stream

2. Maintain WebSocket connections with authenticated users

3. Push real-time notifications to connected clients

Example Redis subscription:
```javascript
redis.subscribe('notifications:all');
redis.on('message', (channel, message) => {
  const notification = JSON.parse(message);
  // Send to connected WebSocket clients
});
```
