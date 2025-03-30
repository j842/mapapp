#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Get port number from argument or use default 8080
PORT=${1:-8080}

# Validate port number
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "Error: Port must be a number between 1 and 65535"
    exit 1
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "Error: data directory not found"
    exit 1
fi

# Check for at least one walk subfolder
WALK_COUNT=0
for d in data/*/; do
    if [ -d "$d" ] && [ -f "${d}walk_settings.json" ]; then
        WALK_COUNT=$((WALK_COUNT + 1))
        echo "Found walk: ${d}"
    fi
done

if [ $WALK_COUNT -eq 0 ]; then
    echo "Error: No valid walks found in data directory"
    echo "Each walk must be in a subdirectory of /data and contain a walk_settings.json file"
    echo "Please create at least one valid walk directory before running the container"
    echo "Example structure:"
    echo "  data/"
    echo "    ├── mywalk/"
    echo "    │   ├── walk_settings.json    # Required"
    echo "    │   ├── trail.gpx             # Optional"
    echo "    │   └── images/               # Directory for images"
    echo "    │       ├── image1.jpg"
    echo "    │       └── image2.jpg"
    exit 1
fi

echo "Starting mapapp container on port $PORT..."

# Check if the image exists or needs to be built
if ! docker image inspect mapapp >/dev/null 2>&1; then
    echo "Image not found. Building from Dockerfile..."
    docker build -t mapapp .
fi

# Check if the specified port is already in use
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "Error: Port $PORT is already in use. Please free up the port or specify a different port."
    exit 1
fi

# Stop and remove existing container if it exists
if docker container inspect mapapp >/dev/null 2>&1; then
    echo "Stopping and removing existing mapapp container..."
    docker stop mapapp >/dev/null 2>&1
    docker rm mapapp
fi

# Check for LINZ API key
if [ -z "$LINZ_API_KEY" ]; then
    echo "Warning: LINZ_API_KEY environment variable is not set"
    echo "Using the default demo key. For production use, please set your own key:"
    echo "export LINZ_API_KEY=your-key-here"
    echo "or"
    echo "LINZ_API_KEY=your-key-here ./run.sh"
    
    # Use a default demo key
    LINZ_API_KEY="d01jrm3t2gzdycm5j8rh03e69fw"
fi

echo "Using LINZ API key: $LINZ_API_KEY"

# Run the container with the data directory mounted and LINZ API key
docker run -d \
    -p $PORT:80 \
    -v "$(pwd)/data:/data" \
    -e LINZ_API_KEY="$LINZ_API_KEY" \
    --name mapapp \
    mapapp

echo "Container started successfully!"
echo "The web application is available at: http://localhost:$PORT"
echo "To stop the container, run: docker stop mapapp" 