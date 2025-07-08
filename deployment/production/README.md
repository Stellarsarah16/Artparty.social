# ArtPartySocial Production Deployment

This directory contains configuration files for production deployment of ArtPartySocial on Digital Ocean Ubuntu server.

## Pre-Deployment Checklist

### 1. Server Requirements
- Ubuntu 20.04+ server with at least 2GB RAM
- Docker and Docker Compose installed
- Domain name configured (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### 2. Security Configuration
**CRITICAL: Change all default passwords and secrets!**

- [ ] Update `DB_PASSWORD` in env.prod.template
- [ ] Update `REDIS_PASSWORD` in env.prod.template  
- [ ] Update `SECRET_KEY` in env.prod.template
- [ ] Update `CORS_ORIGINS` with your actual domain
- [ ] Update nginx server_name with your domain

## Quick Deployment

### 1. Prepare Environment
```bash
# Copy and configure environment file
cp env.prod.template .env

# Edit .env with your actual values
nano .env

# Update the following REQUIRED values:
# - DB_PASSWORD: Strong database password
# - REDIS_PASSWORD: Strong Redis password
# - SECRET_KEY: 64-character random string
# - CORS_ORIGINS: Your production domain(s)
```

### 2. Update Domain Configuration
```bash
# Edit nginx configuration
nano nginx.prod.conf

# Update the server_name line:
# server_name yourdomain.com www.yourdomain.com;
```

### 3. SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p ssl

# Option A: Let's Encrypt (recommended)
# Install certbot and obtain certificate
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem

# Option B: Self-signed certificate (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

### 4. Deploy Application
```bash
# Start the application
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Digital Ocean Specific Setup

### 1. Digital Ocean Droplet Setup
```bash
# Create droplet with Docker pre-installed
# Or manually install Docker:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Firewall Configuration
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### 3. Domain Setup
1. Point your domain's A record to your droplet's IP
2. Wait for DNS propagation (can take up to 24 hours)
3. Verify with: `dig yourdomain.com`

## Configuration Files

### docker-compose.prod.yml
- Production Docker Compose configuration
- Uses production-optimized images
- Includes health checks and restart policies
- Secure networking (no exposed database ports)

### env.prod.template
- Production environment variables template
- Includes security-focused settings
- Optimized for production performance
- Requires manual configuration of secrets

### nginx.prod.conf
- Production nginx configuration
- SSL/TLS termination
- Security headers
- Rate limiting
- Reverse proxy to backend

### init-db.sql
- Database initialization script
- Creates production database and user
- Sets up proper permissions

## Monitoring and Maintenance

### Application Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f db

# View nginx logs
docker-compose -f docker-compose.prod.yml exec frontend tail -f /var/log/nginx/access.log
docker-compose -f docker-compose.prod.yml exec frontend tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U stellarcollab stellarcollab_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U stellarcollab stellarcollab_prod < backup_file.sql
```

### Health Checks
```bash
# Check application health
curl -f http://localhost/health

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Updates and Scaling
```bash
# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Scale services (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS_ORIGINS includes your actual domain
2. **SSL Certificate Issues**: Check certificate paths and permissions
3. **Database Connection**: Verify database credentials and network connectivity
4. **High Memory Usage**: Consider upgrading server or optimizing settings

### Debug Commands
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check container logs
docker-compose -f docker-compose.prod.yml logs backend

# Access container shell
docker-compose -f docker-compose.prod.yml exec backend bash

# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec frontend nginx -t
```

## Security Best Practices

1. **Regular Updates**: Keep system and containers updated
2. **Backups**: Implement automated database backups
3. **Monitoring**: Set up log monitoring and alerting
4. **SSL**: Use strong SSL certificates and update regularly
5. **Secrets**: Use environment variables for all secrets
6. **Firewall**: Keep firewall rules minimal and specific

## Performance Optimization

1. **Database**: Monitor query performance and add indexes
2. **Redis**: Use Redis for caching and session management
3. **Nginx**: Enable gzip compression and static file caching
4. **Scaling**: Consider load balancing for high traffic

## Support

For deployment issues, check:
1. Application logs for errors
2. Nginx error logs for proxy issues
3. Database connectivity and permissions
4. SSL certificate validity and configuration 