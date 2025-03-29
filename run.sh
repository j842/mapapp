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

echo "Starting mapapp container on port $PORT..."

# Check if the image exists
if ! docker image inspect mapapp >/dev/null 2>&1; then
    echo "Error: mapapp image not found. Please run ./build.sh first."
    exit 1
fi

# Check if the specified port is already in use
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "Error: Port $PORT is already in use. Please free up the port or specify a different port."
    exit 1
fi

# Run the container
docker run -d -p $PORT:80 --name mapapp mapapp

echo "Container started successfully!"
echo "The web application is available at: http://localhost:$PORT"
echo "To stop the container, run: docker stop mapapp" 