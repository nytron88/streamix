# Streamix WebSocket Notification Server

A WebSocket server that provides real-time notifications to connected clients.

## Overview

The WebSocket notification server is responsible for:
- Managing WebSocket connections from clients
- Subscribing to Redis notification channels
- Broadcasting notifications to connected clients
- Handling authentication and authorization
- Managing connection state and cleanup

## Features

- **Real-time Notifications**: Instant delivery of notifications to connected clients
- **User Authentication**: Secure WebSocket connections with authentication
- **Channel-based Broadcasting**: Targeted notifications to specific users or channels
- **Connection Management**: Robust connection handling and cleanup
- **Health Monitoring**: Built-in health checks and monitoring
- **Scalable Architecture**: Designed for horizontal scaling

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **WebSocket**: Socket.IO for WebSocket management
- **Cache**: Redis for pub/sub messaging
- **Authentication**: JWT token validation
- **Logging**: Structured logging with Winston
- **Containerization**: Docker

## Project Structure

```
apps/notify-wss/
├── src/
│   ├── config/              # Configuration management
│   ├── lib/                 # Utility libraries
│   │   ├── logger.ts       # Logging configuration
│   │   └── redis.ts        # Redis client
│   ├── middleware/          # Middleware functions
│   │   └── auth.ts         # Authentication middleware
│   ├── services/           # Business logic services
│   │   ├── redisSubscriptionService.ts  # Redis subscription management
│   │   └── websocketServer.ts          # WebSocket server management
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Application entry point
├── Dockerfile             # Docker configuration
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- Redis instance
- Environment variables configured

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Required environment variables
   REDIS_URL=redis://localhost:6379
   PORT=8080
   NODE_ENV=production
   JWT_SECRET=your-jwt-secret-key
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

### Using Docker

```bash
# Build the container
docker build -t streamix-notify-wss .

# Run the container
docker run -d \
  --name notify-wss \
  --env-file .env \
  -p 8080:8080 \
  streamix-notify-wss
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REDIS_URL` | Redis connection string | Yes | - |
| `PORT` | Server port | No | `8080` |
| `NODE_ENV` | Node environment | No | `production` |
| `JWT_SECRET` | JWT secret for authentication | Yes | - |
| `LOG_LEVEL` | Logging level | No | `info` |
| `CORS_ORIGIN` | CORS origin for WebSocket connections | No | `*` |

### Redis Channels

The server subscribes to the following Redis channels:
- `notifications:user:{userId}` - User-specific notifications
- `notifications:channel:{channelId}` - Channel-specific notifications
- `notifications:global` - Global notifications

## WebSocket API

### Connection

```javascript
// Connect to WebSocket server
const socket = io('http://localhost:8080', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Authentication

All WebSocket connections require authentication via JWT token:

```javascript
// Send authentication token
socket.emit('authenticate', {
  token: 'your-jwt-token'
});
```

### Events

#### Client to Server

**`authenticate`**
- Authenticate the connection
- Payload: `{ token: string }`

**`join_channel`**
- Join a specific notification channel
- Payload: `{ channelId: string }`

**`leave_channel`**
- Leave a notification channel
- Payload: `{ channelId: string }`

**`subscribe_user`**
- Subscribe to user-specific notifications
- Payload: `{ userId: string }`

**`unsubscribe_user`**
- Unsubscribe from user-specific notifications
- Payload: `{ userId: string }`

#### Server to Client

**`notification`**
- New notification received
- Payload: `NotificationPayload`

**`authenticated`**
- Authentication successful
- Payload: `{ success: true }`

**`error`**
- Error occurred
- Payload: `{ message: string, code?: string }`

### Notification Payload

```typescript
interface NotificationPayload {
  id: string;
  userId: string;
  type: 'TIP' | 'SUB' | 'FOLLOW' | 'SYSTEM';
  payload: {
    amount?: number;
    currency?: string;
    channelId?: string;
    channelName?: string;
    userName?: string;
    userImage?: string;
    message?: string;
  };
  readAt?: Date;
  createdAt: Date;
}
```

## Client Integration

### JavaScript/TypeScript

```javascript
import { io } from 'socket.io-client';

class NotificationClient {
  constructor(token) {
    this.socket = io('http://localhost:8080', {
      auth: { token }
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to notification server');
    });
    
    this.socket.on('notification', (notification) => {
      this.handleNotification(notification);
    });
    
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  handleNotification(notification) {
    // Handle the notification
    console.log('New notification:', notification);
  }
  
  joinChannel(channelId) {
    this.socket.emit('join_channel', { channelId });
  }
  
  subscribeToUser(userId) {
    this.socket.emit('subscribe_user', { userId });
  }
}
```

### React Hook

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useNotifications(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    if (!token) return;
    
    const newSocket = io('http://localhost:8080', {
      auth: { token }
    });
    
    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [token]);
  
  return { socket, notifications };
}
```

## Development

### Running in Development

```bash
# Start with hot reload
npm run dev

# Start with debug logging
LOG_LEVEL=debug npm run dev

# Start with specific port
PORT=3001 npm run dev
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Build with Docker
docker build -t streamix-notify-wss .
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Monitoring

### Health Checks

The server includes health checks for:
- Redis connectivity
- WebSocket server status
- Active connections count

### Logging

Structured logging with different levels:
- **error**: Critical errors and exceptions
- **warn**: Warning messages and recoverable errors
- **info**: General information and connection status
- **debug**: Detailed debugging information

### Metrics

Key metrics to monitor:
- Active WebSocket connections
- Messages sent per second
- Connection/disconnection rates
- Error rates
- Redis subscription health

## Troubleshooting

### Common Issues

**Connection Refused:**
- Check if server is running
- Verify port is not blocked
- Check firewall settings

**Authentication Failures:**
- Verify JWT token is valid
- Check JWT_SECRET configuration
- Ensure token is not expired

**Redis Connection Errors:**
- Verify REDIS_URL is correct
- Check Redis server is running
- Verify Redis authentication if configured

**High Memory Usage:**
- Monitor connection count
- Check for memory leaks
- Implement connection limits

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
LOG_LEVEL=debug npm run dev
```

## Performance

### Optimization Tips

1. **Connection Pooling**: Use Redis connection pooling
2. **Message Batching**: Batch messages when possible
3. **Connection Limits**: Implement connection limits
4. **Memory Management**: Monitor and optimize memory usage
5. **Error Handling**: Implement proper error handling

### Scaling

- **Horizontal Scaling**: Run multiple server instances
- **Load Balancing**: Use load balancer for WebSocket connections
- **Redis Clustering**: Use Redis cluster for high availability
- **Monitoring**: Implement comprehensive monitoring

## Security

### Best Practices

- Use JWT for authentication
- Implement rate limiting
- Validate all incoming data
- Use secure WebSocket connections (WSS)
- Implement proper error handling

### Authentication

- JWT token validation
- Token expiration handling
- Secure token transmission
- User session management

## Production Deployment

### Docker Deployment

```bash
# Build production image
docker build -t streamix-notify-wss:latest .

# Run with environment variables
docker run -d \
  --name notify-wss \
  --env-file .env \
  -p 8080:8080 \
  streamix-notify-wss:latest
```

### Environment Configuration

```bash
# Production environment variables
REDIS_URL=redis://redis-cluster:6379
PORT=8080
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### Load Balancing

For multiple instances, use a load balancer that supports WebSocket:
- Nginx with WebSocket support
- HAProxy
- AWS Application Load Balancer

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.