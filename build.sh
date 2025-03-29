#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "Building mapapp Docker image..."

# Build the Docker image
docker build -t registry.jde.nz/mapapp:latest -t mapapp .

echo "Build completed successfully!"
echo "To run the container, use: ./run.sh" 