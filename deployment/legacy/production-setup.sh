#!/bin/bash

# StellarCollabApp - Production Configuration Script

set -e

echo "🔧 Configuring StellarCollabApp for Production..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the StellarCollabApp root directory"
    exit 1
fi

# Navigate to deployment directory
cd deployment

# Create production environment file
echo "📝 Creating production environment configuration..."

cat > .env.prod << 'EOF'
# StellarCollabApp Production Environment
# ======================================

# Database Configuration
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_NOW
POSTGRES_DB=stellarcollab_prod
POSTGRES_USER=stellarcollab

# Security Configuration
SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_CHARACTERS
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application Configuration
APP_NAME=StellarCollabApp
APP_VERSION=1.0.0
DEBUG=false

# CORS Configuration (UPDATE WITH YOUR DOMAIN)
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Server Configuration
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Optional: Redis Configuration (auto-configured)
REDIS_URL=redis://redis:6379

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Monitoring
LOG_LEVEL=INFO
EOF

echo "✅ Created .env.prod file"

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p ssl uploads logs backups

# Set permissions
chmod 755 ssl uploads logs backups
chmod +x deploy.sh

echo "🔐 Generating example SSL certificates (REPLACE WITH REAL ONES)..."
if [ ! -f "ssl/cert.pem" ]; then
    openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "⚠️  Self-signed certificates created for testing. Replace with real certificates!"
fi

echo "📋 Next steps:"
echo "1. Edit .env.prod and update all configuration values"
echo "2. Replace SSL certificates in ssl/ directory with real ones"
echo "3. Update CORS_ORIGINS with your actual domain"
echo "4. Run ./deploy.sh to deploy the application"

echo "✅ Production setup completed!" 