#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Read current version from package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo "Current version: ${CURRENT_VERSION}"

# Build the Docker image
echo "Building Trail Map Viewer v${CURRENT_VERSION}..."
docker build --cache-from mapapp:latest -t registry.jde.nz/mapapp:${CURRENT_VERSION} -t registry.jde.nz/mapapp:latest -t mapapp:latest .

echo "Build completed successfully!"
echo "To run the container, use: ./run.sh" 