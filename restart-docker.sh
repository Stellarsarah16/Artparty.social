#!/bin/bash

echo "🔄 Restarting Docker containers..."

# Stop all services
echo "⏹️  Stopping services..."
docker-compose down

# Wait a moment
sleep 2

# Start all services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check status
echo "📊 Container status:"
docker-compose ps

echo "✅ Docker containers restarted!"
echo "🌐 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:3000"
echo "📊 Database: localhost:5432"
