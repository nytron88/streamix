# Streamix

A modern live streaming platform built with Next.js, featuring real-time chat, notifications, and monetization tools.

## Features

- **Live Streaming**: Go live instantly with powerful streaming tools
- **Real-time Chat**: Interactive chat with moderation tools
- **Notifications**: Real-time WebSocket notifications for follows, tips, and subscriptions
- **Monetization**: Built-in tipping and subscription system with Stripe
- **VOD Support**: Video-on-demand with S3 storage
- **User Management**: Complete user profiles and channel management
- **Search & Discovery**: Find streams and content easily

## Architecture

This is a monorepo containing multiple services:

- **`apps/web`** - Next.js frontend application
- **`apps/notify-worker`** - Background notification processing service
- **`apps/notify-wss`** - WebSocket server for real-time notifications

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Prisma ORM, PostgreSQL
- **Real-time**: WebSockets, Redis
- **Storage**: AWS S3, PostgreSQL
- **Payments**: Stripe
- **Streaming**: LiveKit
- **Authentication**: Clerk
- **Deployment**: Docker, Docker Compose

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
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web App: http://localhost:3000
   - WebSocket Server: http://localhost:8080
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
   ```

## Project Structure

```
streamix/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── notify-worker/       # Background notification service
│   └── notify-wss/          # WebSocket notification server
├── docker-compose.yml       # Docker orchestration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Configuration

### Environment Variables

The Docker setup supports `.env` files with environment variable substitution and fallback defaults. Create a `.env` file in the root directory with your configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/streamix

# Redis Configuration
REDIS_URL=redis://redis:6379

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=http://localhost:8080
PORT=8080

# CloudFront Configuration (for production)
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# Prisma Configuration
PRISMA_CLI_BINARY_TARGETS=linux-arm64-openssl-3.0.x

# Node Environment
NODE_ENV=production

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# AWS Configuration (for S3 and CloudFront)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# LiveKit Configuration (for streaming)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-livekit-domain.com
```

**Environment Variable Priority:**
1. Environment variables from .env file (highest priority)
2. Default values in docker-compose.yml (fallback)
3. System environment variables (if set in your shell)

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
- **notify-wss**: WebSocket server (port 8080)
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

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Access service shell
docker-compose exec web sh
docker-compose exec notify-worker sh
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

## Testing

```bash
# Run all tests
npm test

# Run specific service tests
cd apps/web && npm test
cd apps/notify-worker && npm test
cd apps/notify-wss && npm test
```

## Deployment

### Production Deployment

1. **Set up production environment variables**
2. **Build and deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
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
2. **SSL/TLS**: Configure reverse proxy (nginx/traefik)
3. **Monitoring**: Add logging and monitoring services
4. **Scaling**: Consider horizontal scaling for stateless services
5. **Backups**: Implement database backup strategy
6. **Security**: Use non-root users and security scanning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation in each app directory

## Recent Updates

- Complete Docker containerization
- Real-time notification system
- Stripe payment integration
- AWS S3 storage integration
- LiveKit streaming integration
- Comprehensive documentation

---

**Streamix** - Where creators go live and audiences connect in real-time.