# Streamix WebSocket Notification Server (notify-wss)

A real-time WebSocket server that subscribes to Redis pub/sub channels and delivers notifications to connected clients via Socket.IO.

## Overview

The `notify-wss` service is part of the Streamix notification system:

1. **Web App** → Pushes notifications to Redis queue
2. **Notify Worker** → Processes queue, stores in Postgres, publishes to Redis pub/sub
3. **Notify WSS** → Subscribes to Redis pub/sub, broadcasts to WebSocket clients ⬅️ **You are here**

## Features

- **Real-time WebSocket connections** using Socket.IO
- **JWT-based authentication** for secure connections
- **Redis pub/sub integration** for scalable message distribution
- **Room-based subscriptions** (user, channel, global notifications)
- **Health check endpoint** for monitoring
- **Graceful shutdown** handling
- **Docker support** for containerized deployment

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Redis Pub/Sub │ -> │   notify-wss     │ -> │  WebSocket       │
│                 │    │                  │    │  Clients         │
│ - user:notif:*  │    │ - Authentication │    │ - Web browsers   │
│ - channel:*     │    │ - Room management│    │ - Mobile apps    │
│ - global        │    │ - Broadcasting   │    │ - Other clients  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Redis instance
- JWT secret (shared with web app)

### Installation

```bash
# Install dependencies
npm install

# Setup (install deps, type-check, build)
npm run setup

# Or use the setup script
./scripts/setup.sh
```

### Environment Variables

Create a `.env` file:

```env
# Required
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-here

# Optional
PORT=8080
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Type check
npm run type-check
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Client Integration

### Authentication

Clients must provide a JWT token when connecting:

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:8080', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

The JWT payload should include:
```json
{
  "userId": "user_123",
  "displayName": "John Doe",
  "channelId": "channel_456" // Optional, for streamers
}
```

### Event Handling

```javascript
// Connection events
socket.on('connected', (message) => {
  console.log('Connected:', message);
});

socket.on('error', (error) => {
  console.error('Error:', error);
});

// Notification events
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Handle different notification types
  switch (notification.type) {
    case 'TIP':
      handleTipNotification(notification);
      break;
    case 'FOLLOW':
      handleFollowNotification(notification);
      break;
    case 'SUBSCRIPTION':
      handleSubscriptionNotification(notification);
      break;
  }
});
```

### Room Subscriptions

```javascript
// Subscribe to different notification types
socket.emit('join-user-notifications', 'user_123');
socket.emit('join-channel-notifications', 'channel_456');
socket.emit('join-global-notifications');

// Unsubscribe
socket.emit('leave-user-notifications', 'user_123');
socket.emit('leave-channel-notifications', 'channel_456');
socket.emit('leave-global-notifications');
```

## Notification Types

### Tip Notification
```typescript
{
  id: "notif_123",
  userId: "user_456",
  channelId: "channel_789",
  type: "TIP",
  data: {
    tipId: "tip_123",
    amount: 500, // in cents
    message: "Great stream!",
    tipper: {
      id: "user_abc",
      displayName: "Generous Viewer"
    },
    channel: {
      id: "channel_789",
      name: "StreamerName",
      slug: "streamername"
    }
  },
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Follow Notification
```typescript
{
  id: "notif_456",
  userId: "user_789",
  channelId: "channel_123",
  type: "FOLLOW",
  data: {
    follower: {
      id: "user_def",
      displayName: "New Follower",
      imageUrl: "https://example.com/avatar.jpg"
    },
    channel: {
      id: "channel_123",
      name: "StreamerName",
      slug: "streamername"
    }
  },
  timestamp: "2024-01-15T10:31:00Z"
}
```

### Subscription Notification
```typescript
{
  id: "notif_789",
  userId: "user_abc",
  channelId: "channel_def",
  type: "SUBSCRIPTION",
  data: {
    subscription: {
      id: "sub_123",
      tier: "premium",
      amount: 999 // in cents
    },
    subscriber: {
      id: "user_ghi",
      displayName: "Premium Subscriber",
      imageUrl: "https://example.com/avatar.jpg"
    },
    channel: {
      id: "channel_def",
      name: "StreamerName",
      slug: "streamername"
    }
  },
  timestamp: "2024-01-15T10:32:00Z"
}
```

## Redis Channels

The service subscribes to these Redis pub/sub channels:

- `user:notifications:{userId}` - User-specific notifications
- `channel:notifications:{channelId}` - Channel-specific notifications  
- `notifications:all` - Global notifications

## Socket.IO Rooms

Clients are automatically organized into rooms:

- `user-notifications:{userId}` - User's own notifications
- `channel-notifications:{channelId}` - Channel notifications
- `global-notifications` - Global notifications

## Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "connectedClients": 15,
  "totalSockets": 15,
  "rooms": ["user-notifications:user_123", "channel-notifications:channel_456"]
}
```

### Logs

The service uses structured logging with Winston:

```json
{
  "timestamp": "2024-01-15 10:30:00",
  "level": "info",
  "message": "Client connected",
  "service": "notify-wss",
  "socketId": "abc123",
  "userId": "user_456",
  "displayName": "John Doe"
}
```

## Docker Deployment

### Build Image

```bash
# Build from project root
docker build -f apps/notify-wss/Dockerfile -t streamix-notify-wss .
```

### Run Container

```bash
docker run -p 8080:8080 \
  -e REDIS_URL=redis://redis:6379 \
  -e JWT_SECRET=your-secret \
  -e CORS_ORIGIN=https://your-domain.com \
  streamix-notify-wss
```

### Docker Compose

```yaml
version: '3.8'
services:
  notify-wss:
    build:
      context: .
      dockerfile: apps/notify-wss/Dockerfile
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
    depends_on:
      - redis
```

## Scaling Considerations

### Horizontal Scaling

When running multiple instances:

1. **Load Balancer**: Use sticky sessions or configure Socket.IO for multiple nodes
2. **Redis Adapter**: Configure Socket.IO Redis adapter for cross-instance communication
3. **Health Checks**: Each instance provides its own health endpoint

### Performance

- **Connection Limits**: Monitor and set appropriate connection limits
- **Memory Usage**: Track connected clients and room subscriptions
- **Redis Connections**: Pool Redis connections appropriately

## Security

### Authentication
- JWT tokens are required for all connections
- Tokens are verified using the shared secret
- Invalid tokens result in connection rejection

### Authorization
- Users can only subscribe to their own user notifications
- Channel notifications are public (anyone can subscribe)
- Global notifications are public

### CORS
- Configure CORS origin to match your frontend domain
- Credentials are enabled for cookie-based auth if needed

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if Redis is running and accessible
   - Verify Redis URL in environment variables

2. **Authentication Failed**
   - Ensure JWT secret matches the web app
   - Check token format and expiration

3. **No Notifications Received**
   - Verify notify-worker is processing and publishing
   - Check Redis pub/sub channels
   - Ensure client is subscribed to correct rooms

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging:

```bash
LOG_LEVEL=debug npm run dev
```

## Integration with notify-worker

The `notify-wss` service works in conjunction with the `notify-worker`:

1. **notify-worker** processes notifications and publishes to Redis pub/sub
2. **notify-wss** subscribes to Redis pub/sub and broadcasts to WebSocket clients
3. Both services should use the same Redis instance and channel naming conventions

Make sure both services are running for the complete notification flow.
