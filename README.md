# Streamix

A modern live streaming platform built with Next.js, featuring real-time chat, notifications, and monetization tools.

**🌐 Live Demo**: [streamix-ten.vercel.app](https://streamix-ten.vercel.app)

## Features

- **Live Streaming**: Go live instantly with powerful streaming tools powered by LiveKit
- **Real-time Chat**: Interactive chat with moderation tools and subscriber-only mode
- **Notifications**: Real-time WebSocket notifications for follows, tips, and subscriptions
- **Monetization**: Built-in tipping and subscription system with Stripe integration
- **VOD Support**: Video-on-demand with AWS S3 storage and CloudFront CDN
- **User Management**: Complete user profiles and channel management with Clerk authentication
- **Search & Discovery**: Find streams and content easily with advanced search
- **View Tracking**: Real-time view count tracking with Redis and batch processing
- **Responsive Design**: Mobile-first design with dark/light theme support

## Architecture

This is a monorepo containing multiple microservices:

- **`apps/web`** - Next.js 15 frontend application with TypeScript
- **`apps/notify-worker`** - Background notification processing service
- **`apps/notify-wss`** - WebSocket server for real-time notifications
- **`apps/viewer-worker`** - Batch processing service for view count updates

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS 3
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Real-time**: WebSockets (Socket.IO), Redis Pub/Sub
- **Storage**: AWS S3, CloudFront CDN, PostgreSQL
- **Payments**: Stripe (subscriptions, tips, webhooks)
- **Streaming**: LiveKit (WebRTC, SFU)
- **Authentication**: Clerk (OAuth, webhooks)
- **Deployment**: Docker, Docker Compose, Vercel, AW
- **Monitoring**: Winston logging, health checks

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL (if running locally)
- Redis (if running locally)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd streamix
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files for each service
   cp apps/web/.env.example apps/web/.env
   cp apps/notify-worker/.env.example apps/notify-worker/.env
   cp apps/notify-wss/.env.example apps/notify-wss/.env
   cp apps/viewer-worker/.env.example apps/viewer-worker/.env
   
   # Edit each .env file with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web App: http://localhost:3000
   - WebSocket Server: http://localhost:8000
   - Viewer Worker Health: http://localhost:3003/health
   - Database: localhost:5432
   - Redis: localhost:6379

### Local Development

1. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install app dependencies
   cd apps/web && npm install
   cd ../notify-worker && npm install
   cd ../notify-wss && npm install
   cd ../viewer-worker && npm install
   ```

2. **Set up the database**
   ```bash
   cd apps/web
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Start services**
   ```bash
   # Terminal 1 - Web app
   cd apps/web && npm run dev

   # Terminal 2 - Notification worker
   cd apps/notify-worker && npm run dev

   # Terminal 3 - WebSocket server
   cd apps/notify-wss && npm run dev

   # Terminal 4 - Viewer worker
   cd apps/viewer-worker && npm run dev
   ```

## Project Structure

```
streamix/
├── apps/
│   ├── web/                 # Next.js 15 frontend application
│   │   ├── src/
│   │   │   ├── app/         # App Router pages and API routes
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── lib/         # Utilities and services
│   │   │   └── types/       # TypeScript type definitions
│   │   ├── prisma/          # Database schema and migrations
│   │   └── .env.example     # Environment variables template
│   ├── notify-worker/       # Background notification processing
│   │   ├── src/
│   │   │   ├── services/    # Notification processing logic
│   │   │   └── lib/         # Database and Redis connections
│   │   └── .env.example     # Environment variables template
│   ├── notify-wss/          # WebSocket notification server
│   │   ├── src/
│   │   │   ├── services/    # WebSocket and Redis services
│   │   │   └── middleware/  # Authentication middleware
│   │   └── .env.example     # Environment variables template
│   └── viewer-worker/       # View count batch processing
│       ├── src/
│       │   ├── services/    # View count processing logic
│       │   └── lib/         # Database and Redis connections
│       └── .env.example     # Environment variables template
├── docker-compose.yml       # Docker orchestration
└── README.md               # This file
```

## Configuration

### Environment Variables

Each service has its own `.env.example` file with the required environment variables. Copy and configure them for your setup:

```bash
# Copy environment files
cp apps/web/.env.example apps/web/.env
cp apps/notify-worker/.env.example apps/notify-worker/.env
cp apps/notify-wss/.env.example apps/notify-wss/.env
cp apps/viewer-worker/.env.example apps/viewer-worker/.env

# Edit each .env file with your configuration
```

**Key Environment Variables:**
- **Database**: `DATABASE_URL` (PostgreSQL connection string)
- **Redis**: `REDIS_URL` (Redis connection string)
- **Authentication**: Clerk keys for user management
- **Payments**: Stripe keys for subscriptions and tips
- **Storage**: AWS S3 credentials for file uploads
- **Streaming**: LiveKit credentials for live streaming
- **WebSocket**: Server configuration for real-time features

**For Production Deployment:**
- **Web App**: Deployed on Vercel at [streamix-ten.vercel.app](https://streamix-ten.vercel.app)
- **Workers**: Deployed on AWS ECS Fargate (notify-worker, notify-wss, viewer-worker)
- **Database**: PostgreSQL on Neon
- **Cache**: Redis Cloud
- **Storage**: AWS S3 with CloudFront CDN
- CloudFront configuration is only needed for production CDN setup

### Database Setup

The application uses PostgreSQL with Prisma ORM. Run migrations:

```bash
cd apps/web
npx prisma migrate dev
```

## Docker Services

The application runs as a multi-service Docker stack:

- **web**: Next.js application (port 3000)
- **notify-worker**: Background notification processor
- **notify-wss**: WebSocket server (port 8000)
- **viewer-worker**: View count batch processor (port 3003)
- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f web
docker-compose logs -f notify-worker
docker-compose logs -f notify-wss
docker-compose logs -f viewer-worker

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Access service shell
docker-compose exec web sh
docker-compose exec notify-worker sh
docker-compose exec notify-wss sh
docker-compose exec viewer-worker sh
docker-compose exec postgres psql -U postgres -d streamix
```

### Database Management

```bash
# Run migrations
docker-compose exec web npx prisma migrate deploy

# Reset database
docker-compose exec web npx prisma migrate reset

# Open Prisma Studio
docker-compose exec web npx prisma studio
```

### Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Web**: HTTP GET to `/api/health`
- **Notify Worker**: Simple node process check
- **Notify WSS**: HTTP GET to `/ping`
- **Viewer Worker**: HTTP GET to `http://localhost:3003/health`

### Troubleshooting

**Service won't start:**
1. Check logs: `docker-compose logs <service-name>`
2. Ensure all environment variables are set
3. Verify ports aren't already in use

**Database connection issues:**
1. Wait for PostgreSQL to be healthy
2. Check DATABASE_URL format
3. Verify network connectivity between services

**WebSocket connection issues:**
1. Check NEXT_PUBLIC_WS_URL is correct
2. Verify notify-wss service is running
3. Check firewall settings

**Build failures:**
1. Clear Docker cache: `docker system prune -a`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Check Dockerfile syntax

## Documentation

- [Web App Documentation](./apps/web/README.md)
- [Notification Worker Documentation](./apps/notify-worker/README.md)
- [WebSocket Server Documentation](./apps/notify-wss/README.md)
- [Viewer Worker Documentation](./apps/viewer-worker/README.md)

## Testing

```bash
# Run all tests
npm test

# Run specific service tests
cd apps/web && npm test
cd apps/notify-worker && npm test
cd apps/notify-wss && npm test
cd apps/viewer-worker && npm test
```

## Deployment

### Production Deployment

**Current Production Setup:**
- **Web App**: [streamix-ten.vercel.app](https://streamix-ten.vercel.app) (Vercel)
- **Workers**: AWS ECS Fargate (notify-worker, notify-wss, viewer-worker)
- **Database**: Neon PostgreSQL
- **Cache**: Redis Cloud
- **Storage**: AWS S3 + CloudFront CDN
- **Streaming**: LiveKit Cloud

**For Local Docker Deployment:**
1. **Set up production environment variables**
2. **Build and deploy with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Set up reverse proxy** (nginx/traefik)
4. **Configure SSL certificates**
5. **Set up monitoring and logging**

### Environment-Specific Configurations

- **Development**: Uses local services and hot reloading
- **Staging**: Mirrors production with test data
- **Production**: Optimized builds with production databases

### Production Considerations

1. **Environment Variables**: Use proper secrets management
2. **Monitoring**: Add logging and monitoring services
3. **Scaling**: Consider horizontal scaling for stateless services
4. **Backups**: Implement database backup strategy
5. **Security**: Use non-root users and security scanning

**Streamix** - Where creators go live and audiences connect in real-time.