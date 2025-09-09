# CloudFront WebSocket Setup Guide

This guide explains how to set up CloudFront to provide WSS (secure WebSocket) access to your WebSocket server without needing a domain and SSL certificate.

## Overview

CloudFront can be used as a proxy to provide secure WebSocket connections (WSS) to your WebSocket server running on HTTP. This eliminates the need for a custom domain and SSL certificates.

## CloudFront Configuration

### 1. Create CloudFront Distribution

1. Go to AWS CloudFront console
2. Create a new distribution
3. Set the origin to your WebSocket server (e.g., `http://your-ec2-ip:8080`)

### 2. Origin Configuration

```
Origin Domain: your-ec2-ip-address
Origin Path: (leave empty)
Origin Protocol Policy: HTTP Only
HTTP Port: 8080
HTTPS Port: 443
Origin Request Policy: CORS-S3Origin
Origin Response Timeout: 30
Origin Keep-Alive Timeout: 5
```

### 3. Cache Behavior

```
Path Pattern: Default (*)
Origin and Origin Groups: Your WebSocket server
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Cache Policy: CachingDisabled
Origin Request Policy: CORS-S3Origin
Response Headers Policy: CORS-with-preflight
```

### 4. WebSocket Support

For WebSocket support, you need to:

1. **Enable WebSocket**: In the cache behavior, set "Cache Policy" to "CachingDisabled"
2. **Set TTL to 0**: This ensures WebSocket connections are not cached
3. **Allow all HTTP methods**: WebSocket uses GET and POST methods

### 5. CORS Configuration

Create a custom response headers policy:

```json
{
  "Name": "WebSocket-CORS-Policy",
  "CorsConfig": {
    "AccessControlAllowCredentials": true,
    "AccessControlAllowHeaders": {
      "Items": ["*"]
    },
    "AccessControlAllowMethods": {
      "Items": ["GET", "POST", "OPTIONS"]
    },
    "AccessControlAllowOrigins": {
      "Items": ["https://your-frontend-domain.com"]
    },
    "AccessControlExposeHeaders": {
      "Items": ["*"]
    },
    "AccessControlMaxAgeSec": 86400,
    "OriginOverride": true
  }
}
```

## Environment Variables

### WebSocket Server (notify-wss)

```bash
# Server configuration
PORT=8080
HOST=0.0.0.0

# CORS - Add your CloudFront domain
CORS_ORIGIN=https://your-cloudfront-domain.cloudfront.net,https://your-frontend-domain.com

# CloudFront configuration
CLOUDFRONT_ENABLED=true
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# Other required variables
REDIS_URL=redis://your-redis-url
JWT_SECRET=your-jwt-secret
LOG_LEVEL=info
```

### Frontend (web app)

```bash
# Use CloudFront WSS URL
NEXT_PUBLIC_WSS_URL=https://your-cloudfront-domain.cloudfront.net

# Fallback to direct WS (for development)
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

## Testing the Setup

### 1. Test CloudFront Health Check

```bash
curl https://your-cloudfront-domain.cloudfront.net/ping
# Should return: pong
```

### 2. Test WebSocket Connection

```javascript
// Test in browser console
const socket = io('https://your-cloudfront-domain.cloudfront.net', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected via CloudFront WSS');
});

socket.on('error', (error) => {
  console.error('❌ Connection error:', error);
});
```

### 3. Test from Frontend

1. Set `NEXT_PUBLIC_WSS_URL=https://your-cloudfront-domain.cloudfront.net` in your `.env.local`
2. Restart your frontend
3. Check browser network tab for WebSocket connections
4. Verify notifications are received

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your CloudFront CORS policy includes your frontend domain
2. **Connection Timeouts**: Check that your WebSocket server is accessible from CloudFront
3. **Authentication Failures**: Ensure JWT tokens are being passed correctly
4. **WebSocket Upgrade Failures**: Verify CloudFront is not caching WebSocket requests

### Debug Steps

1. **Check CloudFront Logs**: Enable CloudFront access logs
2. **Test Direct Connection**: Try connecting directly to your server (bypass CloudFront)
3. **Check CORS Headers**: Verify CORS headers are being sent correctly
4. **Monitor WebSocket Server Logs**: Check for connection attempts and errors

### Health Check Endpoints

Your WebSocket server provides these endpoints for monitoring:

- `GET /health` - Server health and stats
- `GET /ping` - Simple ping/pong for CloudFront health checks

## Security Considerations

1. **JWT Authentication**: Always use JWT tokens for WebSocket authentication
2. **CORS Restrictions**: Limit CORS origins to your frontend domains only
3. **Rate Limiting**: Consider implementing rate limiting on your WebSocket server
4. **CloudFront Security**: Use CloudFront security features like WAF if needed

## Cost Optimization

1. **Caching Disabled**: WebSocket traffic is not cached, so costs are based on data transfer
2. **Origin Requests**: Each WebSocket connection counts as origin requests
3. **Data Transfer**: Monitor data transfer costs for real-time notifications

## Example CloudFront Distribution Settings

```
Distribution Settings:
- Price Class: Use All Edge Locations
- Alternate Domain Names: (leave empty)
- SSL Certificate: Default CloudFront Certificate
- Security Policy: TLSv1.2_2021
- Supported HTTP Versions: HTTP/2, HTTP/1.1, HTTP/1.0
- IPv6: Enabled
- Default Root Object: (leave empty)
- Custom Error Pages: (none)
```

This setup provides secure WebSocket connections without requiring a custom domain or SSL certificate management.
