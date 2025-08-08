# Artparty.social - Production Deployment Guide

This guide covers deploying Artparty.social to production using Docker and Docker Compose.

## 🏗️ Architecture Overview

Artparty.social uses a multi-container architecture:

- **Frontend**: Nginx serving static files + reverse proxy
- **Backend**: FastAPI application with WebSocket support
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for WebSocket scaling and caching
- **File Storage**: Volume-mounted uploads directory

## 📋 Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 20GB minimum, 50GB recommended
- **CPU**: 2 cores minimum

### Software Dependencies

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## 🚀 Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/Artparty.social.git
cd Artparty.social
```

### 2. Configure Environment

```bash
# Navigate to deployment directory
cd deployment

# Copy environment template
cp env.production.template .env.prod

# Edit configuration
nano .env.prod
```

**Required Environment Variables:**

```bash
# Database
DB_PASSWORD=your-strong-database-password

# Security
SECRET_KEY=your-super-secret-jwt-key-256-bits-minimum

# Application
CORS_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]

# Optional: Redis URL (auto-configured if using Docker Compose)
# REDIS_URL=redis://redis:6379
```

### 3. SSL Certificates

For HTTPS support, place your SSL certificates in the `ssl/` directory:

```bash
mkdir -p ssl
# Copy your certificates
cp /path/to/your/cert.pem ssl/
cp /path/to/your/key.pem ssl/
```

For development/testing, you can generate self-signed certificates:

```bash
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### 4. Deploy Application

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deployment script will:
- Validate environment configuration
- Pull and build Docker images
- Start all services
- Run database migrations
- Perform health checks

### 5. Verify Deployment

Check that all services are running:

```bash
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                COMMAND                  SERVICE    STATUS         PORTS
deployment-backend-1   "gunicorn app.main:a…"   backend    Up (healthy)   
deployment-db-1        "docker-entrypoint.s…"   db         Up (healthy)   
deployment-frontend-1  "/docker-entrypoint.…"   frontend   Up             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
deployment-redis-1     "docker-entrypoint.s…"   redis      Up             
```

## 🔧 Configuration

### Database Configuration

The PostgreSQL database is automatically configured with:
- Database: `stellarcollab_prod`
- User: `stellarcollab`
- Password: From `DB_PASSWORD` environment variable

### Backend Configuration

Key backend settings:
- **Workers**: 4 Gunicorn workers with Uvicorn
- **Port**: 8000 (internal)
- **Health check**: `/health` endpoint
- **File uploads**: `/app/uploads` volume

### Frontend Configuration

Nginx configuration includes:
- **SSL termination** with TLS 1.2/1.3
- **Rate limiting** (API: 10 req/s, General: 5 req/s)
- **Gzip compression** for static assets
- **Security headers** (XSS protection, CSP, etc.)
- **WebSocket proxying** for real-time features

## 🔍 Monitoring & Maintenance

### Health Checks

```bash
# Check application health
curl -f https://yourdomain.com/health

# Check individual services
docker compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs db
```

### Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U stellarcollab stellarcollab_prod > backup.sql

# Restore backup
docker compose -f docker-compose.prod.yml exec -T db psql -U stellarcollab stellarcollab_prod < backup.sql
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./deploy.sh
```

## 📊 Scaling

### Horizontal Scaling

To scale the backend:

```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Load Balancing

For multiple backend instances, update the Nginx configuration to include all backend containers:

```nginx
upstream backend {
    server backend_1:8000;
    server backend_2:8000;
    server backend_3:8000;
}
```

## 🔒 Security Considerations

### Network Security
- All services run in isolated Docker network
- Only frontend container exposes ports externally
- Database and Redis are not directly accessible

### Application Security
- JWT tokens with configurable expiration
- CORS configuration for allowed origins
- Rate limiting on API endpoints
- SQL injection protection via SQLAlchemy ORM

### SSL/TLS
- TLS 1.2+ only
- Strong cipher suites
- HSTS headers

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check database logs
docker compose -f docker-compose.prod.yml logs db

# Verify environment variables
grep DB_PASSWORD .env.prod
```

**2. Frontend Returns 502 Bad Gateway**
```bash
# Check backend health
docker compose -f docker-compose.prod.yml logs backend

# Verify backend is running
curl -f http://localhost:8000/health
```

**3. WebSocket Connection Failed**
```bash
# Check Nginx configuration
docker compose -f docker-compose.prod.yml exec frontend nginx -t

# Verify WebSocket proxy settings in nginx.conf
```

**4. SSL Certificate Issues**
```bash
# Verify certificate files
ls -la ssl/
openssl x509 -in ssl/cert.pem -text -noout
```

### Performance Tuning

**Database Performance:**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

**Backend Performance:**
- Increase Gunicorn workers based on CPU cores
- Monitor memory usage and adjust container limits
- Use Redis for caching frequently accessed data

## 📈 Monitoring Setup

### Basic Monitoring

Add to your monitoring setup:
- **Health endpoint**: `https://yourdomain.com/health`
- **Database connections**: Monitor PostgreSQL connection count
- **Memory usage**: Track container memory consumption
- **Response times**: Monitor API response times

### Log Aggregation

Consider using log aggregation tools:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana + Loki
- Cloud-based solutions (AWS CloudWatch, etc.)

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring and alerting**
2. **Configure automated backups**
3. **Set up CI/CD pipeline**
4. **Configure domain and DNS**
5. **Set up SSL certificate auto-renewal**
6. **Performance testing and optimization**

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify environment configuration
4. Ensure all prerequisites are met

---

**Note**: This deployment guide assumes a basic production setup. For high-availability deployments, consider additional components like load balancers, database clustering, and container orchestration platforms like Kubernetes. 