#!/bin/bash

# deploy.sh - Script to build and deploy Docker image for Car Wars 6E
# Expected to run in a WSL environment with Docker Desktop installed

# Configuration
IMAGE_NAME="car-wars-6e-builder"
IMAGE_TAG="latest"
VM_SSH_CONNECTION="nerps.net"
REMOTE_APP_PATH="/srv/carwars-6e-builder"
LOCAL_CARDS_PATH="./public/uploads/cards"
LOCAL_STOCK_VEHICLES_PATH="./public/stock-vehicles"

# Function to increment version
increment_version() {
    local version_type=$1

    # Read current version from package.json
    current_version=$(grep -oP '"version": "\K[^"]+' package.json)

    if [ -z "$current_version" ]; then
        echo "Error: Could not read version from package.json"
        exit 1
    fi

    echo "Current version: $current_version"

    # Split version into major.minor.patch
    IFS='.' read -r major minor patch <<< "$current_version"

    # Increment based on type
    case $version_type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch)
            patch=$((patch + 1))
            ;;
        *)
            echo "Error: Invalid version type. Use major, minor, or patch"
            exit 1
            ;;
    esac

    new_version="${major}.${minor}.${patch}"
    echo "New version: $new_version"

    # Update package.json
    sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json

    # Update src/config/version.ts
    echo "export const APP_VERSION = '$new_version';" > src/config/version.ts

    echo "✓ Version updated to $new_version"
    echo "  - Updated package.json"
    echo "  - Updated src/config/version.ts"
}

# Function to refresh card assets on the server
refresh_cards() {
    echo "Refreshing card assets on server..."
    echo "Copying cards from ${LOCAL_CARDS_PATH} to ${VM_SSH_CONNECTION}:${REMOTE_APP_PATH}/public/uploads/cards"

    # Check if local cards path exists
    if [ ! -d "${LOCAL_CARDS_PATH}" ]; then
        echo "Error: Local cards directory not found at ${LOCAL_CARDS_PATH}"
        exit 1
    fi

    # Create the destination directory if it doesn't exist
    ssh ${VM_SSH_CONNECTION} "mkdir -p ${REMOTE_APP_PATH}/public/uploads/cards"

    # Copy all card files to the server
    scp -r ${LOCAL_CARDS_PATH}/* ${VM_SSH_CONNECTION}:${REMOTE_APP_PATH}/public/uploads/cards/

    # Set permissions to 644 (rw-r--r--) for all card files
    echo "Setting proper file permissions (644) for card files..."
    ssh ${VM_SSH_CONNECTION} "find ${REMOTE_APP_PATH}/public/uploads/cards -type f -exec chmod 644 {} \;"

    echo "Card assets refresh completed!"
}

# Function to refresh stock vehicles on the server
refresh_vehicles() {
    echo "Copying stock vehicles from ${LOCAL_STOCK_VEHICLES_PATH} to the server..."
    scp -r ${LOCAL_STOCK_VEHICLES_PATH}/* ${VM_SSH_CONNECTION}:${REMOTE_APP_PATH}/public/stock-vehicles/

    # Set permissions to 644 (rw-r--r--) for stock vehicle files
    echo "Setting proper file permissions (644) for stock vehicle files..."
    ssh ${VM_SSH_CONNECTION} "find ${REMOTE_APP_PATH}/public/stock-vehicles -type f -exec chmod 644 {} \;"

    echo "Stock vehicles refresh completed!"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --version-patch     Increment patch version (x.y.Z) and deploy"
    echo "  --version-minor     Increment minor version (x.Y.0) and deploy"
    echo "  --version-major     Increment major version (X.0.0) and deploy"
    echo "  --refresh           Refresh card and vehicle assets on the server without deploying"
    echo "  --refresh-cards     Refresh card assets on the server without deploying"
    echo "  --refresh-vehicles  Refresh stock vehicles on the server without deploying"
    echo "  --help              Show this help message"
    echo ""
    echo "Without options, the script performs a full build and deployment without version change."
}

# Parse command line arguments
VERSION_INCREMENT=""

if [ "$1" = "--version-patch" ]; then
    VERSION_INCREMENT="patch"
elif [ "$1" = "--version-minor" ]; then
    VERSION_INCREMENT="minor"
elif [ "$1" = "--version-major" ]; then
    VERSION_INCREMENT="major"
elif [ "$1" = "--refresh" ]; then
    refresh_cards
    refresh_vehicles
    exit 0
elif [ "$1" = "--refresh-cards" ]; then
    refresh_cards
    exit 0
elif [ "$1" = "--refresh-vehicles" ]; then
    refresh_vehicles
    exit 0
elif [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Increment version if requested
if [ -n "$VERSION_INCREMENT" ]; then
    increment_version $VERSION_INCREMENT
    echo ""
fi

# Check if Docker is available
if ! command -v docker &>/dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please ensure:"
    echo "1. Docker Desktop is installed and running"
    echo "2. WSL 2 integration is enabled in Docker Desktop settings"
    echo "3. You have restarted your WSL terminal after enabling integration"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &>/dev/null; then
    echo "Error: Docker daemon is not running"
    echo "Please start Docker Desktop and ensure it's running properly"
    exit 1
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Save image to a tar file
echo "Saving image to tar file..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip >${IMAGE_NAME}.tar.gz

# Copy to VM (optional, only if not using registry) with progress indicator
echo "Copying image to VM..."
scp -p ${IMAGE_NAME}.tar.gz ${VM_SSH_CONNECTION}:/tmp/

# SSH into VM and load the image (optional, only if not using registry)
echo "Loading image on VM..."
# ssh ${VM_SSH_CONNECTION} "docker load < /tmp/${IMAGE_NAME}.tar.gz && rm /tmp/${IMAGE_NAME}.tar.gz"
ssh ${VM_SSH_CONNECTION} "docker load < /tmp/${IMAGE_NAME}.tar.gz"

echo "Image size is $(du -h ${IMAGE_NAME}.tar.gz | cut -f1)"

echo "Cleaning up local files..."
rm -f ${IMAGE_NAME}.tar.gz

echo "Deployment prepared! Now login to Portainer and update your container."
