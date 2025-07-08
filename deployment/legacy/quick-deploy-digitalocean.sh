#!/bin/bash

# StellarCollabApp - Quick Digital Ocean Deployment Script
# This script automates the deployment process on a fresh Ubuntu server

set -e

echo "🚀 StellarCollabApp Digital Ocean Deployment Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo -e "${BLUE}Server IP detected: ${SERVER_IP}${NC}"

# Step 1: Update system
echo -e "${BLUE}Step 1: Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Docker
echo -e "${BLUE}Step 2: Installing Docker...${NC}"
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Step 3: Install Docker Compose
echo -e "${BLUE}Step 3: Installing Docker Compose...${NC}"
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Step 4: Install additional tools
echo -e "${BLUE}Step 4: Installing additional tools...${NC}"
apt install -y git nginx certbot python3-certbot-nginx ufw

# Step 5: Configure firewall
echo -e "${BLUE}Step 5: Configuring firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8000

# Step 6: Create directories
echo -e "${BLUE}Step 6: Creating directories...${NC}"
mkdir -p /opt/StellarCollabApp
mkdir -p /opt/backups
mkdir -p /opt/logs

# Step 7: Clone or setup application
echo -e "${BLUE}Step 7: Setting up application...${NC}"
if [ -d "/opt/StellarCollabApp/.git" ]; then
    cd /opt/StellarCollabApp
    git pull origin main
else
    echo -e "${YELLOW}Please upload your StellarCollabApp code to /opt/StellarCollabApp${NC}"
    echo -e "${YELLOW}You can use: scp -r your_local_path/StellarCollabApp root@${SERVER_IP}:/opt/${NC}"
    echo -e "${YELLOW}Or clone from GitHub: git clone https://github.com/YOUR_USERNAME/StellarCollabApp.git /opt/StellarCollabApp${NC}"
fi

# Step 8: Setup environment
echo -e "${BLUE}Step 8: Setting up environment...${NC}"
if [ -f "/opt/StellarCollabApp/deployment/env.production.template" ]; then
    cd /opt/StellarCollabApp/deployment
    
    # Create directories
    mkdir -p ssl uploads logs backups
    
    # Create environment file if it doesn't exist
    if [ ! -f ".env.prod" ]; then
        cp env.production.template .env.prod
        
        # Generate secure passwords
        DB_PASSWORD=$(openssl rand -base64 32)
        SECRET_KEY=$(openssl rand -base64 48)
        
        # Update environment file
        sed -i "s/your_database_password_here/$DB_PASSWORD/g" .env.prod
        sed -i "s/your_secret_key_here_min_32_chars/$SECRET_KEY/g" .env.prod
        sed -i "s/your-domain.com/$SERVER_IP/g" .env.prod
        
        echo -e "${GREEN}Environment file created with secure passwords${NC}"
    fi
    
    # Generate SSL certificate
    if [ ! -f "ssl/cert.pem" ]; then
        echo -e "${BLUE}Generating self-signed SSL certificate...${NC}"
        openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=StellarCollabApp/CN=$SERVER_IP"
        echo -e "${GREEN}SSL certificate generated${NC}"
    fi
    
    # Deploy application
    echo -e "${BLUE}Step 9: Deploying application...${NC}"
    chmod +x deploy.sh
    ./deploy.sh
    
    # Wait for services to start
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 30
    
    # Check deployment
    echo -e "${BLUE}Step 10: Verifying deployment...${NC}"
    if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
        echo -e "${GREEN}✅ Services are running${NC}"
        
        # Test endpoints
        if curl -s http://localhost:8000/health | grep -q "healthy"; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check failed, but services are running${NC}"
        fi
        
        echo -e "${GREEN}🎉 StellarCollabApp is now live!${NC}"
        echo -e "${GREEN}===============================${NC}"
        echo -e "${GREEN}Frontend: http://${SERVER_IP}${NC}"
        echo -e "${GREEN}API Docs: http://${SERVER_IP}:8000/docs${NC}"
        echo -e "${GREEN}Health: http://${SERVER_IP}:8000/health${NC}"
        echo -e "${GREEN}===============================${NC}"
        
        # Setup automatic backups
        echo -e "${BLUE}Setting up automatic backups...${NC}"
        (crontab -l 2>/dev/null; echo "0 2 * * * docker exec deployment-db-1 pg_dump -U stellarcollab stellarcollab_prod > /opt/backups/stellarcollab_\$(date +\\%Y\\%m\\%d).sql") | crontab -
        
        echo -e "${GREEN}✅ Automatic daily backups configured${NC}"
        
        # Final instructions
        echo -e "${BLUE}Next Steps:${NC}"
        echo -e "${YELLOW}1. Test your app at: http://${SERVER_IP}${NC}"
        echo -e "${YELLOW}2. If you have a domain, set up DNS and SSL${NC}"
        echo -e "${YELLOW}3. Monitor logs: docker compose -f docker-compose.prod.yml logs -f${NC}"
        echo -e "${YELLOW}4. View this guide: cat /opt/StellarCollabApp/DIGITALOCEAN-DEPLOY.md${NC}"
        
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        echo -e "${RED}Check logs: docker compose -f docker-compose.prod.yml logs${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ StellarCollabApp code not found in /opt/StellarCollabApp${NC}"
    echo -e "${YELLOW}Please upload your code first${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}" 