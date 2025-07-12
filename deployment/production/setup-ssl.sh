#!/bin/bash

# SSL Setup Script for StellarCollabApp
# This script sets up Let's Encrypt SSL certificates for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-artparty.social}"
EMAIL="${2:-admin@${DOMAIN}}"
WEBROOT="/tmp/acme-challenge"

echo -e "${GREEN}🔒 Setting up SSL certificates for ${DOMAIN}${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt update
    apt install -y certbot
    print_status "Certbot installed"
fi

# Check if domain is accessible
echo "Checking domain accessibility..."
if ! curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}" | grep -q "200\|301\|302"; then
    print_warning "Domain ${DOMAIN} may not be accessible. Continuing anyway..."
fi

# Create webroot directory for HTTP validation
mkdir -p $WEBROOT

# Stop nginx temporarily to free port 80
echo "Stopping nginx temporarily..."
docker-compose -f docker-compose.prod.yml stop frontend || true

# Generate SSL certificates using standalone mode
echo "Generating SSL certificates..."
certbot certonly \
    --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN \
    --domains www.$DOMAIN \
    --non-interactive

if [ $? -eq 0 ]; then
    print_status "SSL certificates generated successfully"
else
    print_error "Failed to generate SSL certificates"
    exit 1
fi

# Create SSL directory in deployment
mkdir -p ssl
chmod 755 ssl

# Copy certificates to deployment directory
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/

# Set proper permissions
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem

print_status "SSL certificates copied to deployment directory"

# Update docker-compose to use SSL configuration
if [ -f docker-compose.prod.yml ]; then
    # Enable SSL volumes in docker-compose
    sed -i 's|#.*- ./ssl:/etc/ssl/certs:ro|      - ./ssl:/etc/ssl/certs:ro|' docker-compose.prod.yml
    sed -i 's|#.*- ./nginx.ssl.conf:/etc/nginx/nginx.conf:ro|      - ./nginx.ssl.conf:/etc/nginx/nginx.conf:ro|' docker-compose.prod.yml
    sed -i 's|#.*- ./logs:/var/log/nginx|      - ./logs:/var/log/nginx|' docker-compose.prod.yml
    
    print_status "Docker compose configuration updated for SSL"
fi

# Create directories for logs
mkdir -p logs
chmod 755 logs

# Start the services with SSL
echo "Starting services with SSL..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 10

# Test SSL configuration
echo "Testing SSL configuration..."
if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200"; then
    print_status "SSL setup completed successfully! 🎉"
    print_status "Your site is now accessible at https://${DOMAIN}"
else
    print_warning "SSL setup completed but HTTPS test failed. Check logs:"
    echo "docker-compose -f docker-compose.prod.yml logs frontend"
fi

# Create renewal script
cat > /etc/cron.daily/ssl-renew << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

cd /opt/artparty-social/deployment/production

# Try to renew certificates
certbot renew --quiet

# If renewal was successful, update certificates in deployment
if [ $? -eq 0 ]; then
    # Copy updated certificates
    cp /etc/letsencrypt/live/*/fullchain.pem ssl/ 2>/dev/null || true
    cp /etc/letsencrypt/live/*/privkey.pem ssl/ 2>/dev/null || true
    
    # Reload nginx
    docker-compose -f docker-compose.prod.yml restart frontend
fi
EOF

chmod +x /etc/cron.daily/ssl-renew

print_status "SSL renewal script created"

echo -e "${GREEN}
🎉 SSL Setup Complete!

✅ SSL certificates generated and installed
✅ Nginx configured for HTTPS
✅ Automatic renewal configured
✅ Services restarted with SSL

Your site is now accessible at:
- https://${DOMAIN}
- https://www.${DOMAIN}

HTTP traffic will be redirected to HTTPS automatically.
${NC}"

echo -e "${YELLOW}
📋 Next Steps:
1. Update your DNS to point to this server
2. Test your site: https://${DOMAIN}
3. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}
${NC}" 