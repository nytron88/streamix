# Streamix Notification Worker

A background service that processes and enriches notifications for the Streamix platform.

## Overview

The notification worker is responsible for:
- Processing notification events from the database
- Enriching notification data with user and channel details
- Publishing notifications to Redis for real-time delivery
- Handling notification persistence and cleanup

## Features

- **Event Processing**: Processes follow, tip, and subscription notifications
- **Data Enrichment**: Adds user and channel details to notifications
- **Redis Publishing**: Publishes notifications to Redis channels for real-time delivery
- **Error Handling**: Robust error handling and retry mechanisms
- **Health Monitoring**: Built-in health checks and monitoring

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Database**: Prisma ORM with PostgreSQL
- **Cache**: Redis for pub/sub messaging
- **Logging**: Structured logging with Winston
- **Containerization**: Docker

## Project Structure

```
apps/notify-worker/
├── src/
│   ├── config/              # Configuration management
│   ├── lib/                 # Utility libraries
│   │   ├── logger.ts       # Logging configuration
│   │   ├── prisma.ts       # Database client
│   │   └── redis.ts        # Redis client
│   ├── services/           # Business logic services
│   │   ├── notificationProcessor.ts    # Main notification processor
│   │   ├── notificationPublisher.ts    # Redis publisher
│   │   ├── notificationStorage.ts      # Database operations
│   │   └── notificationWorker.ts       # Worker orchestration
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Application entry point
├── prisma/                 # Database schema (shared with web app)
├── Dockerfile             # Docker configuration
└── package.json           # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
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
   DATABASE_URL=postgresql://user:password@localhost:5432/streamix
   REDIS_URL=redis://localhost:6379
   CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
   NODE_ENV=production
   ```

3. **Start the worker**
   ```bash
   npm run dev
   ```

### Using Docker

```bash
# Build the container
docker build -t streamix-notify-worker .

# Run the container
docker run -d \
  --name notify-worker \
  --env-file .env \
  streamix-notify-worker
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `CLOUDFRONT_DOMAIN` | CloudFront domain for CDN | Yes | - |
| `NODE_ENV` | Node environment | No | `production` |
| `LOG_LEVEL` | Logging level | No | `info` |

### Database Schema

The worker uses the same Prisma schema as the web application, specifically:
- **Notification**: Stores notification records
- **User**: User information for enrichment
- **Channel**: Channel information for enrichment
- **Follow**: Follow relationships
- **Tip**: Tip transactions
- **Subscription**: Subscription data

## Architecture

### Notification Flow

1. **Event Detection**: Database triggers or application events create notification records
2. **Processing**: Worker picks up notification records from the database
3. **Enrichment**: Adds user and channel details to notifications
4. **Publishing**: Publishes enriched notifications to Redis channels
5. **Cleanup**: Removes processed notifications or marks them as processed

### Redis Channels

- `notifications:user:{userId}` - User-specific notifications
- `notifications:channel:{channelId}` - Channel-specific notifications
- `notifications:global` - Global notifications

## API Reference

### Notification Types

```typescript
enum NotificationType {
  TIP = 'TIP',
  SUB = 'SUB',
  FOLLOW = 'FOLLOW',
  SYSTEM = 'SYSTEM'
}
```

### Notification Payload

```typescript
interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  payload: {
    // Type-specific data
    amount?: number;
    currency?: string;
    channelId?: string;
    channelName?: string;
    userName?: string;
    userImage?: string;
  };
  readAt?: Date;
  createdAt: Date;
}
```

## Development

### Running in Development

```bash
# Start with hot reload
npm run dev

# Start with debug logging
LOG_LEVEL=debug npm run dev

# Start with specific environment
NODE_ENV=development npm run dev
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Build with Docker
docker build -t streamix-notify-worker .
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

The worker includes health checks for:
- Database connectivity
- Redis connectivity
- Worker process status

### Logging

Structured logging with different levels:
- **error**: Critical errors and exceptions
- **warn**: Warning messages and recoverable errors
- **info**: General information and processing status
- **debug**: Detailed debugging information

### Metrics

Key metrics to monitor:
- Notifications processed per minute
- Processing latency
- Error rates
- Database connection health
- Redis connection health

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Check DATABASE_URL format
- Verify database is running and accessible
- Check network connectivity

**Redis Connection Errors:**
- Verify REDIS_URL is correct
- Check Redis server is running
- Verify Redis authentication if configured

**Processing Errors:**
- Check notification data format
- Verify required fields are present
- Check for data type mismatches

**Memory Issues:**
- Monitor memory usage
- Check for memory leaks in processing
- Consider batch size optimization

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
LOG_LEVEL=debug npm run dev
```

## Performance

### Optimization Tips

1. **Batch Processing**: Process notifications in batches
2. **Connection Pooling**: Use connection pooling for database
3. **Redis Pipelining**: Use Redis pipelining for bulk operations
4. **Error Handling**: Implement proper retry mechanisms
5. **Resource Management**: Monitor and limit resource usage

### Scaling

- **Horizontal Scaling**: Run multiple worker instances
- **Load Balancing**: Distribute load across workers
- **Queue Management**: Use Redis queues for load distribution
- **Monitoring**: Implement comprehensive monitoring

## Security

### Best Practices

- Use environment variables for sensitive data
- Implement proper error handling
- Validate all input data
- Use secure database connections
- Implement proper logging without sensitive data

### Data Privacy

- Handle user data securely
- Implement data retention policies
- Ensure GDPR compliance
- Use encryption for sensitive data

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.