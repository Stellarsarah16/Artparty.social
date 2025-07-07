#!/bin/bash

# StellarCollabApp GitHub Update Script
# Run this script on your DigitalOcean server to update from GitHub

set -e

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

# Function to backup current state
backup_current_state() {
    print_status "Creating backup of current state..."
    
    # Create backup directory with timestamp
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup environment file
    if [ -f "deployment/.env" ]; then
        cp deployment/.env "$BACKUP_DIR/"
        print_status "Environment file backed up to $BACKUP_DIR/"
    fi
    
    # Backup database (optional)
    if docker-compose -f deployment/docker-compose.prod.yml ps | grep -q "db"; then
        print_status "Database is running, consider backing up data if needed"
    fi
}

# Function to pull latest changes
pull_changes() {
    print_status "Pulling latest changes from GitHub..."
    
    # Stash any local changes
    git stash push -m "Auto-stash before update $(date)"
    
    # Pull latest changes
    git pull origin main
    
    print_status "Latest changes pulled successfully ✓"
}

# Function to update the application
update_app() {
    print_status "Updating application..."
    
    # Stop current containers
    print_status "Stopping current containers..."
    docker-compose -f deployment/docker-compose.prod.yml down
    
    # Remove old images to force rebuild
    print_status "Removing old images..."
    docker-compose -f deployment/docker-compose.prod.yml down --rmi all || true
    
    # Build and start updated containers
    print_status "Building and starting updated containers..."
    docker-compose -f deployment/docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if docker-compose -f deployment/docker-compose.prod.yml ps | grep -q "Up"; then
        print_status "Update successful! ✓"
    else
        print_error "Update failed! Check the logs with:"
        print_error "docker-compose -f deployment/docker-compose.prod.yml logs"
        exit 1
    fi
}

# Function to clean up old Docker resources
cleanup_docker() {
    print_status "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    print_status "Docker cleanup completed ✓"
}

# Function to show status
show_status() {
    print_status "Application Status:"
    docker-compose -f deployment/docker-compose.prod.yml ps
    
    print_status "Application logs (last 20 lines):"
    docker-compose -f deployment/docker-compose.prod.yml logs --tail=20
}

# Main update flow
main() {
    print_status "🔄 StellarCollabApp GitHub Update"
    print_status "================================="
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Please run this script from the StellarCollabApp root directory"
        exit 1
    fi
    
    # Check if deployment environment exists
    if [ ! -f "deployment/.env" ]; then
        print_error "Production environment file not found. Please run deployment first."
        exit 1
    fi
    
    backup_current_state
    pull_changes
    update_app
    cleanup_docker
    show_status
    
    print_status "🎉 Update completed successfully!"
    print_status "Application should be running with the latest changes."
}

# Run main function
main "$@" 