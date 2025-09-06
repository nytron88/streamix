#!/bin/bash

echo "🚀 Setting up notify-worker..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the notify-worker directory"
    exit 1
fi

# Check if web app schema exists
if [ ! -f "../web/prisma/schema.prisma" ]; then
    echo "❌ Error: Web app Prisma schema not found at ../web/prisma/schema.prisma"
    echo "Make sure you're running this from apps/notify-worker and that the web app exists"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client from web app schema..."
npm run db:generate

echo "✅ Setup complete!"
echo ""
echo "💡 Next steps:"
echo "   • Copy .env.example to .env and configure your environment"
echo "   • Run 'npm run dev' to start the worker in development mode"
echo "   • Run 'npm run db:studio' to open Prisma Studio"
