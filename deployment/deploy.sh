#!/bin/bash

# StellarCollabApp Production Deployment Script

set -e

echo "🚀 Starting StellarCollabApp Production Deployment..."

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file $ENV_FILE not found!"
    log_info "Please copy env.production.template to $ENV_FILE and configure it"
    exit 1
fi

# Load environment variables
log_info "Loading environment variables..."
source $ENV_FILE

# Validate required environment variables
required_vars=("DB_PASSWORD" "SECRET_KEY" "CORS_ORIGINS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set!"
        exit 1
    fi
done

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p ssl uploads logs

# Set proper permissions
chmod 755 ssl uploads logs

# Pull latest images
log_info "Pulling latest Docker images..."
docker-compose -f $DOCKER_COMPOSE_FILE pull

# Build application images
log_info "Building application images..."
docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f $DOCKER_COMPOSE_FILE down

# Start services
log_info "Starting services..."
docker-compose -f $DOCKER_COMPOSE_FILE up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Check service health
services=("db" "redis" "backend")
for service in "${services[@]}"; do
    log_info "Checking $service health..."
    if docker-compose -f $DOCKER_COMPOSE_FILE ps $service | grep -q "healthy\|Up"; then
        log_success "$service is running"
    else
        log_error "$service failed to start properly"
        docker-compose -f $DOCKER_COMPOSE_FILE logs $service
        exit 1
    fi
done

# Run database migrations
log_info "Running database migrations..."
docker-compose -f $DOCKER_COMPOSE_FILE exec -T backend python init_db.py

# Show running containers
log_info "Deployment status:"
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Show logs
log_info "Recent logs:"
docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=20

log_success "🎉 StellarCollabApp deployed successfully!"
log_info "Application is available at:"
log_info "  - Frontend: https://localhost"
log_info "  - API: https://localhost/api"
log_info "  - Health Check: https://localhost/health"

log_warning "Don't forget to:"
log_warning "  - Configure SSL certificates in the ssl/ directory"
log_warning "  - Set up proper DNS records"
log_warning "  - Configure monitoring and backups"
log_warning "  - Review security settings" 