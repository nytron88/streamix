# Testing Guide for notify-wss

This guide covers how to test the WebSocket notification server in different scenarios.

## Prerequisites

1. **Redis running** (local or remote)
2. **Environment variables** set up in `.env`
3. **Dependencies installed** (`npm install`)

## Quick Test Setup

### 1. Create .env file

```bash
# Copy this to .env in apps/notify-wss/
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-123
PORT=8080
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### 2. Install test dependencies

```bash
npm install
```

## Testing Methods

### Method 1: Health Check Test (Simplest)

Test if the server is running and responding:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Test health endpoint
npm run test:health
```

Expected output:
```
🏥 Testing health check endpoint...
Status: 200
✅ Health check passed!
Response: {
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "connectedClients": 0,
  "totalSockets": 0,
  "rooms": []
}
```

### Method 2: WebSocket Client Test

Test WebSocket connections and authentication:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Connect a test client
npm run test:client
```

Expected output:
```
🧪 Testing WebSocket client connection...
🔄 Connecting to WebSocket server...
✅ Connected to WebSocket server
Socket ID: abc123
📨 Welcome message: Welcome Test User 1! Connected to notifications.
📡 Testing room subscriptions...
🔔 Subscribed to user notifications
📺 Subscribed to channel notifications
🌍 Subscribed to global notifications
```

### Method 3: Redis Publisher Test

Test Redis pub/sub integration by publishing notifications:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Connect a client
npm run test:client

# Terminal 3: Publish test notifications
npm run test:publisher
```

The client should receive notifications in real-time!

### Method 4: Full Integration Test (Recommended)

Automated test that combines everything:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run integration test
npm run test:integration
```

This will:
1. Connect multiple test clients
2. Publish notifications to Redis
3. Verify clients receive notifications
4. Show detailed results

## Manual Testing Scenarios

### Scenario 1: Authentication Test

Test different authentication scenarios:

```bash
# Generate test tokens
npm run generate:token

# Use tokens in test client (modify scripts/test-client.js)
# Try invalid tokens, expired tokens, etc.
```

### Scenario 2: Multiple Clients

Test with multiple clients:

```bash
# Terminal 1: Server
npm run dev

# Terminal 2-4: Multiple clients
WSS_URL=http://localhost:8080 npm run test:client
WSS_URL=http://localhost:8080 npm run test:client
WSS_URL=http://localhost:8080 npm run test:client

# Terminal 5: Publisher
npm run test:publisher
```

### Scenario 3: Specific Notification Types

Test individual notification types:

```bash
# Publish only tip notifications
npm run test:publisher tip

# Publish only follow notifications
npm run test:publisher follow

# Publish only subscription notifications
npm run test:publisher subscription
```

## Testing with notify-worker

To test the complete flow (web app → notify-worker → notify-wss):

### 1. Start all services

```bash
# Terminal 1: Start notify-wss
cd apps/notify-wss
npm run dev

# Terminal 2: Start notify-worker
cd apps/notify-worker
npm run dev

# Terminal 3: Start web app
cd apps/web
npm run dev
```

### 2. Connect WebSocket client

```bash
# Terminal 4: Connect client
cd apps/notify-wss
npm run test:client
```

### 3. Trigger notifications from web app

- Make a tip through the web interface
- Follow a channel
- Subscribe to a channel

The WebSocket client should receive real-time notifications!

## Debugging Tips

### Server not starting?

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Check port conflicts:
   ```bash
   lsof -i :8080
   ```

3. Check environment variables:
   ```bash
   cat .env
   ```

### Client can't connect?

1. Check JWT secret matches
2. Check CORS origin settings
3. Check token format with:
   ```bash
   npm run generate:token
   ```

### No notifications received?

1. Check Redis pub/sub channels:
   ```bash
   redis-cli monitor
   ```

2. Check server logs for subscription confirmations
3. Verify client is in correct rooms

### Redis connection issues?

1. Check Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis URL format
3. Check network/firewall settings

## Load Testing

For performance testing:

```bash
# Install artillery
npm install -g artillery

# Create artillery config (artillery.yml)
# Run load test
artillery run artillery.yml
```

Example artillery config:
```yaml
config:
  target: 'ws://localhost:8080'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "WebSocket connections"
    engine: ws
    beforeScenario: "setJWT"
    weight: 100
```

## Monitoring During Tests

### 1. Server logs
Set `LOG_LEVEL=debug` to see detailed logs

### 2. Redis monitoring
```bash
redis-cli monitor
```

### 3. System resources
```bash
htop
```

### 4. Network connections
```bash
ss -tuln | grep 8080
```

## Expected Behavior

### ✅ Successful Test Results

1. **Health check returns 200**
2. **Clients connect with valid JWT**
3. **Clients join appropriate rooms**
4. **Redis messages trigger WebSocket broadcasts**
5. **Graceful disconnection on SIGINT**

### ❌ Common Issues

1. **Connection rejected** - Usually JWT/auth issues
2. **No notifications** - Usually Redis pub/sub issues
3. **Server crashes** - Usually unhandled errors or missing deps
4. **Memory leaks** - Usually in production with many connections

## Continuous Testing

For CI/CD, create automated test script:

```bash
#!/bin/bash
# test.sh
set -e

echo "Starting integration test..."

# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run tests
npm run test:health
npm run test:integration

# Cleanup
kill $SERVER_PID

echo "All tests passed!"
```
