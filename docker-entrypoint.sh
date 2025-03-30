#!/bin/sh
set -e

# Get version from package.json
APP_VERSION=$(grep -o '"version": "[^"]*"' /app/package.json | cut -d'"' -f4)
BUILD_DATE=$(date +%Y-%m-%d)
echo "Application version: ${APP_VERSION} (${BUILD_DATE})"

# Determine the API key to use (default if not provided)
if [ -z "$LINZ_API_KEY" ]; then
  export LINZ_API_KEY="d01jrm3t2gzdycm5j8rh03e69fw"
  echo "WARNING: LINZ_API_KEY environment variable was not set. Using demo key for testing."
else
  echo "Using provided LINZ_API_KEY: $LINZ_API_KEY"
fi

# Replace the API key placeholder in script.js
echo "Updating script.js with the LINZ API key..."
sed -i "s/LINZ_API_KEY_PLACEHOLDER/$LINZ_API_KEY/g" /usr/share/nginx/html/script.js

# Replace version number in script.js
echo "Updating script.js with application version..."
sed -i "s/const APP_VERSION = 'v[0-9.]*';/const APP_VERSION = 'v${APP_VERSION}';/g" /usr/share/nginx/html/script.js

# Replace build date in script.js
echo "Updating script.js with build date..."
sed -i "s/const BUILD_DATE = new Date().toISOString().split('T')\[0\];/const BUILD_DATE = '${BUILD_DATE}';/g" /usr/share/nginx/html/script.js

# Ensure logs directory exists
mkdir -p /var/log/nginx

# Ensure thumbnails directory is accessible
echo "Ensuring thumbnails directory has correct permissions..."
mkdir -p /thumbnails/metadata
chown -R nginx:nginx /thumbnails
chmod 755 /thumbnails /thumbnails/metadata

# Create nginx cache directory
mkdir -p /var/cache/nginx/thumbnails
chown -R nginx:nginx /var/cache/nginx

# Test direct connection to LINZ API
echo "Testing LINZ API connection directly from container..."
if which curl > /dev/null; then
  curl -s -I "https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/1/1/1.webp?api=$LINZ_API_KEY" || echo "LINZ API test failed"
else
  echo "curl not installed, skipping API test"
fi

# Start thumbnail service in the background
echo "Starting thumbnail service..."
cd /app && node www/thumbnail-service.js &

# Wait a moment for the service to start
sleep 2

# Start Nginx in the foreground
echo "Starting Nginx..."
exec nginx -g 'daemon off;' 