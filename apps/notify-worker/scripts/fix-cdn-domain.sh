#!/bin/bash

# Fix CDN domain for notification enrichment
# This script helps set the CLOUDFRONT_DOMAIN environment variable

echo "🔧 Fixing CDN domain for notification enrichment..."

# Check if CLOUDFRONT_DOMAIN is set
if [ -z "$CLOUDFRONT_DOMAIN" ]; then
    echo "❌ CLOUDFRONT_DOMAIN environment variable is not set!"
    echo ""
    echo "To fix this, you need to set the CLOUDFRONT_DOMAIN environment variable."
    echo ""
    echo "For production:"
    echo "  export CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net"
    echo ""
    echo "For local development:"
    echo "  export CLOUDFRONT_DOMAIN=localhost:3000"
    echo ""
    echo "Or add it to your .env file:"
    echo "  echo 'CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net' >> .env"
    echo ""
    echo "After setting the variable, restart your notify-worker service."
    exit 1
else
    echo "✅ CLOUDFRONT_DOMAIN is set to: $CLOUDFRONT_DOMAIN"
fi

# Test the configuration
echo ""
echo "🧪 Testing notification storage configuration..."

node -e "
const { config } = require('./dist/config');
console.log('CDN Domain:', config.cdn.domain);
if (!config.cdn.domain || config.cdn.domain === 'your-cdn-domain.com') {
    console.log('❌ CDN domain is not properly configured');
    process.exit(1);
} else {
    console.log('✅ CDN domain is properly configured');
}
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Configuration looks good! Your notifications should now show proper details."
    echo ""
    echo "To verify, run:"
    echo "  node scripts/debug-notification-payload.js"
else
    echo ""
    echo "❌ Configuration test failed. Please check your environment variables."
    exit 1
fi
