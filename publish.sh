#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Define version file and read current version
VERSION_FILE=".version"
VERSION=$(cat $VERSION_FILE)

echo "Publishing Map App Docker Image (version $VERSION and latest)"

# Push both the versioned image and latest tag
docker push registry.jde.nz/mapapp:$VERSION
docker push registry.jde.nz/mapapp:latest

echo "Published Map App Docker Image version $VERSION and latest tag"
