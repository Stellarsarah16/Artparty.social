# 🔒 Environment File Setup for artparty.social

## Correct File Structure

```
deployment/production/
├── env.prod.template     ← Template file (committed to git)
├── .env                 ← Actual environment file (create on server, NOT committed to git)
├── docker-compose.prod.yml
└── nginx.prod.conf
```

## Step 1: Create Your .env File

**On your Digital Ocean server, in the deployment/production/ directory:**

```bash
# Copy the template to create your .env file
cp env.prod.template .env

# Edit the .env file with your actual values
nano .env
```

## Step 2: Update These Critical Values in .env

**You MUST change these values in your .env file:**

```env
# Database Configuration
POSTGRES_USER=stellarcollab
POSTGRES_DB=stellarcollab_prod
DB_PASSWORD=YOUR_SECURE_DATABASE_PASSWORD_HERE_32_CHARS_MIN

# Redis Configuration  
REDIS_PASSWORD=YOUR_SECURE_REDIS_PASSWORD_HERE_32_CHARS_MIN

# Security - MUST BE CHANGED FOR PRODUCTION!
SECRET_KEY=YOUR_RANDOM_64_CHARACTER_STRING_FOR_JWT_SIGNING_HERE

# CORS Configuration (already correct for artparty.social)
CORS_ORIGINS=["https://artparty.social","https://www.artparty.social"]
```

## Step 3: Generate Secure Passwords

### Generate Database Password (32+ characters):
```bash
# Option 1: Use openssl
openssl rand -base64 32

# Option 2: Use pwgen (if installed)
pwgen 32 1

# Option 3: Online generator (use a secure one)
```

### Generate Redis Password (32+ characters):
```bash
openssl rand -base64 32
```

### Generate JWT Secret Key (64+ characters):
```bash
openssl rand -base64 64
```

## Step 4: Example Complete .env File

```env
# Production Environment Variables for artparty.social
# CRITICAL: All passwords and secrets have been changed!

# Environment Configuration
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Database Configuration
POSTGRES_USER=stellarcollab
POSTGRES_DB=stellarcollab_prod
DB_PASSWORD=aB3dF8hK2mN7qP9sV4wX1yZ6cE5gI0jL8nR2tU7vY3

# Redis Configuration
REDIS_PASSWORD=xY9wV2sP5mK8hF1dG4jL7nQ0cE3rT6uI9oA2bN5zM8

# Security - CHANGED FOR PRODUCTION!
SECRET_KEY=kL8nM3qP6sV9yB2eH5jN8rU1wZ4cF7gI0oA3dG6kN9qT2vY5bE8hM1pS4uX7zA0dF3gJ6lO9rU2wY5

# HTTPS Security
HTTPS_ONLY=true
SECURE_COOKIES=true

# CORS Configuration - Set for artparty.social
CORS_ORIGINS=["https://artparty.social","https://www.artparty.social"]

# Server Configuration
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Application Settings
APP_NAME=StellarCollabApp
APP_VERSION=1.0.0

# Canvas Settings (Production optimized)
DEFAULT_CANVAS_WIDTH=100
DEFAULT_CANVAS_HEIGHT=100
TILE_SIZE=32
MAX_TILES_PER_USER=10

# Rate Limiting (production values)
RATE_LIMIT_PER_MINUTE=60
PAINT_RATE_LIMIT_PER_MINUTE=10
LIKE_RATE_LIMIT_PER_MINUTE=30

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Database Connection Pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30

# Monitoring & Logging
SENTRY_DSN=
ENABLE_METRICS=true

# SSL/TLS Configuration
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/certs/key.pem

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Performance Settings
WORKER_CONNECTIONS=1000
GZIP_COMPRESSION=true
STATIC_FILE_CACHING=true
```

## Important Notes

1. **File Naming**: Use `.env` (not `.env.prod` or other variations)
2. **Location**: Create this file on your server, NOT in your local development
3. **Security**: Never commit `.env` to git (it contains secrets!)
4. **Template**: Keep `env.prod.template` as a reference (this IS committed to git)

## Docker Compose Usage

Docker Compose automatically reads the `.env` file:

```bash
# This will use the .env file automatically
docker-compose -f docker-compose.prod.yml up -d
```

## Verification

After creating your `.env` file, verify it works:

```bash
# Check that Docker Compose can read the variables
docker-compose -f docker-compose.prod.yml config

# Start the services
docker-compose -f docker-compose.prod.yml up -d
```

---

**Remember: Create the `.env` file on your production server, not in your local development!** 🔒 