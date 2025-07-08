# ArtPartySocial - Local Production Testing Script for Windows

# Test locally before deploying to production
Write-Host "Testing ArtPartySocial Production Setup Locally..." -ForegroundColor Green

# Clean up any existing containers
Write-Host "Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down -v 2>$null
docker system prune -f >$null 2>&1

# Create production-like environment file
Write-Host "Creating production test environment..." -ForegroundColor Yellow
@"
# Production test environment
ENVIRONMENT=production
DEBUG=false

# Database
DATABASE_URL=postgresql://artparty:test_password_123@db:5432/artparty_social_prod
POSTGRES_SERVER=db
POSTGRES_USER=artparty
POSTGRES_DB=artparty_social_prod
POSTGRES_PASSWORD=test_password_123

# App
APP_NAME=ArtPartySocial
APP_VERSION=1.0.0

# Security
SECRET_KEY=test-secret-key-for-local-testing-only-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=test_redis_password

# Rate limiting
RATE_LIMIT_PER_MINUTE=100
PAINT_RATE_LIMIT_PER_MINUTE=20

# CORS - Allow local testing
CORS_ORIGINS=["http://localhost","http://127.0.0.1","http://localhost:80","http://127.0.0.1:80"]
"@ | Out-File -FilePath ".env" -Encoding UTF8

# Create SSL certificates for HTTPS testing
Write-Host "Creating SSL certificates for HTTPS testing..." -ForegroundColor Yellow
if (-not (Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl" >$null
}
& openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=Test/L=Local/O=ArtPartySocial/CN=localhost" 2>$null

# Navigate to deployment directory
Set-Location deployment

# Create other required directories
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

Write-Host "Starting local production test..." -ForegroundColor Blue

# Build and start services
docker compose -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "Checking service status..." -ForegroundColor Blue
docker compose -f docker-compose.prod.yml ps

Write-Host "`nLocal Production Test Results:" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Test health endpoint
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -SkipCertificateCheck
    if ($healthResponse.status -eq "healthy") {
        Write-Host "Backend health check: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Backend health check: FAILED" -ForegroundColor Red
    }
}
catch {
    Write-Host "Backend health check: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost" -Method Head -SkipCertificateCheck
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "Frontend access: PASSED" -ForegroundColor Green
    } else {
        Write-Host "Frontend access: FAILED" -ForegroundColor Red
    }
}
catch {
    Write-Host "Frontend access: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest Summary:" -ForegroundColor Blue
Write-Host "* Frontend: http://localhost" -ForegroundColor White
Write-Host "* API: http://localhost/api" -ForegroundColor White
Write-Host "* Health: http://localhost:8000/health" -ForegroundColor White

Write-Host "`nUseful Commands:" -ForegroundColor Yellow
Write-Host "* View logs: docker compose -f docker-compose.prod.yml logs" -ForegroundColor White
Write-Host "* Stop services: docker compose -f docker-compose.prod.yml down" -ForegroundColor White
Write-Host "* Restart: docker compose -f docker-compose.prod.yml restart" -ForegroundColor White

Write-Host "`nLocal production test completed!" -ForegroundColor Green
Write-Host "If everything looks good, you are ready to deploy to a real server!" -ForegroundColor Cyan 