# 🔧 Ubuntu Server Reset Guide for artparty.social

## ⚠️ **WARNING: This will remove ALL data on your server!**
**Make sure you have backups of any important data before proceeding.**

## Step 1: Connect to Your Server

```bash
# SSH into your Digital Ocean server
ssh root@104.248.124.8
# OR
ssh username@104.248.124.8
```

## Step 2: Stop All Running Services

```bash
# Stop Docker containers (if any are running)
docker stop $(docker ps -aq)

# Stop nginx if running outside Docker
sudo systemctl stop nginx

# Stop other web servers
sudo systemctl stop apache2 2>/dev/null || true

# Check what's using ports 80 and 443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

## Step 3: Complete Docker Cleanup

```bash
# Remove all containers (running and stopped)
docker rm -f $(docker ps -aq)

# Remove all images
docker rmi -f $(docker images -aq)

# Remove all volumes (THIS DELETES ALL DATABASE DATA!)
docker volume rm $(docker volume ls -q)

# Remove all networks
docker network prune -f

# Clean up build cache
docker system prune -af --volumes

# Verify everything is gone
docker ps -a
docker images
docker volume ls
```

## Step 4: Remove Old Application Files

```bash
# Remove common deployment directories
sudo rm -rf /var/www/html/*
sudo rm -rf /opt/app/
sudo rm -rf /home/*/app/
sudo rm -rf /root/app/

# Remove old SSL certificates
sudo rm -rf /etc/letsencrypt/
sudo rm -rf /etc/ssl/private/*

# Remove old nginx configs
sudo rm -rf /etc/nginx/sites-available/*
sudo rm -rf /etc/nginx/sites-enabled/*

# Find and remove any remaining app files
find /home -name "*stellarcollab*" -type d 2>/dev/null
find /opt -name "*stellarcollab*" -type d 2>/dev/null
```

## Step 5: System Update and Package Cleanup

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Remove unnecessary packages
sudo apt autoremove -y
sudo apt autoclean

# Remove old kernels (if any)
sudo apt autoremove --purge -y
```

## Step 6: Reinstall Essential Software

### Docker Installation:
```bash
# Remove old Docker installations
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (if not root)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### Other Essential Tools:
```bash
# Install useful tools
sudo apt install -y curl wget git nano vim htop unzip

# Install certbot for SSL certificates
sudo apt install -y certbot

# Install nginx (we'll use it for initial setup if needed)
sudo apt install -y nginx
sudo systemctl disable nginx  # Don't start automatically
```

## Step 7: Configure Firewall

```bash
# Reset firewall rules
sudo ufw --force reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

## Step 8: Create Clean Directory Structure

```bash
# Create app directory
mkdir -p /opt/artparty-social
cd /opt/artparty-social

# Set proper ownership
sudo chown -R $USER:$USER /opt/artparty-social
```

## Step 9: System Security Hardening

```bash
# Update SSH config for security (optional)
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Disable root login (if using a user account)
# sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH service
sudo systemctl restart sshd

# Set up automatic security updates (optional)
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Step 10: Verify Clean State

```bash
# Check that no services are using ports 80/443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Check Docker is clean
docker ps -a
docker images
docker volume ls

# Check disk space
df -h

# Check memory
free -h

# Check system status
sudo systemctl status docker
sudo systemctl status nginx
```

## Step 11: Create Deployment User (Optional but Recommended)

```bash
# Create dedicated user for the app
sudo adduser artparty
sudo usermod -aG docker artparty
sudo usermod -aG sudo artparty

# Switch to the new user
sudo su - artparty

# Create app directory
mkdir -p ~/artparty-social
cd ~/artparty-social
```

## Step 12: Test Basic Functionality

```bash
# Test Docker
docker run hello-world

# Test Docker Compose
echo "version: '3.8'
services:
  test:
    image: nginx:alpine
    ports:
      - '8080:80'" > test-compose.yml

docker-compose -f test-compose.yml up -d
curl http://localhost:8080
docker-compose -f test-compose.yml down
rm test-compose.yml
```

## Step 13: Prepare for Deployment

```bash
# Create SSL directory for certificates
mkdir -p ssl

# Create deployment directory structure
mkdir -p logs
mkdir -p backups

# Set up git (if you plan to clone from repository)
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

## Final Verification Checklist

- [ ] All old Docker containers/images removed
- [ ] All old application files deleted
- [ ] System updated and clean
- [ ] Docker and Docker Compose installed and working
- [ ] Firewall configured (SSH, HTTP, HTTPS allowed)
- [ ] Ports 80 and 443 are free
- [ ] SSL certificate directory created
- [ ] User has proper permissions

## Ready for Deployment!

Your server is now clean and ready for deploying artparty.social. Next steps:

1. Upload your `deployment/production/` files to the server
2. Set up DNS in GoDaddy
3. Get SSL certificates with Let's Encrypt
4. Create your `.env` file with secure passwords
5. Deploy with `docker-compose -f docker-compose.prod.yml up -d`

---

**Server IP: 104.248.124.8**  
**Domain: artparty.social**  
**Ready for fresh deployment! 🚀** 