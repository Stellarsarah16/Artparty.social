#!/bin/bash

# Production Deployment Script with Disk Space Management
# This script ensures adequate disk space before deployment

set -e

echo "=== Production Deployment with Space Check ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "Please run this script from the production deployment directory"
    exit 1
fi

# Function to check disk space
check_disk_space() {
    local required_space=2048  # 2GB in MB
    local available_space=$(df -m . | awk 'NR==2 {print $4}')
    
    print_status "Checking available disk space..."
    print_status "Available space: ${available_space}MB"
    print_status "Required space: ${required_space}MB"
    
    if [ "$available_space" -lt "$required_space" ]; then
        print_warning "Low disk space detected! Available: ${available_space}MB, Required: ${required_space}MB"
        return 1
    fi
    
    print_status "Disk space check passed ✓"
    return 0
}

# Function to clean up Docker resources
cleanup_docker() {
    print_status "Cleaning up Docker resources..."
    
    # Remove unused containers, networks, images, and volumes
    docker system prune -a --volumes -f || true
    
    # Remove dangling images
    docker image prune -f || true
    
    # Show Docker disk usage
    print_status "Docker disk usage:"
    docker system df
}

# Function to clean up system files
cleanup_system() {
    print_status "Cleaning up system files..."
    
    # Clear package cache
    sudo apt-get clean || true
    sudo apt-get autoremove -y || true
    
    # Clear log files (keep last 7 days)
    sudo journalctl --vacuum-time=7d || true
    
    # Clear temporary files
    sudo rm -rf /tmp/* || true
}

# Function to backup environment file
backup_env() {
    if [ -f ".env" ]; then
        local backup_name=".env.backup.$(date +%Y%m%d_%H%M%S)"
        print_status "Backing up environment file to ${backup_name}"
        cp .env "$backup_name"
    else
        print_warning "No .env file found to backup"
    fi
}

# Function to deploy
deploy() {
    print_status "Starting deployment..."
    
    # Pull latest changes
    print_status "Pulling latest changes from git..."
    git pull origin main
    
    # Build and deploy
    print_status "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Deployment completed successfully! ✓"
}

# Main deployment flow
main() {
    print_status "Starting production deployment process..."
    
    # Check disk space first
    if ! check_disk_space; then
        print_warning "Attempting to free up disk space..."
        cleanup_docker
        cleanup_system
        
        # Check again after cleanup
        if ! check_disk_space; then
            print_error "Insufficient disk space even after cleanup. Please free up more space manually."
            print_error "Consider:"
            print_error "  - Removing old Docker images: docker system prune -a"
            print_error "  - Cleaning logs: sudo journalctl --vacuum-time=1d"
            print_error "  - Removing old files: sudo find /var/log -name '*.log' -size +100M -delete"
            exit 1
        fi
    fi
    
    # Backup environment
    backup_env
    
    # Deploy
    deploy
    
    print_status "Deployment script completed successfully!"
}

# Run main function
main "$@" 