#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Read current version from package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
echo "Current version: ${CURRENT_VERSION}"

# Split version into components
IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_VERSION}"

# Increment patch version
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
echo "Incrementing to version: ${NEW_VERSION}"

# Update version in package.json
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires an extension with -i
  sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json
else
  # Linux/Windows doesn't
  sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json
fi

# Build the Docker image
echo "Building Trail Map Viewer v${NEW_VERSION}..."
docker build -t registry.jde.nz/mapapp:${NEW_VERSION} -t registry.jde.nz/mapapp:latest -t mapapp .

echo "Build completed successfully!"
echo "To run the container, use: ./run.sh" 