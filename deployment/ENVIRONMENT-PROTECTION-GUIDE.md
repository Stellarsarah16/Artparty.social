# 🔐 Environment File Protection Guide

## 🚨 **THE PROBLEM WE'RE SOLVING**

**Issue:** Production `.env` files getting corrupted/overwritten during deployments, causing service outages.

**Root Cause:** Environment files not properly protected from git operations and deployment processes.

**Solution:** Implement strict environment file protection and deployment procedures.

## 🛡️ **IMMEDIATE PROTECTION STEPS**

### **Step 1: Check Current Git Status**
```bash
# Check if any .env files are currently tracked
git ls-files | grep -E "\.env$|\.env\."

# If ANY files are returned, IMMEDIATELY remove them:
git rm --cached <filename>
git commit -m "Remove .env files from git tracking"
```

### **Step 2: Verify .gitignore Protection**
Your `.gitignore` should now contain comprehensive protection. Verify it includes:
```gitignore
# Environment files (NEVER commit these)
.env
.env.*
*.env
!.env.template
!.env.example
!env.*.template

# Deployment environment files
deployment/production/.env
deployment/production/.env.*
```

### **Step 3: Secure Production .env File**
```bash
# On your production server, set proper permissions
chmod 600 deployment/production/.env

# Create a backup before any deployment
cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)
```

## 📋 **DEPLOYMENT WORKFLOW**

### **Before Every Deployment:**

1. **Run the Pre-Deployment Check:**
   ```bash
   chmod +x deployment/pre-deployment-check.sh
   ./deployment/pre-deployment-check.sh
   ```

2. **Manual Environment File Check:**
   ```bash
   # This should return NOTHING
   git status | grep -E "\.env$|\.env\."
   
   # This should return NOTHING
   git diff --cached --name-only | grep -E "\.env$|\.env\."
   ```

3. **Backup Production Environment:**
   ```bash
   # SSH to your production server
   ssh user@your-server
   
   # Navigate to project directory
   cd /path/to/your/project
   
   # Create backup
   cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)
   ```

### **During Deployment:**

1. **Safe Git Pull:**
   ```bash
   # On production server
   git pull origin main
   
   # VERIFY no .env files were affected
   git diff --name-only HEAD~1 HEAD | grep -E "\.env$|\.env\."
   # Should return NOTHING
   ```

2. **Environment File Verification:**
   ```bash
   # Check that your production .env still exists and is intact
   ls -la deployment/production/.env
   
   # Compare with backup to ensure no changes
   diff deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **Deploy Services:**
   ```bash
   cd deployment/production/
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

## 🔄 **ENVIRONMENT FILE LIFECYCLE**

### **Development Environment:**
```bash
# Create local environment from template
cp env.template .env.local

# Edit .env.local with your local settings
# NEVER commit this file
```

### **Production Environment:**
```bash
# On production server, create from template (ONE TIME ONLY)
cp deployment/production/env.prod.template deployment/production/.env

# Edit with production secrets
# NEVER commit this file
# NEVER overwrite this file during deployments
```

### **Template Management:**
```bash
# Templates are safe to commit and update
git add deployment/production/env.prod.template
git commit -m "Update production environment template"

# Actual .env files should NEVER be committed
```

## 🚨 **EMERGENCY RECOVERY**

### **If Production .env Gets Corrupted:**

1. **Stop Services:**
   ```bash
   docker-compose -f deployment/production/docker-compose.prod.yml down
   ```

2. **Restore from Backup:**
   ```bash
   # Find the latest backup
   ls -la deployment/production/.env.backup.*
   
   # Restore from backup
   cp deployment/production/.env.backup.YYYYMMDD_HHMMSS deployment/production/.env
   ```

3. **Restart Services:**
   ```bash
   docker-compose -f deployment/production/docker-compose.prod.yml up -d
   ```

### **If .env File Gets Committed to Git:**

1. **Remove from Git History:**
   ```bash
   # Remove from current commit
   git rm --cached deployment/production/.env
   
   # If it's in history, use git filter-branch (DANGEROUS)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch deployment/production/.env' \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Force Push (if necessary):**
   ```bash
   # WARNING: Only do this if you're sure
   git push origin main --force
   ```

3. **Rotate All Secrets:**
   ```bash
   # Change all passwords, keys, and secrets in the exposed file
   # Update production .env with new secrets
   # Update any external services that use these secrets
   ```

## 📊 **MONITORING & VERIFICATION**

### **Regular Checks:**
```bash
# Weekly check for accidentally tracked files
git ls-files | grep -E "\.env$|\.env\." | mail -s "Alert: .env files tracked" admin@yoursite.com

# Production file integrity check
ls -la deployment/production/.env && echo "Production .env exists"
```

### **Automated Monitoring:**
```bash
# Add to cron job (daily)
0 2 * * * /path/to/project/deployment/pre-deployment-check.sh | mail -s "Daily Security Check" admin@yoursite.com
```

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

1. **"Permission denied" when accessing .env**
   ```bash
   # Fix permissions
   chmod 600 deployment/production/.env
   chown www-data:www-data deployment/production/.env
   ```

2. **Docker can't read .env file**
   ```bash
   # Verify file exists and is readable
   ls -la deployment/production/.env
   
   # Check Docker Compose syntax
   docker-compose -f deployment/production/docker-compose.prod.yml config
   ```

3. **Service fails to start after deployment**
   ```bash
   # Check logs
   docker-compose -f deployment/production/docker-compose.prod.yml logs
   
   # Verify environment variables are loaded
   docker-compose -f deployment/production/docker-compose.prod.yml exec backend env | grep -E "DATABASE_URL|SECRET_KEY"
   ```

## 🎯 **QUICK REFERENCE**

### **Commands to Run Before Every Deployment:**
```bash
# 1. Check for tracked .env files
git ls-files | grep -E "\.env$"

# 2. Run pre-deployment check
./deployment/pre-deployment-check.sh

# 3. Backup production .env
cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)

# 4. Deploy
cd deployment/production && docker-compose -f docker-compose.prod.yml up -d --build
```

### **Emergency Commands:**
```bash
# Stop all services
docker-compose -f deployment/production/docker-compose.prod.yml down

# Restore from backup
cp deployment/production/.env.backup.YYYYMMDD_HHMMSS deployment/production/.env

# Restart services
docker-compose -f deployment/production/docker-compose.prod.yml up -d
```

## 📝 **DEPLOYMENT CHECKLIST**

- [ ] No .env files tracked in git
- [ ] Production .env backed up
- [ ] Pre-deployment check passed
- [ ] Local testing complete
- [ ] Docker images build successfully
- [ ] All services start without errors
- [ ] Health checks pass
- [ ] Logs show no errors
- [ ] SSL certificate valid
- [ ] Database connection working

---

## 🔒 **REMEMBER: Your production environment is precious!**

**Never sacrifice security for speed. A stable production environment is worth more than a fast deployment.** 