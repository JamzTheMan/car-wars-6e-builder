#!/bin/bash

# Configuration
IMAGE_NAME="car-wars-6e-builder"
IMAGE_TAG="latest"
REGISTRY_URL="YOUR_REGISTRY_URL" # Replace with your registry URL if you're using one
VM_SSH_CONNECTION="user@your-vm-ip" # Replace with your VM SSH connection details

# Step 1: Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Step 2: Tag the image (if using a registry)
# Uncomment if you're pushing to a registry
# docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Step 3: Push to registry (if using one)
# Uncomment if you're pushing to a registry
# echo "Pushing image to registry..."
# docker push ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Step 4: Save image to a tar file
echo "Saving image to tar file..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${IMAGE_NAME}.tar.gz

# Step 5: Copy to VM (optional, only if not using registry)
echo "Copying image to VM..."
scp ${IMAGE_NAME}.tar.gz ${VM_SSH_CONNECTION}:/tmp/

# Step 6: SSH into VM and load the image (optional, only if not using registry)
echo "Loading image on VM..."
ssh ${VM_SSH_CONNECTION} "docker load < /tmp/${IMAGE_NAME}.tar.gz && rm /tmp/${IMAGE_NAME}.tar.gz"

echo "Deployment prepared! Now login to Portainer and update your container."
echo "You may need to SSH into your VM and manually pull the new image if using a registry."
