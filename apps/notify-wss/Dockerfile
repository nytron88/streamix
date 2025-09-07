# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY apps/notify-wss/package.json apps/notify-wss/package-lock.json ./
RUN npm ci --only=production --no-audit --no-fund

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy notify-wss source
COPY apps/notify-wss .

# Build the application
RUN npm run build

# Runtime stage
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 notifyapp

# Install production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R notifyapp:nodejs /app
USER notifyapp

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
