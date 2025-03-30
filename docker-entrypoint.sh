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

# Replace version number in both script.js and main.js
echo "Updating JavaScript files with application version..."
sed -i "s/const APP_VERSION = 'v[0-9.]*';/const APP_VERSION = 'v${APP_VERSION}';/g" /usr/share/nginx/html/script.js
sed -i "s/const APP_VERSION = 'v[0-9.]*';/const APP_VERSION = 'v${APP_VERSION}';/g" /usr/share/nginx/html/main.js

# Replace build date in both script.js and main.js
echo "Updating JavaScript files with build date..."
sed -i "s/const BUILD_DATE = new Date().toISOString().split('T')\[0\];/const BUILD_DATE = '${BUILD_DATE}';/g" /usr/share/nginx/html/script.js
sed -i "s/const BUILD_DATE = new Date().toISOString().split('T')\[0\];/const BUILD_DATE = '${BUILD_DATE}';/g" /usr/share/nginx/html/main.js

# Ensure logs directory exists
mkdir -p /var/log/nginx

# Ensure the data directory is accessible
echo "Checking data directory structure..."
# Verify data directory exists and has at least one walk
if [ ! -d "/data" ] || [ -z "$(ls -A /data 2>/dev/null)" ]; then
  echo "Warning: Data directory is empty. Creating example walk directory structure..."
  mkdir -p /data/example/images
  
  # Create a basic walk_settings.json if it doesn't exist
  if [ ! -f "/data/example/walk_settings.json" ]; then
    echo '{
      "title": "Example Walk",
      "description": "This is an example walk. Add your own walks by creating directories in the data folder.",
      "trailPath": [[51.505, -0.09], [51.51, -0.1], [51.52, -0.12]],
      "images": []
    }' > /data/example/walk_settings.json
    echo "Created example walk in /data/example/"
  fi
fi

# Verify the data symlink exists in the app directory
if [ ! -L "/app/data" ]; then
  echo "Creating symbolic link for data directory..."
  ln -sf /data /app/data
fi

# Ensure data directory has correct permissions
chown -R nginx:nginx /data
chmod -R 755 /data

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

# Start the Node.js server in the background
echo "Starting Node.js server..."
cd /app && node server.js &
NODE_PID=$!

# Wait for Node.js server to start
echo "Waiting for Node.js server to start..."
ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  if curl -s http://localhost:3000/api/walks > /dev/null 2>&1; then
    echo "Node.js server successfully started"
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "Waiting for Node.js server (attempt $ATTEMPTS/$MAX_ATTEMPTS)..."
  sleep 1
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
  echo "Warning: Could not confirm Node.js server start, but continuing anyway..."
fi

# Start Nginx in the foreground
echo "Starting Nginx..."
exec nginx -g 'daemon off;' 