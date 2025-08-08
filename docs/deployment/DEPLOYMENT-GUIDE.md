# 🚀 Artparty.social Deployment Guide

## Best Practices for GitHub → DigitalOcean Deployment

This guide explains how to handle IP addresses and environment configuration when deploying from GitHub to DigitalOcean.

---

## 🔧 The IP Address Challenge

### Problem
When you develop locally, your app uses `localhost:8000`. When you deploy to DigitalOcean, it needs to use your server's IP or domain. **We've solved this automatically!**

### Solution: Dynamic Configuration
The frontend now automatically detects its environment:
- **Local Development**: `http://localhost:8000`
- **Production**: Uses your server's actual domain/IP

---

## 🛠️ Setup Process

### 1. **Local Development** 
```bash
# Works as before
docker-compose up --build
# Frontend: http://localhost
# Backend: http://localhost:8000
```

### 2. **Production Deployment**

#### Option A: Automated Deployment (Recommended)
```bash
# On your DigitalOcean server
git clone https://github.com/yourusername/Artparty.social.git
cd Artparty.social
chmod +x deployment/deploy-digitalocean.sh
./deployment/deploy-digitalocean.sh
```

The script will ask for:
- Your domain/IP address
- Database password
- Secret key (or generate one)
- HTTPS preference

#### Option B: Manual Deployment
```bash
# 1. Clone repository
git clone https://github.com/yourusername/Artparty.social.git
cd Artparty.social

# 2. Copy and edit environment file
cp deployment/env.production.template deployment/.env
nano deployment/.env

# 3. Update these values:
# - Replace "your-domain.com" with your actual domain/IP
# - Set a strong database password
# - Set a secret key for JWT
# - Configure CORS origins

# 4. Deploy
docker-compose -f deployment/docker-compose.prod.yml up -d --build
```

---

## 🔄 Update Process (After GitHub Push)

### Automated Update
```bash
# On your DigitalOcean server
cd Artparty.social
./deployment/update-from-github.sh
```

### Manual Update
```bash
# On your DigitalOcean server
cd Artparty.social
git pull origin main
docker-compose -f deployment/docker-compose.prod.yml up -d --build
```

---

## 🌐 Environment Configuration

### Frontend (Automatic)
The frontend automatically configures itself based on the URL:

```javascript
// Local development
if (window.location.hostname === 'localhost') {
    API_BASE_URL = 'http://localhost:8000'
}

// Production
else {
    API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`
}
```

### Backend (Environment Variables)
The backend uses environment variables for configuration:

```env
# Production .env file
DATABASE_URL=postgresql://stellarcollab:password@db:5432/stellarcollab_prod
CORS_ORIGINS=["https://your-domain.com", "https://www.your-domain.com"]
SECRET_KEY=your-secret-key
DEBUG=false
ENVIRONMENT=production
```

---

## 🏗️ Architecture Overview

```
GitHub Repository
        ↓
    git push
        ↓
DigitalOcean Server
        ↓
./deployment/update-from-github.sh
        ↓
┌─────────────────────────────────────┐
│            Docker Compose          │
├─────────────────────────────────────┤
│  Frontend (Nginx)  │  Backend (Python) │
│  Port: 80/443     │  Port: 8000        │
├─────────────────────────────────────┤
│  Database (PostgreSQL)  │  Redis    │
│  Port: 5432            │  Port: 6379 │
└─────────────────────────────────────┘
```

---

## 📝 Configuration Examples

### Development (.env)
```env
# No .env file needed for development
# Uses docker-compose.yml defaults
```

### Production (.env)
```env
# Database
DATABASE_URL=postgresql://stellarcollab:mypassword@db:5432/stellarcollab_prod
DB_PASSWORD=mypassword

# Security
SECRET_KEY=your-super-secret-key-here
DEBUG=false
ENVIRONMENT=production

# CORS (replace with your domain)
CORS_ORIGINS=["https://mydomain.com", "https://www.mydomain.com"]

# Redis
REDIS_URL=redis://redis:6379/0
```

---

## 🔒 Security Considerations

### Production Checklist
- [ ] Strong database password
- [ ] Strong Redis password
- [ ] Unique secret key (32+ characters)
- [ ] HTTPS enabled
- [ ] CORS origins restricted to your domain
- [ ] Debug mode disabled
- [ ] Redis not exposed externally (no port 6379 mapping)
- [ ] Regular backups scheduled

### 🚨 Critical Security Fix: Redis Exposure

**IMPORTANT**: Previous versions exposed Redis to the internet, which is a major security vulnerability. We've fixed this automatically, but you should verify:

```bash
# Check if your deployment is secure
chmod +x deployment/check-security.sh
./deployment/check-security.sh
```

#### What We Fixed:
- ❌ **Before**: Redis exposed on port 6379 (vulnerable)
- ✅ **After**: Redis only accessible internally with authentication

### Environment Variables
Never commit sensitive data to GitHub:
```bash
# ❌ Don't do this
git add .env

# ✅ Do this instead
git add .env.template
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **CORS Errors**
```
Access to fetch at 'https://your-domain.com/api/...' from origin 'https://your-domain.com' has been blocked by CORS policy
```

**Solution**: Update CORS_ORIGINS in your `.env` file:
```env
CORS_ORIGINS=["https://your-domain.com", "https://www.your-domain.com"]
```

#### 2. **API Connection Failed**
**Check**: Is your backend running?
```bash
docker-compose -f deployment/docker-compose.prod.yml ps
```

**Check**: Are the logs showing errors?
```bash
docker-compose -f deployment/docker-compose.prod.yml logs backend
```

#### 3. **Database Connection Error**
**Check**: Database credentials in `.env`
```bash
docker-compose -f deployment/docker-compose.prod.yml logs db
```

### Useful Commands

```bash
# View all container status
docker-compose -f deployment/docker-compose.prod.yml ps

# View logs
docker-compose -f deployment/docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f deployment/docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f deployment/docker-compose.prod.yml down

# Start all services
docker-compose -f deployment/docker-compose.prod.yml up -d
```

---

## 🎯 Quick Reference

### Local Development
```bash
docker-compose up --build
# → http://localhost (frontend)
# → http://localhost:8000 (backend)
```

### Production Deployment
```bash
./deployment/deploy-digitalocean.sh
# → https://your-domain.com (full app)
```

### Update After GitHub Push
```bash
./deployment/update-from-github.sh
# → Updated app with latest changes
```

---

## 📚 Additional Resources

- [DigitalOcean Docker Guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-20-04)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/docker/)

---

## 💡 Pro Tips

1. **Use a domain**: It's easier than remembering IP addresses
2. **Set up HTTPS**: Use Let's Encrypt for free SSL certificates
3. **Monitor logs**: Regular log checking prevents issues
4. **Backup regularly**: Database and uploaded files
5. **Test locally first**: Always test changes before deploying

**That's it!** Your IP address and environment configuration will now automatically adapt to your deployment environment. 🎉 