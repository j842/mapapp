#!/bin/sh
set -e

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

# Ensure logs directory exists
mkdir -p /var/log/nginx

# Test direct connection to LINZ API
echo "Testing LINZ API connection directly from container..."
if which curl > /dev/null; then
  curl -s -I "https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/1/1/1.webp?api=$LINZ_API_KEY" || echo "LINZ API test failed"
else
  echo "curl not installed, skipping API test"
fi

# Start Nginx
echo "Starting Nginx..."
exec nginx -g 'daemon off;' 