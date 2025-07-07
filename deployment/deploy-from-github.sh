#!/bin/bash

# Enhanced deployment script for StellarCollabApp
# This script handles database fixes and smooth GitHub deployments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
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

print_status "Starting StellarCollabApp deployment..."

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "docker-compose.prod.yml not found. Please run this script from the deployment directory."
    exit 1
fi

# Check if environment file exists
if [ ! -f ".env.prod" ]; then
    print_warning ".env.prod not found. Creating from template..."
    if [ -f "env.production.template" ]; then
        cp env.production.template .env.prod
        print_warning "Please edit .env.prod with your actual values before continuing."
        print_warning "Required variables: SECRET_KEY, DB_PASSWORD, REDIS_PASSWORD, CORS_ORIGINS"
        exit 1
    else
        print_error "env.production.template not found. Cannot create .env.prod"
        exit 1
    fi
fi

# Source environment variables
export $(cat .env.prod | xargs)

# Check required environment variables
required_vars=("SECRET_KEY" "DB_PASSWORD" "REDIS_PASSWORD")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables: ${missing_vars[*]}"
    print_error "Please update .env.prod with proper values"
    exit 1
fi

print_status "Environment variables validated"

# Stop and remove old containers (but keep volumes)
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Clean up any old containers with different names
print_status "Cleaning up old containers..."
docker container prune -f

# Remove old images to force rebuild
print_status "Removing old images to force rebuild..."
docker image rm stellarcollabapp-backend:latest || true
docker image rm stellarcollabapp-frontend:latest || true

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Function to check if a service is healthy
check_service_health() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f docker-compose.prod.yml ps $service | grep -q "healthy"; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    return 1
}

# Check database health
print_status "Checking database health..."
if check_service_health "db"; then
    print_success "Database is healthy"
else
    print_error "Database failed to become healthy"
    docker-compose -f docker-compose.prod.yml logs db
    exit 1
fi

# Check backend health
print_status "Checking backend health..."
sleep 10  # Give backend extra time to start
if check_service_health "backend"; then
    print_success "Backend is healthy"
else
    print_warning "Backend health check failed, checking logs..."
    docker-compose -f docker-compose.prod.yml logs backend --tail=20
    
    # Try to restart backend once
    print_status "Restarting backend..."
    docker-compose -f docker-compose.prod.yml restart backend
    
    sleep 15
    if check_service_health "backend"; then
        print_success "Backend is healthy after restart"
    else
        print_error "Backend is still unhealthy. Check logs:"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
fi

# Check if frontend is running
print_status "Checking frontend status..."
if docker-compose -f docker-compose.prod.yml ps frontend | grep -q "Up"; then
    print_success "Frontend is running"
else
    print_error "Frontend is not running"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Test endpoints
print_status "Testing endpoints..."

# Test frontend
if curl -f -s http://localhost > /dev/null; then
    print_success "Frontend is accessible at http://localhost"
else
    print_warning "Frontend might not be accessible yet"
fi

# Test backend health endpoint
if curl -f -s http://localhost:8000/health > /dev/null; then
    print_success "Backend health endpoint is accessible"
elif curl -f -s http://localhost:8000/ > /dev/null; then
    print_success "Backend is accessible at http://localhost:8000"
else
    print_warning "Backend might not be accessible yet"
fi

# Show running containers
print_status "Current container status:"
docker-compose -f docker-compose.prod.yml ps

# Show logs summary
print_status "Recent logs summary:"
docker-compose -f docker-compose.prod.yml logs --tail=5 backend

print_success "Deployment completed successfully!"
print_status "Frontend: http://localhost"
print_status "Backend: http://localhost:8000"
print_status "API Docs: http://localhost:8000/docs"

# Create a quick health check command
cat << 'EOF' > health-check.sh
#!/bin/bash
echo "=== StellarCollabApp Health Check ==="
echo
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo
echo "Frontend Test:"
curl -I http://localhost 2>/dev/null || echo "Frontend not accessible"
echo
echo "Backend Test:"
curl -I http://localhost:8000 2>/dev/null || echo "Backend not accessible"
echo
echo "Recent Backend Logs:"
docker-compose -f docker-compose.prod.yml logs backend --tail=10
EOF

chmod +x health-check.sh
print_status "Created health-check.sh for future monitoring"

print_success "All services are running! 🎉" 