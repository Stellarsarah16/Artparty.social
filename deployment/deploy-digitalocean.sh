#!/bin/bash

# StellarCollabApp DigitalOcean Deployment Script
# This script helps deploy the application with proper environment configuration

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

# Function to check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Requirements check passed ✓"
}

# Function to get user input for configuration
get_user_input() {
    print_status "Setting up deployment configuration..."
    
    # Get domain/IP
    read -p "Enter your domain name or DigitalOcean IP address: " DOMAIN
    if [ -z "$DOMAIN" ]; then
        print_error "Domain/IP is required!"
        exit 1
    fi
    
    # Get database password
    read -s -p "Enter database password: " DB_PASSWORD
    echo
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Database password is required!"
        exit 1
    fi
    
    # Get secret key
    read -s -p "Enter secret key for JWT (or press Enter to generate): " SECRET_KEY
    echo
    if [ -z "$SECRET_KEY" ]; then
        SECRET_KEY=$(openssl rand -hex 32)
        print_status "Generated secret key: $SECRET_KEY"
    fi
    
    # Get Redis password
    read -s -p "Enter Redis password (or press Enter to generate): " REDIS_PASSWORD
    echo
    if [ -z "$REDIS_PASSWORD" ]; then
        REDIS_PASSWORD=$(openssl rand -hex 16)
        print_status "Generated Redis password: $REDIS_PASSWORD"
    fi
    
    # Ask about HTTPS
    read -p "Will you use HTTPS? (y/N): " USE_HTTPS
    USE_HTTPS=${USE_HTTPS:-n}
}

# Function to create production environment file
create_env_file() {
    print_status "Creating production environment file..."
    
    # Set protocol based on HTTPS choice
    if [[ "$USE_HTTPS" =~ ^[Yy]$ ]]; then
        PROTOCOL="https"
        WS_PROTOCOL="wss"
    else
        PROTOCOL="http"
        WS_PROTOCOL="ws"
    fi
    
    # Create .env file
    cat > deployment/.env << EOF
# Production Environment Variables
# Generated on $(date)

# Database
DATABASE_URL=postgresql://stellarcollab:${DB_PASSWORD}@db:5432/stellarcollab_prod
DB_PASSWORD=${DB_PASSWORD}

# Security
SECRET_KEY=${SECRET_KEY}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=StellarCollabApp
APP_VERSION=1.0.0
DEBUG=false
ENVIRONMENT=production

# CORS Origins
CORS_ORIGINS=["${PROTOCOL}://${DOMAIN}", "${PROTOCOL}://www.${DOMAIN}"]

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Monitoring
LOG_LEVEL=INFO

# SSL/TLS
HTTPS_ONLY=${USE_HTTPS}
SECURE_COOKIES=${USE_HTTPS}

# Database Connection Pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
EOF
    
    print_status "Environment file created at deployment/.env"
}

# Function to update frontend configuration
update_frontend_config() {
    print_status "Frontend configuration is now dynamic and will adapt automatically!"
    print_status "Local development: Uses localhost:8000"
    print_status "Production: Uses ${PROTOCOL}://${DOMAIN}/api"
}

# Function to deploy the application
deploy_app() {
    print_status "Starting deployment..."
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose -f deployment/docker-compose.prod.yml down || true
    
    # Build and start containers
    print_status "Building and starting containers..."
    docker-compose -f deployment/docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if docker-compose -f deployment/docker-compose.prod.yml ps | grep -q "Up"; then
        print_status "Deployment successful! ✓"
        print_status "Application is running at: ${PROTOCOL}://${DOMAIN}"
        print_status "API documentation: ${PROTOCOL}://${DOMAIN}/docs"
    else
        print_error "Deployment failed! Check the logs with:"
        print_error "docker-compose -f deployment/docker-compose.prod.yml logs"
        exit 1
    fi
}

# Function to show useful commands
show_commands() {
    print_status "Useful commands:"
    echo "View logs: docker-compose -f deployment/docker-compose.prod.yml logs -f"
    echo "Stop app: docker-compose -f deployment/docker-compose.prod.yml down"
    echo "Restart app: docker-compose -f deployment/docker-compose.prod.yml restart"
    echo "Update app: git pull && docker-compose -f deployment/docker-compose.prod.yml up -d --build"
}

# Main deployment flow
main() {
    print_status "🚀 StellarCollabApp DigitalOcean Deployment"
    print_status "========================================="
    
    check_requirements
    get_user_input
    create_env_file
    update_frontend_config
    deploy_app
    show_commands
    
    print_status "🎉 Deployment completed successfully!"
}

# Run main function
main "$@" 