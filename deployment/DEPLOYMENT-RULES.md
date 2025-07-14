# 🚀 Deployment Rules & Best Practices

## 🔒 **CRITICAL: Environment File Protection**

### **Rule #1: NEVER commit .env files to git**
- ✅ **ALWAYS** use `.env.template` or `.env.example` files
- ✅ **ALWAYS** add all `.env` files to `.gitignore`
- ❌ **NEVER** commit actual `.env` files with secrets
- ❌ **NEVER** track production environment files in git

### **Rule #2: Production Environment Files are Sacred**
- Production `.env` files should be created **ONCE** on the server
- They should **NEVER** be overwritten by deployments
- Always backup production `.env` before any deployment
- Use environment-specific templates for different environments

## 📋 **Pre-Deployment Checklist**

### **MANDATORY Steps Before Every Deployment:**

1. **🔍 Environment File Check**
   ```bash
   # Check if any .env files are tracked
   git ls-files | grep -E "\.env$|\.env\."
   
   # Should return EMPTY - if not, remove them from git immediately
   ```

2. **📁 Review deployment/production/ folder**
   ```bash
   # Check all files in deployment/production/
   ls -la deployment/production/
   
   # Verify templates exist but not actual .env files
   ls -la deployment/production/ | grep -E "\.env"
   ```

3. **🔒 Secrets Verification**
   - Verify no hardcoded secrets in code
   - Check that all sensitive values use environment variables
   - Ensure database passwords aren't in plain text

4. **🧪 Local Testing Complete**
   - All features tested locally
   - Database migrations tested
   - Docker containers build successfully
   - Tests passing

5. **📦 Docker Image Validation**
   ```bash
   # Test production Docker build
   cd backend && docker build -f Dockerfile.prod -t app-test .
   
   # Test frontend production build
   cd frontend && docker build -f Dockerfile.prod -t frontend-test .
   ```

## 🛠️ **Deployment Process**

### **Step 1: Pre-Deployment Backup**
```bash
# On production server - backup current .env
cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)

# Backup database (if needed)
docker exec $(docker ps -q -f name=db) pg_dump -U artparty artparty_social_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **Step 2: Safe Git Pull**
```bash
# Pull latest changes
git pull origin main

# Verify no .env files were pulled
git diff --name-only HEAD~1 HEAD | grep -E "\.env$|\.env\."
# Should be empty - if not, STOP and investigate
```

### **Step 3: Environment File Verification**
```bash
# Verify production .env still exists and is intact
ls -la deployment/production/.env

# Compare with backup if needed
diff deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)
```

### **Step 4: Deployment Execution**
```bash
# Navigate to production deployment
cd deployment/production/

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Verify services are running
docker-compose -f docker-compose.prod.yml ps
```

## 🚨 **Emergency Recovery**

### **If .env file gets corrupted/overwritten:**
```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore from backup
cp deployment/production/.env.backup.YYYYMMDD_HHMMSS deployment/production/.env

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### **If deployment fails:**
```bash
# Roll back to previous version
git reset --hard HEAD~1

# Restore environment backup
cp deployment/production/.env.backup.YYYYMMDD_HHMMSS deployment/production/.env

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 **Security Best Practices**

### **Environment Variables Security:**
- Use strong, unique passwords (32+ characters)
- Rotate secrets regularly
- Use different secrets for different environments
- Never log environment variables

### **File Permissions:**
```bash
# Set proper permissions for .env files
chmod 600 deployment/production/.env
```

### **Git Security:**
```bash
# Check for accidentally committed secrets
git log --all --grep="password\|secret\|key" --oneline

# Use git-secrets tool (recommended)
git secrets --scan
```

## 📊 **Monitoring & Verification**

### **Post-Deployment Checks:**
1. **Health Check:** `curl https://artparty.social/health`
2. **API Check:** `curl https://artparty.social/api/v1/health`
3. **Database Connection:** Check container logs
4. **SSL Certificate:** Check expiry and validity
5. **CORS Configuration:** Test from frontend

### **Log Monitoring:**
```bash
# Check application logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Check database logs
docker-compose -f docker-compose.prod.yml logs -f db

# Check nginx logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## 🚫 **Common Mistakes to Avoid**

1. **❌ Committing .env files:** Always check `git status` before commit
2. **❌ Overwriting production .env:** Never copy local .env to production
3. **❌ Hardcoding secrets:** Always use environment variables
4. **❌ Skipping backups:** Always backup before deployment
5. **❌ Not testing locally:** Deploy only after thorough local testing
6. **❌ Ignoring logs:** Always check logs after deployment

## 📝 **Environment File Management**

### **File Structure:**
```
deployment/production/
├── .env                    # NEVER commit (actual production secrets)
├── .env.backup.YYYYMMDD    # Backups (NEVER commit)
├── env.prod.template       # Template (safe to commit)
└── ...
```

### **Template vs Actual:**
- **Templates:** Safe to commit, contain placeholder values
- **Actual .env:** NEVER commit, contain real secrets
- **Backups:** NEVER commit, for recovery only

## 🎯 **Quick Reference Commands**

```bash
# Check for tracked .env files
git ls-files | grep -E "\.env$"

# Backup production .env
cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)

# Safe deployment
cd deployment/production && docker-compose -f docker-compose.prod.yml up -d --build

# Check service health
curl -f https://artparty.social/health || echo "Health check failed"
```

---

## 🔄 **Follow This Process EVERY Time**

1. **Test locally** → 2. **Check .gitignore** → 3. **Backup production .env** → 4. **Deploy** → 5. **Verify** → 6. **Monitor**

**Remember: A stable production environment is more important than a quick deployment!** 