# ArtPartySocial Deployment Guide

This directory contains deployment configurations for ArtPartySocial with separate setups for local development and production deployment.

## Directory Structure

```
deployment/
├── local/                      # Local development configuration
│   ├── docker-compose.local.yml
│   ├── env.local.template
│   ├── nginx.local.conf
│   └── README.md
├── production/                 # Production deployment configuration
│   ├── docker-compose.prod.yml
│   ├── env.prod.template
│   ├── nginx.prod.conf
│   ├── init-db.sql
│   └── README.md
├── legacy/                     # Legacy deployment files (for reference)
│   ├── docker-compose.prod.yml (original)
│   ├── env.*.template files
│   └── deployment scripts
└── README.md                   # This file
```

## Quick Start

### For Local Development
```bash
cd deployment/local
cp env.local.template ../../backend/.env
docker-compose -f docker-compose.local.yml up -d
```

**Access:**
- Frontend: http://localhost
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### For Production Deployment
```bash
cd deployment/production
cp env.prod.template .env
# Edit .env with your production values
docker-compose -f docker-compose.prod.yml up -d
```

**Requirements:**
- Ubuntu server with Docker installed
- Domain name (recommended)
- SSL certificate
- Updated environment variables

## Configuration Overview

### Local Development Features
- **Hot reloading** for backend development
- **Debug mode** enabled with detailed logs
- **Exposed ports** for database and Redis debugging
- **Permissive CORS** settings for frontend development
- **API documentation** available at `/docs`

### Production Features
- **SSL/TLS termination** with nginx
- **Security headers** and rate limiting
- **Database and Redis** secured (no external ports)
- **Health checks** and auto-restart policies
- **Optimized performance** settings
- **Logging** and monitoring configuration

## Environment Variables

### Local Development
The local setup uses `env.local.template` with:
- Development database credentials
- Permissive CORS origins
- Debug mode enabled
- Extended rate limits

### Production
The production setup uses `env.prod.template` with:
- **MUST BE CONFIGURED** with your actual values
- Secure database passwords
- Your production domain(s) in CORS_ORIGINS
- Production-optimized settings

## Database Configuration

### Local
- **Database**: PostgreSQL (artparty_social_dev)
- **User/Pass**: postgres/dev_password
- **Port**: 5432 (exposed for development)

### Production
- **Database**: PostgreSQL (stellarcollab_prod)
- **User/Pass**: stellarcollab/[YOUR_SECURE_PASSWORD]
- **Port**: Internal only (not exposed)
- **Initialization**: Runs init-db.sql on first startup

## Networking

### Local Development
- Frontend: Port 80
- Backend: Port 8000
- Database: Port 5432 (exposed)
- Redis: Port 6379 (exposed)

### Production
- Frontend: Ports 80 (HTTP) and 443 (HTTPS)
- Backend: Internal only (accessed through nginx)
- Database: Internal only
- Redis: Internal only

## SSL/HTTPS

### Local Development
- HTTP only (no SSL needed)
- CORS headers for cross-origin requests

### Production
- **HTTPS required** for production
- Automatic HTTP to HTTPS redirect
- SSL certificate must be provided
- See production README for SSL setup

## Migrating from Old Setup

If you were using the old docker-compose.yml in the root directory:

1. **For Local Development:**
   ```bash
   # Stop old setup
   docker-compose down
   
   # Use new local setup
   cd deployment/local
   cp env.local.template ../../backend/.env
   docker-compose -f docker-compose.local.yml up -d
   ```

2. **For Production:**
   ```bash
   # Stop old setup
   docker-compose -f deployment/docker-compose.prod.yml down
   
   # Use new production setup
   cd deployment/production
   cp env.prod.template .env
   # Edit .env with your production values
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Choosing Your Setup

### Use Local Configuration When:
- Developing the application
- Testing new features
- Debugging issues
- Running on your local machine

### Use Production Configuration When:
- Deploying to a server
- Serving real users
- Need SSL/HTTPS
- Require production security and performance

## Common Commands

### Local Development
```bash
# Start services
docker-compose -f deployment/local/docker-compose.local.yml up -d

# View logs
docker-compose -f deployment/local/docker-compose.local.yml logs -f

# Stop services
docker-compose -f deployment/local/docker-compose.local.yml down

# Reset everything (including data)
docker-compose -f deployment/local/docker-compose.local.yml down -v
```

### Production
```bash
# Start services
docker-compose -f deployment/production/docker-compose.prod.yml up -d

# View logs
docker-compose -f deployment/production/docker-compose.prod.yml logs -f

# Stop services
docker-compose -f deployment/production/docker-compose.prod.yml down

# Update application
git pull && docker-compose -f deployment/production/docker-compose.prod.yml up -d --build
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure no other services are using the same ports
2. **Permission issues**: Ensure proper file permissions for SSL certificates
3. **CORS errors**: Check that your domain is in CORS_ORIGINS
4. **Database connection**: Verify database credentials and network connectivity

### Getting Help

1. Check the specific README in `local/` or `production/` directories
2. Review the logs: `docker-compose logs -f [service-name]`
3. Verify your environment variables are set correctly
4. Check that all required ports are available

## Security Notes

- **Never use local configuration in production**
- **Always change default passwords** in production
- **Use strong, unique secrets** for production
- **Keep SSL certificates updated**
- **Monitor logs** for security issues

## Performance Tips

- **Local**: Use the local setup for development only
- **Production**: Monitor resource usage and scale as needed
- **Database**: Regular backups and performance monitoring
- **Nginx**: Leverage caching and compression for better performance 