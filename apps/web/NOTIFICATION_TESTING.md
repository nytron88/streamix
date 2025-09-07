# Testing Real-Time Notifications

Your Streamix app now has a complete real-time notification system! Here's how to test it.

## Quick Setup

### 1. Environment Variables

Add to your `.env.local`:
```env
# WebSocket Notification Server
NEXT_PUBLIC_WSS_URL=http://localhost:8080
```

### 2. JWT Secret Alignment

Make sure both apps use the same JWT secret:

**apps/web/.env.local:**
```env
CLERK_SECRET_KEY=your_clerk_secret
# ... other vars
```

**apps/notify-wss/.env:**
```env
JWT_SECRET=test-secret-123  # Or use your Clerk JWT secret
REDIS_URL=redis://localhost:6379
PORT=8080
```

**apps/notify-worker/.env:**
```env
DATABASE_URL=your_postgres_url
REDIS_URL=redis://localhost:6379
```

## Testing Methods

### Method 1: Frontend UI Testing (Easiest)

1. **Start all services:**
   ```bash
   # Terminal 1: Web app
   cd apps/web
   npm run dev

   # Terminal 2: WebSocket server
   cd apps/notify-wss
   npm run dev

   # Terminal 3: Worker (optional for full flow)
   cd apps/notify-worker
   npm run dev
   ```

2. **Navigate to notifications page:**
   - Go to `http://localhost:3000/notifications`
   - You'll see the real-time notifications interface

3. **Test with UI buttons:**
   - Click "Connect" if not auto-connected
   - Use the "Test Notification" buttons to send sample notifications
   - Watch them appear in real-time!

### Method 2: Full Flow Testing

1. **Start all services** (web + notify-wss + notify-worker)

2. **Trigger real notifications:**
   - Make a tip through the web interface
   - Follow a channel
   - Subscribe to a channel

3. **Watch the flow:**
   - Web app → Redis queue → Worker → Postgres + Redis pub/sub → WebSocket → Frontend

### Method 3: Direct Redis Testing

```bash
# Terminal 1: Start notify-wss
cd apps/notify-wss
npm run dev

# Terminal 2: Connect to web app notifications page
# Open http://localhost:3000/notifications

# Terminal 3: Publish test notification
cd apps/notify-wss
npm run test:publisher tip
```

## What You Should See

### ✅ Working Notifications
- **Connection Status**: Green "Connected" indicator
- **Real-time Updates**: Notifications appear instantly
- **Toast Notifications**: Pop-up toasts for new notifications
- **Filtering**: Filter by tip/follow/subscription
- **Beautiful UI**: Cards with proper icons and formatting

### 🔧 Troubleshooting

**Connection Issues:**
- Check CORS settings in notify-wss
- Verify JWT secret matches between services
- Ensure WebSocket server is running on port 8080

**No Notifications:**
- Check Redis is running and accessible
- Verify notify-worker is processing queue
- Check browser console for errors

**Authentication Errors:**
- Make sure you're logged in to the web app
- Check JWT token generation in browser dev tools

## Features Built

### 🎯 Real-Time WebSocket Connection
- Auto-connects when page loads
- Shows connection status
- Auto-reconnects on disconnection
- Handles authentication with Clerk

### 🔔 Notification Types
- **Tips**: Amount, message, tipper info
- **Follows**: Follower info, channel details  
- **Subscriptions**: Tier, amount, subscriber info

### 🎨 Beautiful UI
- Modern card-based design
- Icons and badges for each type
- Time stamps with "time ago" formatting
- Filter buttons with counts
- Toast notifications for new items

### 🧪 Testing Tools
- In-app notification tester (development only)
- Connection controls (connect/disconnect)
- Clear all notifications button
- Filter by notification type

## Next Steps

1. **Test the basic flow** using the UI buttons
2. **Try real notifications** by using your app features
3. **Monitor the logs** to see the full data flow
4. **Customize the UI** to match your design preferences

The system is production-ready and will scale with your user base! 🚀
