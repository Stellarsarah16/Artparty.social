#!/bin/bash

# Quick Fix Script for StellarCollabApp Deployment Issues
set -e

echo "🔧 StellarCollabApp Quick Fix Script"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the deployment directory
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found. Are you in the deployment directory?"
    exit 1
fi

# Step 1: Check Docker
log_info "Checking Docker status..."
if ! docker --version &> /dev/null; then
    log_error "Docker not found or not running!"
    exit 1
fi
log_success "Docker is available"

# Step 2: Check environment file
log_info "Checking environment configuration..."
if [ ! -f ".env.prod" ]; then
    log_warning "Creating .env.prod from template..."
    cp env.production.template .env.prod
    log_warning "Please edit .env.prod with your values:"
    log_warning "  - SECRET_KEY (generate a random 64-char string)"
    log_warning "  - DB_PASSWORD (secure database password)" 
    log_warning "  - REDIS_PASSWORD (secure redis password)"
    log_warning "  - CORS_ORIGINS (your domain URLs)"
    read -p "Press Enter after editing .env.prod..."
fi

# Step 3: Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Step 4: Clean up (optional)
read -p "Do you want to clean up old volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Cleaning up volumes (this will delete data)..."
    docker-compose -f docker-compose.prod.yml down -v
    docker system prune -f
fi

# Step 5: Start services
log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Step 6: Wait and check
log_info "Waiting 30 seconds for services to start..."
sleep 30

# Step 7: Check status
log_info "Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Step 8: Check ports
log_info "Checking open ports..."
if command -v netstat &> /dev/null; then
    netstat -tlnp | grep -E ':(80|443)' || log_warning "No web ports listening"
else
    log_warning "netstat not available, install with: sudo apt install net-tools"
fi

# Step 9: Test connectivity
log_info "Testing local connectivity..."
if command -v curl &> /dev/null; then
    if curl -f http://localhost/health &> /dev/null; then
        log_success "Health check passed!"
    else
        log_warning "Health check failed, checking logs..."
        docker-compose -f docker-compose.prod.yml logs --tail=10 frontend
        docker-compose -f docker-compose.prod.yml logs --tail=10 backend
    fi
else
    log_warning "curl not available, install with: sudo apt install curl"
fi

# Step 10: Show recent logs
log_info "Recent logs from all services:"
docker-compose -f docker-compose.prod.yml logs --tail=5

echo
log_success "Quick fix completed!"
log_info "If still having issues:"
log_info "  1. Check logs: docker-compose -f docker-compose.prod.yml logs [service-name]"
log_info "  2. Check .env.prod configuration"
log_info "  3. Verify your domain/IP is accessible"
log_info "  4. Check firewall settings (ports 80, 443)" 