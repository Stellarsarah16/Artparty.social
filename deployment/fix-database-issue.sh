#!/bin/bash

# Quick fix for the database issue
# Run this on your DigitalOcean server

echo "🔧 Fixing StellarCollabApp database issue..."

# Navigate to deployment directory
cd /opt/StellarCollabApp/deployment

# Stop the unhealthy backend
echo "Stopping unhealthy backend..."
docker-compose -f docker-compose.prod.yml stop backend

# Remove the unhealthy backend container
echo "Removing unhealthy backend container..."
docker-compose -f docker-compose.prod.yml rm -f backend

# Rebuild and restart the backend with the fixed configuration
echo "Rebuilding backend with fixed configuration..."
docker-compose -f docker-compose.prod.yml build backend

echo "Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 15

# Check status
echo "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo "Checking backend logs..."
docker-compose -f docker-compose.prod.yml logs backend --tail=20

echo "✅ Database fix completed!"
echo "Your app should now be accessible at:"
echo "Frontend: http://your-server-ip"
echo "Backend: http://your-server-ip:8000" 