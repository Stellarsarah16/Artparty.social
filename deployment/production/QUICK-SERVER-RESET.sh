#!/bin/bash

# 🔧 Quick Server Reset Script for artparty.social
# WARNING: This will remove ALL data! Use with caution.

echo "🔧 Starting server reset for artparty.social..."

# Stop all services
echo "🛑 Stopping services..."
docker stop $(docker ps -aq) 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || true

# Complete Docker cleanup
echo "🧹 Cleaning Docker..."
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker rmi -f $(docker images -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker network prune -f
docker system prune -af --volumes

# Remove old files
echo "🗑️ Removing old files..."
sudo rm -rf /var/www/html/*
sudo rm -rf /opt/app/
sudo rm -rf /home/*/app/
sudo rm -rf /root/app/
sudo rm -rf /etc/letsencrypt/
sudo rm -rf /etc/nginx/sites-available/*
sudo rm -rf /etc/nginx/sites-enabled/*

# System update
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y && sudo apt autoclean

# Reinstall Docker
echo "🐳 Installing Docker..."
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "📚 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install essential tools
echo "🛠️ Installing tools..."
sudo apt install -y curl wget git nano vim htop unzip certbot nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create directory structure
echo "📁 Creating directories..."
sudo mkdir -p /opt/artparty-social
sudo chown -R $USER:$USER /opt/artparty-social
cd /opt/artparty-social
mkdir -p ssl logs backups

# Disable nginx auto-start
sudo systemctl disable nginx

echo "✅ Server reset complete!"
echo "🚀 Ready for artparty.social deployment"
echo ""
echo "Next steps:"
echo "1. Upload your deployment files"
echo "2. Set up DNS in GoDaddy" 
echo "3. Get SSL certificates"
echo "4. Create .env file"
echo "5. Deploy with docker-compose" 