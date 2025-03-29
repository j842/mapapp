#!/bin/sh
set -e

# Ensure logs directory exists
mkdir -p /var/log/nginx

# Test direct connection to LINZ API
echo "Testing LINZ API connection directly from container..."
if which curl > /dev/null; then
  curl -s -I "https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/1/1/1.webp?api=d01jrm3t2gzdycm5j8rh03e69fw" || echo "LINZ API test failed"
else
  echo "curl not installed, skipping API test"
fi

# Start Nginx
echo "Starting Nginx..."
exec nginx -g 'daemon off;' 