#!/bin/bash

# Exit on any error
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

# Get version from package.json
VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)

echo "Trail Map Viewer version: ${VERSION}" 