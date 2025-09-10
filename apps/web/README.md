# Streamix Web App

The main Next.js frontend application for the Streamix live streaming platform.

## Features

- **Live Streaming Interface**: Watch and interact with live streams
- **Real-time Chat**: Interactive chat with moderation tools
- **User Authentication**: Secure login/signup with Clerk
- **Channel Management**: Create and manage streaming channels
- **VOD Player**: Watch recorded streams and videos
- **Notifications**: Real-time notifications for follows, tips, and subscriptions
- **Search & Discovery**: Find streams, channels, and content
- **Monetization**: Tipping and subscription system integration

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: Clerk
- **Payments**: Stripe
- **Real-time**: WebSocket connections
- **Storage**: AWS S3
- **Streaming**: LiveKit integration

## Project Structure

```
apps/web/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (app)/          # Main application pages
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   ├── stream/        # Streaming components
│   │   ├── notifications/ # Notification components
│   │   └── dashboard/     # Dashboard components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   │   ├── prisma/        # Database client
│   │   ├── redis/         # Redis client
│   │   ├── stripe/        # Stripe integration
│   │   └── services/      # Business logic services
│   ├── schemas/           # Zod validation schemas
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── Dockerfile            # Docker configuration
└── package.json          # Dependencies and scripts
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
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to http://localhost:3000

## Configuration

### Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/streamix

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:8080

# LiveKit
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_WS_URL=wss://your-domain.com
```

### Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **User**: User accounts and profiles
- **Channel**: Streaming channels
- **Stream**: Live stream information
- **Message**: Chat messages
- **Follow**: User follows
- **Subscription**: Paid subscriptions
- **Tip**: User tips
- **Vod**: Video-on-demand content
- **Notification**: Real-time notifications

## Key Features

### Authentication & User Management
- Secure authentication with Clerk
- User profiles and channel creation
- Role-based access control

### Live Streaming
- LiveKit integration for streaming
- Stream key management
- Live chat integration
- Stream settings and moderation

### Real-time Features
- WebSocket notifications
- Live chat with moderation
- Real-time follower updates
- Instant tip notifications

### Monetization
- Stripe payment integration
- Tipping system
- Subscription management
- Earnings tracking

### Content Management
- VOD upload and management
- S3 storage integration
- Thumbnail generation
- Content discovery

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Build with Docker
docker build -t streamix-web .
```

## API Routes

The application includes comprehensive API routes:

- **Authentication**: `/api/auth/*`
- **Channels**: `/api/channel/*`
- **Streams**: `/api/stream/*`
- **Chat**: `/api/chat/*`
- **Payments**: `/api/stripe/*`
- **Notifications**: `/api/notifications/*`
- **Search**: `/api/search/*`
- **VODs**: `/api/vods/*`

## Security

- **Authentication**: Clerk-based authentication
- **Authorization**: Role-based access control
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API rate limiting
- **Secure Headers**: Security headers configuration

## Performance

- **Server-Side Rendering**: Next.js SSR for better SEO
- **Static Generation**: Pre-built pages where possible
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic code splitting
- **Caching**: Redis caching for database queries
- **CDN**: AWS CloudFront integration

## Debugging

### Development Tools
- **Next.js DevTools**: Built-in development tools
- **Prisma Studio**: Database management UI
- **React DevTools**: Component debugging
- **Network Tab**: API request debugging

### Common Issues
1. **Database Connection**: Check DATABASE_URL
2. **Redis Connection**: Verify REDIS_URL
3. **Authentication**: Ensure Clerk keys are correct
4. **Stripe**: Verify webhook endpoints
5. **AWS**: Check S3 bucket permissions

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [LiveKit Documentation](https://docs.livekit.io)

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.
