#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Get version from package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

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

./build.sh

echo "Publishing Trail Map Viewer Docker Image (version ${VERSION} and latest)"

# Push both the versioned image and latest tag
docker push registry.jde.nz/mapapp:${VERSION}
docker push registry.jde.nz/mapapp:latest

echo "Published Trail Map Viewer Docker Image version ${VERSION} and latest tag"
