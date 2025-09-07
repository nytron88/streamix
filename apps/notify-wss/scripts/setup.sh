#!/bin/bash

# Setup script for notify-wss
set -e

echo "🚀 Setting up Streamix WebSocket Notification Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "🔍 Type checking..."
npm run type-check

echo "🏗️  Building application..."
npm run build

echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Create a .env file with required environment variables"
echo "2. Start the development server: npm run dev"
echo "3. Or start the production server: npm start"
echo ""
echo "🔧 Environment variables needed:"
echo "- REDIS_URL"
echo "- JWT_SECRET"
echo "- PORT (optional, defaults to 8080)"
echo "- CORS_ORIGIN (optional, defaults to http://localhost:3000)"
echo "- LOG_LEVEL (optional, defaults to info)"
