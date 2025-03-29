#!/bin/sh

# Check for required environment variables
if [ -z "$LINZ_API_KEY" ]; then
    echo "Error: LINZ_API_KEY environment variable is not set"
    echo "Please set it when running the container, e.g.:"
    echo "docker run -e LINZ_API_KEY=your-key-here ..."
    exit 1
fi

# Substitute environment variables in index.html
envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp
mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html

# Start nginx in foreground mode
exec nginx -g "daemon off;" 