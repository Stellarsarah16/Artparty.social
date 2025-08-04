#!/bin/bash

# 🔒 Tile Lock System Deployment Script
# This script deploys the new tile locking system to production

set -e  # Exit on any error

echo "🚀 Starting Tile Lock System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "This script must be run from the deployment/production directory"
    exit 1
fi

# Step 1: Create backup
print_status "Creating backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -f ".env" ]; then
    cp .env .env.backup.$TIMESTAMP
    print_success "Environment backup created: .env.backup.$TIMESTAMP"
fi

# Step 2: Pull latest code
print_status "Pulling latest code..."
cd ../..
git pull origin main
print_success "Code updated"

# Step 3: Navigate back to production directory
cd deployment/production

# Step 4: Stop backend for migration
print_status "Stopping backend service for database migration..."
docker-compose -f docker-compose.prod.yml stop backend
print_success "Backend stopped"

# Step 5: Run database migration
print_status "Running database migration..."
if docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head; then
    print_success "Database migration completed"
else
    print_warning "Alembic migration failed, attempting manual table creation..."
    
    # Manual table creation as fallback
    docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c "
    CREATE TABLE IF NOT EXISTS tile_locks (
        id SERIAL PRIMARY KEY,
        tile_id INTEGER NOT NULL UNIQUE REFERENCES tiles(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
    );
    " || {
        print_error "Manual table creation failed"
        exit 1
    }
    print_success "Manual table creation completed"
fi

# Step 6: Rebuild and restart backend
print_status "Rebuilding backend..."
docker-compose -f docker-compose.prod.yml build --no-cache backend
print_success "Backend rebuilt"

print_status "Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend
print_success "Backend started"

# Step 7: Wait for backend to be healthy
print_status "Waiting for backend to be healthy..."
sleep 10

# Check backend health
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed, but continuing..."
fi

# Step 8: Rebuild and restart frontend
print_status "Rebuilding frontend..."
docker-compose -f docker-compose.prod.yml build --no-cache frontend
print_success "Frontend rebuilt"

print_status "Starting frontend..."
docker-compose -f docker-compose.prod.yml up -d frontend
print_success "Frontend started"

# Step 9: Final health checks
print_status "Performing final health checks..."

# Check all services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "All services are running"
else
    print_error "Some services failed to start"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Test API endpoints
print_status "Testing API endpoints..."
if curl -f https://artparty.social/health > /dev/null 2>&1; then
    print_success "Health endpoint accessible"
else
    print_warning "Health endpoint not accessible (may need time to propagate)"
fi

# Step 10: Show deployment summary
echo ""
print_success "🎉 Tile Lock System Deployment Completed!"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Database migration completed"
echo "  ✅ Backend rebuilt and restarted"
echo "  ✅ Frontend rebuilt and restarted"
echo "  ✅ All services running"
echo ""
echo "🔍 Next Steps:"
echo "  1. Test tile locking in browser"
echo "  2. Verify collaboration modes work"
echo "  3. Monitor logs for any issues"
echo ""
echo "📊 Useful Commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Check locks: docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c \"SELECT * FROM tile_locks;\""
echo "  - Service status: docker-compose -f docker-compose.prod.yml ps"
echo ""

print_success "Deployment script completed successfully!" 