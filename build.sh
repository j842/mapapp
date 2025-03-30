#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Define version file
VERSION_FILE=".version"

# Create version file if it doesn't exist
if [ ! -f $VERSION_FILE ]; then
  echo "1" > $VERSION_FILE
fi

# Read and increment version
VERSION=$(cat $VERSION_FILE)
VERSION=$((VERSION + 1))
echo $VERSION > $VERSION_FILE

echo "Building mapapp Docker image version $VERSION..."

# Build the Docker image with version and latest tags
docker build -t registry.jde.nz/mapapp:$VERSION -t registry.jde.nz/mapapp:latest -t mapapp .

echo "Build completed successfully with version $VERSION!"
echo "To run the container, use: ./run.sh" 