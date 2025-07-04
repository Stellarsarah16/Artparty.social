# StellarCollabApp - Local Production Testing Script for Windows
# This script tests the production Docker setup locally

Write-Host "Testing StellarCollabApp Production Setup Locally..." -ForegroundColor Green

# Check if Docker Desktop is running
Write-Host "Checking Docker..." -ForegroundColor Blue
try {
    docker --version | Out-Null
    docker info | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "Docker Desktop is not running or not installed" -ForegroundColor Red
    Write-Host "Please install and start Docker Desktop from https://docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Navigate to deployment directory
Set-Location deployment

# Create local test environment file
Write-Host "Creating local test configuration..." -ForegroundColor Blue

$envContent = @"
# Local Production Test Environment
DB_PASSWORD=test_password_123
SECRET_KEY=test_secret_key_for_local_testing_12345678901234567890
CORS_ORIGINS=["https://localhost","https://127.0.0.1"]
POSTGRES_DB=stellarcollab_prod
POSTGRES_USER=stellarcollab
DATABASE_URL=postgresql://stellarcollab:test_password_123@db:5432/stellarcollab_prod
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
"@

$envContent | Out-File -FilePath ".env.prod" -Encoding UTF8
Write-Host "Created .env.prod for local testing" -ForegroundColor Green

# Create SSL directory and certificates
Write-Host "Creating SSL certificates for local testing..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "ssl" | Out-Null

# Generate self-signed certificate for local testing
try {
    & openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=Test/L=Local/O=StellarCollabApp/CN=localhost" 2>$null
    Write-Host "SSL certificates created" -ForegroundColor Green
}
catch {
    Write-Host "OpenSSL not found, creating dummy certificate files" -ForegroundColor Yellow
    "dummy cert" | Out-File -FilePath "ssl/cert.pem" -Encoding UTF8
    "dummy key" | Out-File -FilePath "ssl/key.pem" -Encoding UTF8
}

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