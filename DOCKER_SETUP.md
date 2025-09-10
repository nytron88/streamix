# Docker Setup for Streamix

This guide explains how to run the entire Streamix application stack using Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine
- Docker Compose v2.0+

## Quick Start

1. **Clone the repository and navigate to the project root:**
   ```bash
   git clone <repository-url>
   cd streamix
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp apps/web/.env.example apps/web/.env.local
   
   # Edit the environment file with your configuration
   nano apps/web/.env.local
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   # Wait for services to be healthy, then run migrations
   docker-compose exec web npx prisma migrate deploy
   ```

5. **Access the application:**
   - Web App: http://localhost:3000
   - WebSocket Server: http://localhost:8080
   - Database: localhost:5432
   - Redis: localhost:6379

## Services

### 1. **Web Application** (Port 3000)
- Next.js application
- Handles user interface and API endpoints
- Connects to PostgreSQL and Redis

### 2. **Notification Worker** (Internal)
- Processes notifications in the background
- Enriches notification data with user/channel details
- Publishes to Redis for real-time delivery

### 3. **WebSocket Server** (Port 8080)
- Real-time notification delivery
- Socket.IO server for client connections
- Subscribes to Redis for notification events

### 4. **PostgreSQL** (Port 5432)
- Primary database
- Stores user data, channels, notifications, etc.

### 5. **Redis** (Port 6379)
- Caching layer
- Pub/Sub for real-time notifications
- Session storage

## Environment Variables

### Required for Web App:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/streamix
REDIS_URL=redis://redis:6379
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

### Required for Notify Worker:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/streamix
REDIS_URL=redis://redis:6379
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### Required for Notify WSS:
```env
REDIS_URL=redis://redis:6379
PORT=8080
```

## Development Commands

### Start all services:
```bash
docker-compose up -d
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f notify-worker
docker-compose logs -f notify-wss
```

### Stop all services:
```bash
docker-compose down
```

### Rebuild and restart:
```bash
docker-compose up --build -d
```

### Access service shell:
```bash
# Web app
docker-compose exec web sh

# Notify worker
docker-compose exec notify-worker sh

# Database
docker-compose exec postgres psql -U postgres -d streamix
```

## Database Management

### Run migrations:
```bash
docker-compose exec web npx prisma migrate deploy
```

### Reset database:
```bash
docker-compose exec web npx prisma migrate reset
```

### Open Prisma Studio:
```bash
docker-compose exec web npx prisma studio
```

## Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Web**: HTTP GET to `/api/health`
- **Notify Worker**: Simple node process check
- **Notify WSS**: HTTP GET to `/ping`

## Troubleshooting

### Service won't start:
1. Check logs: `docker-compose logs <service-name>`
2. Ensure all environment variables are set
3. Verify ports aren't already in use

### Database connection issues:
1. Wait for PostgreSQL to be healthy
2. Check DATABASE_URL format
3. Verify network connectivity between services

### WebSocket connection issues:
1. Check NEXT_PUBLIC_WS_URL is correct
2. Verify notify-wss service is running
3. Check firewall settings

### Build failures:
1. Clear Docker cache: `docker system prune -a`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Check Dockerfile syntax

## Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **SSL/TLS**: Configure reverse proxy (nginx/traefik)
3. **Monitoring**: Add logging and monitoring services
4. **Scaling**: Consider horizontal scaling for stateless services
5. **Backups**: Implement database backup strategy
6. **Security**: Use non-root users and security scanning

## File Structure

```
streamix/
├── docker-compose.yml          # Main compose file
├── .dockerignore              # Docker ignore patterns
├── DOCKER_SETUP.md            # This file
└── apps/
    ├── web/
    │   ├── Dockerfile         # Web app container
    │   └── src/app/api/health/ # Health check endpoint
    ├── notify-worker/
    │   └── Dockerfile         # Worker container
    └── notify-wss/
        └── Dockerfile         # WebSocket container
```

