# 🧪 Local Production Testing Guide

Test the production Docker setup locally on Windows before deploying to a real server.

## Prerequisites

1. **Docker Desktop** - Install from [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)
2. **PowerShell** - Available by default on Windows

## Quick Start

### Option 1: Automated Testing Script

1. Open PowerShell as Administrator
2. Navigate to the project directory:
   ```powershell
   cd "F:\DevFolder\PythonProjects\webApplications\StellarCollabApp"
   ```

3. Run the test script:
   ```powershell
   .\test-local-production.ps1
   ```

### Option 2: Manual Testing

1. **Start Docker Desktop** and ensure it's running

2. **Navigate to deployment directory:**
   ```powershell
   cd deployment
   ```

3. **Create local environment file:**
   ```powershell
   Copy-Item env.production.template .env.prod
   ```

4. **Edit `.env.prod`** with test values:
   ```bash
   DB_PASSWORD=test_password_123
   SECRET_KEY=test_secret_key_for_local_testing_12345678901234567890
   POSTGRES_DB=stellarcollab_prod
   POSTGRES_USER=stellarcollab
   DATABASE_URL=postgresql://stellarcollab:test_password_123@db:5432/stellarcollab_prod
   ```

5. **Create required directories:**
   ```powershell
   New-Item -ItemType Directory -Force -Path "ssl", "uploads", "logs"
   ```

6. **Build and start services:**
   ```powershell
   docker compose -f docker-compose.prod.yml down --remove-orphans
   docker compose -f docker-compose.prod.yml build --no-cache
   docker compose -f docker-compose.prod.yml up -d
   ```

7. **Wait for services to start** (30-60 seconds)

8. **Test the application:**
   - Frontend: http://localhost
   - API Health: http://localhost:8000/health
   - API Docs: http://localhost:8000/docs

## Testing Checklist

✅ **Docker Status**
```powershell
docker compose -f docker-compose.prod.yml ps
```

✅ **Backend Health**
```powershell
curl http://localhost:8000/health
```

✅ **Frontend Access**
```powershell
curl -I http://localhost
```

✅ **Database Connection**
```powershell
docker compose -f docker-compose.prod.yml exec db psql -U stellarcollab -d stellarcollab_prod -c "SELECT version();"
```

✅ **Redis Connection**
```powershell
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## Expected Results

### Healthy Services
```
NAME                STATUS          PORTS
deployment-app-1    Up              0.0.0.0:8000->8000/tcp
deployment-db-1     Up              5432/tcp
deployment-nginx-1  Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
deployment-redis-1  Up              6379/tcp
```

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Frontend Response
```
HTTP/1.1 200 OK
Content-Type: text/html
```

## Troubleshooting

### Common Issues

**Docker not running:**
```
❌ Docker Desktop is not running or not installed
```
**Solution:** Start Docker Desktop

**Port conflicts:**
```
❌ Port 80 is already in use
```
**Solution:** Stop other services on port 80 or change ports in docker-compose.prod.yml

**Database connection errors:**
```
❌ Connection to database failed
```
**Solution:** Check database credentials in .env.prod

### View Logs
```powershell
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs app
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs db
```

### Clean Restart
```powershell
docker compose -f docker-compose.prod.yml down --volumes
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Next Steps

Once local testing is successful:

1. ✅ **All services running**
2. ✅ **Health checks passing**
3. ✅ **Frontend accessible**
4. ✅ **API responding**

You're ready to deploy to a real server! 🚀

## Cleanup

When done testing:
```powershell
docker compose -f docker-compose.prod.yml down --volumes
docker system prune -f
``` 