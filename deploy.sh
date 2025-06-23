#!/bin/bash
# deploy.sh - Script to build and deploy Docker image for Car Wars 6E
# Expected to run in a WSL environment with Docker Desktop installed

# Configuration
IMAGE_NAME="car-wars-6e-builder"
IMAGE_TAG="latest"
# REGISTRY_URL="YOUR_REGISTRY_URL" # Replace with your registry URL if you're using one
VM_SSH_CONNECTION="nerps.net" # Replace with your VM SSH connection details

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please ensure:"
    echo "1. Docker Desktop is installed and running"
    echo "2. WSL 2 integration is enabled in Docker Desktop settings"
    echo "3. You have restarted your WSL terminal after enabling integration"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running"
    echo "Please start Docker Desktop and ensure it's running properly"
    exit 1
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Tag the image (if using a registry)
# Uncomment if you're pushing to a registry
# docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Push to registry (if using one)
# Uncomment if you're pushing to a registry
# echo "Pushing image to registry..."
# docker push ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Save image to a tar file
echo "Saving image to tar file..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${IMAGE_NAME}.tar.gz

# Copy to VM (optional, only if not using registry) with progress
echo "Copying image to VM..."
scp -v ${IMAGE_NAME}.tar.gz ${VM_SSH_CONNECTION}:/tmp/

# SSH into VM and load the image (optional, only if not using registry)
echo "Loading image on VM..."
ssh ${VM_SSH_CONNECTION} "docker load < /tmp/${IMAGE_NAME}.tar.gz && rm /tmp/${IMAGE_NAME}.tar.gz"

echo "Cleaning up local files..."
rm ${IMAGE_NAME}.tar.gz

echo "Deployment prepared! Now login to Portainer and update your container."