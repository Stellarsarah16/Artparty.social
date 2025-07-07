# 🚀 Quick Deployment Guide - StellarCollabApp

## **Step 1: Set Up Your Production Server**

### **Option A: Using a VPS (DigitalOcean, AWS EC2, etc.)**

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Start Docker
systemctl start docker
systemctl enable docker
```

### **Option B: Using Docker Desktop (Local Testing)**

1. Install Docker Desktop from https://docker.com/products/docker-desktop
2. Make sure it's running

## **Step 2: Clone and Setup**

```bash
# Clone the repository
git clone https://github.com/yourusername/StellarCollabApp.git
cd StellarCollabApp/deployment

# Create your production configuration
cp env.production.template .env.prod
```

## **Step 3: Configure Environment (.env.prod)**

**Edit `.env.prod` file with these values:**

```bash
# Required: Change these values!
DB_PASSWORD=your_strong_database_password_here
SECRET_KEY=your_super_secret_jwt_key_at_least_32_characters_long
CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Database (keep as-is for Docker setup)
DATABASE_URL=postgresql://stellarcollab:${DB_PASSWORD}@db:5432/stellarcollab_prod

# Application settings (you can keep these)
APP_NAME=StellarCollabApp
APP_VERSION=1.0.0
DEBUG=false
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
HOST=0.0.0.0
PORT=8000
WORKERS=4
REDIS_URL=redis://redis:6379
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
LOG_LEVEL=INFO
```

## **Step 4: SSL Certificates**

### **Option A: For Testing (Self-Signed)**

```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificates (testing only!)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=YourOrg/CN=yourdomain.com"
```

### **Option B: For Production (Let's Encrypt)**

```bash
# Install certbot
apt install certbot -y

# Get real SSL certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to ssl directory
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
```

## **Step 5: Deploy!**

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy the application
./deploy.sh
```

**The deployment script will:**
- Pull and build all Docker images
- Start PostgreSQL database
- Start Redis cache
- Start the FastAPI backend
- Start Nginx frontend with SSL
- Run database migrations
- Perform health checks

## **Step 6: Verify Deployment**

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Should show something like:
# NAME                    STATUS
# deployment-frontend-1   Up
# deployment-backend-1    Up (healthy)
# deployment-db-1         Up (healthy)
# deployment-redis-1      Up
```

**Test the application:**

```bash
# Test health endpoint
curl -k https://localhost/health

# Should return: {"status": "healthy"}
```

## **Step 7: Access Your Application**

- **Frontend**: https://your-domain.com
- **API**: https://your-domain.com/api
- **Health Check**: https://your-domain.com/health

## **🔧 Common Commands**

### **View Logs**
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

### **Restart Services**
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### **Update Application**
```bash
# Pull latest code
git pull origin main

# Redeploy
./deploy.sh
```

### **Backup Database**
```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U stellarcollab stellarcollab_prod > backup.sql

# Restore backup
docker compose -f docker-compose.prod.yml exec -T db psql -U stellarcollab stellarcollab_prod < backup.sql
```

## **🚨 Troubleshooting**

### **"Database connection failed"**
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Check environment variables
grep DB_PASSWORD .env.prod
```

### **"502 Bad Gateway"**
```bash
# Check backend is running
docker compose -f docker-compose.prod.yml logs backend

# Test backend directly
curl http://localhost:8000/health
```

### **"SSL certificate error"**
```bash
# Check certificate files exist
ls -la ssl/

# Verify certificate
openssl x509 -in ssl/cert.pem -text -noout
```

## **📋 Production Checklist**

Before going live:

- [ ] Updated `.env.prod` with strong passwords
- [ ] Real SSL certificates installed
- [ ] Domain DNS pointing to your server
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] CORS_ORIGINS updated with your domain

## **🎉 You're Live!**

Your StellarCollabApp is now running in production! Users can:

- Create accounts and log in
- Create and join collaborative canvases
- Paint 32x32 pixel art tiles in real-time
- Like and interact with other users' artwork
- Experience real-time collaboration via WebSockets

**Need help?** Check the logs with the commands above or refer to the full DEPLOYMENT.md guide. 