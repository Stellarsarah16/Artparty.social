# 🚀 Digital Ocean Deployment Guide

Complete guide to deploy StellarCollabApp on Digital Ocean Ubuntu server.

## Prerequisites

- Digital Ocean account
- SSH key set up (recommended)
- Domain name (optional, but recommended)

## Step 1: Create Digital Ocean Droplet

### 1.1 Create the Server
1. **Log in to Digital Ocean** and click "Create" → "Droplet"
2. **Choose Image:** Ubuntu 22.04 (LTS) x64
3. **Choose Size:** 
   - **Minimum:** Basic $12/month (2GB RAM, 2 CPUs, 50GB SSD)
   - **Recommended:** $18/month (2GB RAM, 2 CPUs, 60GB SSD)
4. **Choose Region:** Select closest to your users
5. **Authentication:** 
   - **SSH Key (Recommended):** Add your public SSH key
   - **Password:** Create a strong root password
6. **Hostname:** `stellarcollab-server`
7. Click **"Create Droplet"**

### 1.2 Get Server Details
- **IP Address:** Note your server's IP (e.g., `143.198.123.45`)
- **Access:** SSH access via terminal

## Step 2: Connect to Your Server

### From Windows (PowerShell/Command Prompt)
```bash
# If using SSH key
ssh root@YOUR_SERVER_IP

# If using password
ssh root@YOUR_SERVER_IP
# Enter password when prompted
```

### From Windows (PuTTY)
1. Open PuTTY
2. Enter IP address: `YOUR_SERVER_IP`
3. Port: `22`
4. Connection type: `SSH`
5. Click "Open"

## Step 3: Upload Your Code to the Server

### Option A: Using Git (Recommended)
```bash
# On your server
cd /opt
git clone https://github.com/YOUR_USERNAME/StellarCollabApp.git
cd StellarCollabApp
```

### Option B: Using SCP (Upload from Windows)
```bash
# From your Windows machine
scp -r F:\DevFolder\PythonProjects\webApplications\StellarCollabApp root@YOUR_SERVER_IP:/opt/
```

## Step 4: Server Setup and Deployment

### 4.1 Run Server Setup Script
```bash
# On your server
cd /opt/StellarCollabApp/deployment
chmod +x server-setup.sh
./server-setup.sh
```

This script will:
- Update the system
- Install Docker & Docker Compose
- Install SSL tools
- Create necessary directories
- Set up firewall

### 4.2 Configure Environment Variables
```bash
# Copy and edit the production environment file
cp env.production.template .env.prod
nano .env.prod
```

**Required Environment Variables:**
```bash
# Database (Generate strong password)
DB_PASSWORD=your_strong_database_password_here

# Security (Generate 32+ character secret)
SECRET_KEY=your_super_secret_key_here_at_least_32_chars

# Domain (replace with your domain or IP)
CORS_ORIGINS=["https://your-domain.com","https://YOUR_SERVER_IP"]

# Database settings
POSTGRES_DB=stellarcollab_prod
POSTGRES_USER=stellarcollab
DATABASE_URL=postgresql://stellarcollab:your_strong_database_password_here@db:5432/stellarcollab_prod

# App settings
APP_NAME=StellarCollabApp
APP_VERSION=1.0.0
DEBUG=false
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
PORT=8000
WORKERS=4
REDIS_URL=redis://redis:6379

# File uploads
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
```

### 4.3 Set Up SSL Certificate

#### Option A: Let's Encrypt (Free SSL - Recommended)
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to deployment directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

#### Option B: Self-Signed Certificate (For Testing)
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=YOUR_SERVER_IP"
```

### 4.4 Deploy the Application
```bash
# Run the deployment script
chmod +x deploy.sh
./deploy.sh
```

## Step 5: Verify Deployment

### 5.1 Check Services
```bash
# Check if all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                STATUS          PORTS
# deployment-app-1    Up              0.0.0.0:8000->8000/tcp
# deployment-db-1     Up              5432/tcp
# deployment-nginx-1  Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# deployment-redis-1  Up              6379/tcp
```

### 5.2 Test the Application
```bash
# Test health endpoint
curl http://YOUR_SERVER_IP:8000/health

# Test frontend
curl -I http://YOUR_SERVER_IP
```

### 5.3 Access Your Application
- **Frontend:** `http://YOUR_SERVER_IP` or `https://your-domain.com`
- **API Documentation:** `http://YOUR_SERVER_IP:8000/docs`
- **Health Check:** `http://YOUR_SERVER_IP:8000/health`

## Step 6: Domain Setup (Optional)

### 6.1 Configure DNS
1. **Go to your domain registrar** (GoDaddy, Namecheap, etc.)
2. **Add A Record:**
   - **Type:** A
   - **Name:** @ (or your subdomain)
   - **Value:** YOUR_SERVER_IP
   - **TTL:** 600 (10 minutes)

### 6.2 Wait for DNS Propagation
```bash
# Check DNS propagation
nslookup your-domain.com
```

## Step 7: Post-Deployment

### 7.1 Set Up Automatic SSL Renewal
```bash
# Add cron job for SSL renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet && docker compose -f /opt/StellarCollabApp/deployment/docker-compose.prod.yml restart nginx
```

### 7.2 Enable Automatic Backups
```bash
# Create backup script
sudo crontab -e

# Add daily database backup at 2 AM:
0 2 * * * docker exec deployment-db-1 pg_dump -U stellarcollab stellarcollab_prod > /opt/backups/stellarcollab_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### View Logs
```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# View specific service logs
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs db
```

### Restart Services
```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart app
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Security Checklist

✅ **Firewall configured** (only ports 22, 80, 443 open)
✅ **SSL certificate installed**
✅ **Strong passwords used**
✅ **Database not exposed publicly**
✅ **Rate limiting enabled**
✅ **Security headers configured**

## Maintenance Commands

```bash
# Check disk usage
df -h

# Check container resources
docker stats

# Clean up unused Docker resources
docker system prune -f

# Monitor logs in real-time
docker compose -f docker-compose.prod.yml logs -f app
```

## Support

If you encounter issues:
1. Check the logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify all containers are running: `docker compose -f docker-compose.prod.yml ps`
3. Check the firewall: `sudo ufw status`
4. Verify DNS settings: `nslookup your-domain.com`

## 🎉 You're Live!

Your StellarCollabApp is now running on Digital Ocean! Users can:
- Create accounts and log in
- Create collaborative pixel art canvases
- Paint 32x32 pixel art tiles in real-time
- Like and share their creations
- Collaborate with others via WebSocket connections

**Next Steps:**
- Share your app URL with friends
- Monitor usage via logs
- Set up monitoring (optional)
- Configure backups
- Plan for scaling as you grow 