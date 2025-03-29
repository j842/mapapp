#!/bin/bash

source ./build.sh

echo "Publishing Map App Docker Image"

docker push registry.jde.nz/mapapp:latest

echo "Published Map App Docker Image"
