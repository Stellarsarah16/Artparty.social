# Production Deployment Guide - Artparty.social

## 🚀 Quick Deploy (Fixed Version)

This guide covers the **fixed** deployment process that resolves the issues you encountered.

### Prerequisites

- Ubuntu server with Docker and Docker Compose installed
- Domain name pointing to your server
- Root access to the server

### Step 1: Clone Repository

```bash
# Clone the repository
cd /opt
git clone https://github.com/yourusername/your-repo-name.git artparty-social
cd artparty-social/deployment/production
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp env.prod.template .env

# Edit environment variables
nano .env

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 64)

# Update the .env file with these values
```

### Step 3: Deploy HTTP Version (Working)

```bash
# Create necessary directories
mkdir -p logs ssl
chmod 755 logs ssl

# Deploy the application
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# Test HTTP access
curl -I http://localhost:80
```

Your app should now be accessible at `http://YOUR_SERVER_IP`

### Step 4: Add SSL Certificates

```bash
# Make the SSL setup script executable
chmod +x setup-ssl.sh

# Run SSL setup (replace with your domain)
./setup-ssl.sh your-domain.com admin@your-domain.com

# The script will:
# 1. Install certbot
# 2. Generate SSL certificates
# 3. Configure nginx for HTTPS
# 4. Set up automatic renewal
# 5. Restart services with SSL
```

Your app will now be accessible at `https://YOUR_DOMAIN`

## 🔧 What We Fixed

### Issue 1: Broken Frontend Dockerfile
- **Problem**: Complex multi-stage build with permission issues
- **Solution**: Simplified single-stage build with embedded nginx config

### Issue 2: SSL Certificate Conflicts
- **Problem**: Nginx trying to load missing SSL certificates
- **Solution**: Conditional SSL configuration that works with or without certificates

### Issue 3: Volume Mount Issues
- **Problem**: Docker volume mounts with wrong permissions
- **Solution**: Proper directory creation and permission handling

### Issue 4: Docker Compose Configuration
- **Problem**: Broken volume syntax and missing dependencies
- **Solution**: Clean docker-compose.prod.yml with proper SSL support

## 📁 Updated Files

1. **`frontend/Dockerfile.prod`** - Simplified, working Dockerfile
2. **`deployment/production/docker-compose.prod.yml`** - Fixed volume mounts
3. **`deployment/production/nginx.ssl.conf`** - SSL-ready nginx configuration
4. **`deployment/production/setup-ssl.sh`** - Automated SSL setup script

## 🔄 Future Deployments

After making changes to your code:

```bash
# On your server
cd /opt/artparty-social

# Pull latest changes
git pull origin main

# Rebuild and restart
cd deployment/production
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## 🛡️ SSL Certificate Management

### Manual Renewal
```bash
# Test renewal
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal

# Copy certificates to deployment
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Check SSL Status
```bash
# Check certificate expiry
openssl x509 -in ssl/fullchain.pem -noout -dates

# Test SSL configuration
curl -I https://your-domain.com

# Check logs
docker-compose -f docker-compose.prod.yml logs frontend
```

## 📊 Monitoring

### Container Health
```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check resource usage
docker stats
```

### Application Health
```bash
# Test backend
curl http://localhost:8000/health

# Test frontend
curl -I http://localhost:80

# Test through nginx
curl -I http://localhost:80/health
```

## 🚨 Troubleshooting

### Frontend Not Starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs frontend

# Common issues:
# 1. Permission denied on logs - create logs directory
# 2. SSL certificate missing - run setup-ssl.sh
# 3. Port 80/443 in use - check with `ss -tlnp | grep :80`
```

### SSL Issues
```bash
# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec frontend nginx -t

# Check SSL files
ls -la ssl/
docker-compose -f docker-compose.prod.yml exec frontend ls -la /etc/ssl/certs/
```

### Database Connection Issues
```bash
# Check database
docker-compose -f docker-compose.prod.yml logs db

# Test connection
docker-compose -f docker-compose.prod.yml exec backend python -c "
from app.core.database import engine
try:
    engine.connect()
    print('Database connection successful')
except Exception as e:
    print(f'Database error: {e}')
"
```

## 🔒 Security Considerations

1. **Environment Variables**: Keep `.env` file secure, never commit to git
2. **SSL Certificates**: Auto-renewal is configured via cron
3. **Firewall**: Ensure only necessary ports (80, 443, 22) are open
4. **Updates**: Regularly update base images and dependencies

## 📝 Environment Variables

Required variables in `.env`:

```bash
# Database
DB_PASSWORD=your_secure_db_password

# Redis
REDIS_PASSWORD=your_secure_redis_password

# Application
SECRET_KEY=your_secret_key_min_64_chars
CORS_ORIGINS=["https://your-domain.com","https://www.your-domain.com"]

# Optional
LOG_LEVEL=INFO
DEBUG=false
ENVIRONMENT=production
```

## 🎯 Performance Optimization

1. **Nginx Caching**: Static files cached for 1 year
2. **Gzip Compression**: Enabled for text files
3. **Connection Pooling**: Database connections optimized
4. **Rate Limiting**: API endpoints protected

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Verify environment variables: `cat .env`
3. Test individual components: `curl http://localhost:8000/health`
4. Check disk space: `df -h`
5. Review this guide for troubleshooting steps

---

**Everything is now configured for reliable, secure production deployment! 🎉** 