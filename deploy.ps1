# Configuration
$IMAGE_NAME = "car-wars-6e-builder"
$IMAGE_TAG = "latest"
# $REGISTRY_URL = "YOUR_REGISTRY_URL" # Replace with your registry URL if you're using one
$VM_SSH_CONNECTION = "nerps.net" # Replace with your VM SSH connection details

# Step 1: Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Green
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Step 2: Tag the image (if using a registry)
# Uncomment if you're pushing to a registry
# docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Step 3: Push to registry (if using one)
# Uncomment if you're pushing to a registry
# Write-Host "Pushing image to registry..." -ForegroundColor Green
# docker push ${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}

# Step 4: Save image to a tar file
Write-Host "Saving image to tar file..." -ForegroundColor Green
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${IMAGE_NAME}.tar.gz

# Step 5: Copy to VM (optional, only if not using registry)
Write-Host "Copying image to VM..." -ForegroundColor Green
# You'll need to have ssh installed on Windows or use another method to copy the file
# Example using scp command (if you have it installed via Git Bash or WSL)
Process.Start("scp", "${IMAGE_NAME}.tar.gz ${VM_SSH_CONNECTION}:/tmp/")

# Step 6: SSH into VM and load the image (optional, only if not using registry)
Write-Host "Loading image on VM..." -ForegroundColor Green
# You'll need to have ssh installed on Windows
# Example using ssh command (if you have it installed via Git Bash or WSL)
# Process.Start("ssh", "${VM_SSH_CONNECTION} ""docker load < /tmp/${IMAGE_NAME}.tar.gz && rm /tmp/${IMAGE_NAME}.tar.gz""")

Write-Host "Deployment prepared! Now login to Portainer and update your container." -ForegroundColor Green
Write-Host "You may need to SSH into your VM and manually pull the new image if using a registry." -ForegroundColor Green
