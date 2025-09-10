# Viewer Worker

A background service that processes view count data from Redis and batches updates to the PostgreSQL database for optimal performance.

## Overview

The Viewer Worker is responsible for:
- Collecting view count increments from Redis
- Batching view count updates to reduce database load
- Syncing accumulated view counts to the database
- Providing real-time view count updates via Redis pub/sub
- Maintaining data consistency between Redis and PostgreSQL

## Features

- **Batch Processing**: Processes view counts in configurable batches to optimize database performance
- **Real-time Updates**: Subscribes to Redis pub/sub for immediate view count processing
- **Data Consistency**: Ensures Redis and database view counts stay synchronized
- **Health Monitoring**: Built-in health check endpoint for service monitoring
- **Graceful Shutdown**: Handles shutdown signals properly to process remaining batches
- **Error Handling**: Robust error handling with logging and recovery mechanisms

## Architecture

```
Redis (View Counts) → Viewer Worker → PostgreSQL (Batch Updates)
     ↑                    ↓
     └── Pub/Sub ←─── Real-time Updates
```

### Components

- **ViewCountService**: Core service for batch processing view counts
- **RedisSubscriber**: Handles real-time Redis pub/sub updates
- **WorkerService**: Main orchestration service
- **HealthService**: Health check endpoint management

## Tech Stack

- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM and client
- **Redis**: Caching and pub/sub messaging
- **PostgreSQL**: Primary database
- **Docker**: Containerization

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server
- Docker (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run prisma:generate
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

### Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://username:password@localhost:5432/streamix` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `BATCH_SIZE` | Number of view counts to process per batch | `100` |
| `BATCH_INTERVAL_MS` | Batch processing interval in milliseconds | `30000` (30s) |
| `HEALTH_CHECK_PORT` | Health check server port | `3003` |
| `LOG_LEVEL` | Logging level | `info` |

### Development

Start the worker in development mode:
```bash
npm run dev
```

### Production

Build and start the worker:
```bash
npm run build
npm start
```

### Docker

Build and run with Docker:
```bash
docker build -t viewer-worker .
docker run -p 3003:3003 viewer-worker
```

## API Reference

### Health Check

**GET** `/health` or `/ping`

Returns worker health status.

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "viewer-worker"
}
```

### Redis Pub/Sub

The worker subscribes to the `view_count_updates` channel for real-time updates.

Message format:
```json
{
  "vodId": "vod_123",
  "count": 1
}
```

## Monitoring

### Health Checks

The worker exposes a health check endpoint at `/health` that returns:
- Service status
- Timestamp
- Service name

### Logging

The worker logs:
- Batch processing results
- Error conditions
- Redis subscription status
- Database connection status

### Metrics

Key metrics to monitor:
- Batch processing frequency
- View count updates processed
- Database update success rate
- Redis connection status
- Memory usage

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL is running and accessible
   - Verify database credentials

2. **Redis Connection Failed**
   - Check `REDIS_URL` environment variable
   - Ensure Redis is running and accessible
   - Verify Redis configuration

3. **Batch Processing Not Working**
   - Check Redis for view count keys (`vod:views:*`)
   - Verify database permissions
   - Check worker logs for errors

4. **High Memory Usage**
   - Reduce `BATCH_SIZE` if processing large batches
   - Check for memory leaks in logs
   - Monitor Redis memory usage

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Manual Batch Processing

Test batch processing manually:
```bash
# Connect to Redis and check view counts
redis-cli keys "vod:views:*"

# Check database view counts
# (Use your preferred database client)
```

## Performance Tuning

### Batch Size

Adjust `BATCH_SIZE` based on:
- Database performance
- Available memory
- View count volume

Recommended values:
- Low volume: 50-100
- Medium volume: 100-500
- High volume: 500-1000

### Batch Interval

Adjust `BATCH_INTERVAL_MS` based on:
- Real-time requirements
- System load
- Database capacity

Recommended values:
- Real-time: 5000-10000ms (5-10s)
- Standard: 30000ms (30s)
- Low priority: 60000ms (1min)

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Test with Docker

## License

This project is part of the Streamix platform.
