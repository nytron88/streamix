# ---- Build stage ----
FROM node:20-alpine AS builder

# Prisma on Alpine needs these
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Generate Prisma client (needed at build/runtime)
COPY prisma ./prisma
RUN npx prisma generate

# Build Next.js
COPY . .
RUN npm run build


# ---- Runtime stage ----
FROM node:20-alpine AS runner

# Prisma on Alpine needs these too
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production deps (keeps image small)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# App files needed at runtime
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# (Optional) If you read prisma files at runtime, keep this:
# COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
