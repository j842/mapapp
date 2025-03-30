#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Get version from package.json
VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

echo "Publishing Trail Map Viewer Docker Image (version ${VERSION} and latest)"

# Push both the versioned image and latest tag
docker push registry.jde.nz/mapapp:${VERSION}
docker push registry.jde.nz/mapapp:latest

echo "Published Trail Map Viewer Docker Image version ${VERSION} and latest tag"
