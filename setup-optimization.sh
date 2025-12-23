#!/bin/bash

# Create necessary directories if they don't exist
mkdir -p public/uploads
mkdir -p logs

# Optimize Node.js settings for Render
export NODE_ENV=production
export UV_THREADPOOL_SIZE=1
export NODE_OPTIONS="--max-old-space-size=512"

# Add production optimizations to package.json if not already present
if ! grep -q "\"start:prod\":" package.json; then
  sed -i '' '/"scripts": {/a\
    "start:prod": "NODE_ENV=production node server.js",
' package.json
fi

# Create a .npmrc file for faster installations
echo "cache=./npm-cache
prefer-offline=true
progress=false" > .npmrc

# Set environment variable for cluster mode in production
echo "CLUSTER_MODE=false" >> .env.production

echo "✅ Optimization setup complete!"