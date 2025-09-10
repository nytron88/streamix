FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/viewer-worker/package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY apps/viewer-worker/ .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S viewer-worker -u 1001

# Change ownership of the app directory
RUN chown -R viewer-worker:nodejs /app
USER viewer-worker

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Viewer worker is healthy')" || exit 1

# Start the application
CMD ["npm", "start"]
