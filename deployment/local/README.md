# ArtPartySocial Local Development

This directory contains configuration files for local development of ArtPartySocial.

## Quick Start

1. **Copy environment file:**
   ```bash
   cp env.local.template ../../backend/.env
   ```

2. **Edit the environment file:**
   - Open `../../backend/.env` 
   - Modify any settings as needed for your local setup
   - The defaults should work for most development scenarios

3. **Start the application:**
   ```bash
   # From the deployment/local directory
   docker-compose -f docker-compose.local.yml up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Database: localhost:5432 (postgres/dev_password)
   - Redis: localhost:6379

## Configuration Files

### docker-compose.local.yml
- Local development Docker Compose configuration
- Includes hot-reloading for backend development
- Exposes database and Redis ports for debugging
- Uses development-friendly settings

### env.local.template
- Environment variables template for local development
- Includes permissive CORS settings
- Uses development database credentials
- Enables debug mode and API documentation

### nginx.local.conf
- Local nginx configuration
- Proxies API requests to backend
- Serves static frontend files
- Includes CORS headers for development

## Development Features

- **Hot Reloading**: Backend automatically reloads on code changes
- **Debug Mode**: Detailed error messages and logging
- **API Documentation**: Available at /docs and /redoc
- **Database Access**: PostgreSQL accessible on port 5432
- **Redis Access**: Redis accessible on port 6379 for debugging

## Stopping the Application

```bash
docker-compose -f docker-compose.local.yml down
```

## Viewing Logs

```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f backend
```

## Database Management

```bash
# Access PostgreSQL
docker-compose -f docker-compose.local.yml exec db psql -U postgres -d artparty_social_dev

# Reset database
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
``` 