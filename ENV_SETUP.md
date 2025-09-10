# Environment Variables Setup

## Current Status

The Docker setup now supports `.env` files! I've updated the `docker-compose.yml` to use environment variable substitution with fallback defaults.

## How It Works

The Docker Compose configuration now uses this pattern:
```yaml
environment:
  - NODE_ENV=${NODE_ENV:-production}
  - DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/streamix}
```

This means:
- If a `.env` file exists with `NODE_ENV=development`, it will use that value
- If no `.env` file exists or the variable isn't defined, it will use the default value (`production`)

## Creating Your .env File

Create a `.env` file in the project root with your configuration:

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

# Clerk Authentication (add your actual keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Configuration (add your actual keys)
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

## Environment Variable Priority

1. **Environment variables from .env file** (highest priority)
2. **Default values in docker-compose.yml** (fallback)
3. **System environment variables** (if set in your shell)

## Usage

1. Create your `.env` file with the variables you want to override
2. Run `docker-compose up` as usual
3. Docker Compose will automatically pick up the `.env` file

## Security Note

- Never commit your `.env` file to version control
- Add `.env` to your `.gitignore` file
- Use `.env.example` as a template for other developers
