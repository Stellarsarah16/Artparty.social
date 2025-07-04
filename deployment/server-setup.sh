#!/bin/bash

# StellarCollabApp - Production Server Setup Script
# Run this on your Ubuntu/Debian server

set -e

echo "🔧 Setting up StellarCollabApp Production Server..."

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo "📦 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Nginx (for reverse proxy if needed)
sudo apt-get install -y nginx

# Install certbot for SSL certificates
sudo apt-get install -y certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /opt/stellarcollab
sudo chown $USER:$USER /opt/stellarcollab

echo "✅ Server setup completed!"
echo "🔄 Please log out and log back in for Docker permissions to take effect"
echo "📁 Application directory: /opt/stellarcollab" 