# 🚨 **503/500 Error Debugging Checklist**

## 📋 **CRITICAL: Always Check Infrastructure First!**

**Based on today's experience, 503/500 errors are often infrastructure issues, NOT code problems.**

## 🔍 **Phase 1: Infrastructure Investigation (DO THIS FIRST!)**

### **1. Check Service Status**
```bash
# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Check all Docker containers (not just from current compose file)
docker ps -a

# Check for port conflicts
netstat -tlnp | grep :8000
ss -tlnp | grep :8000
```

### **2. Check Port Configuration**
```bash
# Verify backend port exposure
docker-compose -f docker-compose.prod.yml port backend 8000

# Expected output: 0.0.0.0:8000->8000/tcp
# If output is ":0" → Port NOT exposed (this was our problem!)
```

### **3. Check for Port Conflicts**
```bash
# Look for other compose files that might be running
find /opt/artparty-social -name "docker-compose*.yml" -exec ls -la {} \;

# Check if other services are using the same ports
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### **4. Check Network Connectivity**
```bash
# Test if backend is reachable from frontend container
docker exec -it frontend-container ping backend

# Check if backend is accessible on the expected port
curl -v http://localhost:8000/health
```

## 🔍 **Phase 2: Log Investigation (After Infrastructure)**

### **1. Check Backend Logs**
```bash
# Check backend container logs
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Look for:
# ✅ 200 responses (backend working)
# ❌ MissingGreenlet exceptions
# ❌ Database connection errors
# ❌ Port binding errors
```

### **2. Check Frontend/Proxy Logs**
```bash
# Check if nginx service exists
docker-compose -f docker-compose.prod.yml logs nginx

# Check frontend container logs
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend
```

### **3. Check Docker System Logs**
```bash
# Check Docker daemon logs
journalctl -u docker.service --since "1 hour ago"

# Look for port binding failures
```

## 🔍 **Phase 3: Code Investigation (Only After Infrastructure is Confirmed)**

### **1. Check Recent Code Changes**
- **Async/sync mismatches** in database operations
- **MissingGreenlet exceptions** in SQLAlchemy
- **Port configuration changes** in docker-compose files
- **Service dependency changes**

### **2. Check Database Connectivity**
```bash
# Test database connection from backend container
docker exec -it backend-container psql -h db -U username -d database

# Check database logs
docker-compose -f docker-compose.prod.yml logs --tail=50 db
```

### **3. Check Environment Variables**
```bash
# Verify environment variables in backend container
docker exec -it backend-container env | grep -E "(DATABASE_URL|REDIS_URL|SECRET_KEY)"
```

## 🚨 **Common Misdiagnosis Patterns (AVOID THESE!)**

### **❌ DON'T Assume These:**
1. **503 errors** → Backend code issues
2. **MissingGreenlet exceptions** → Async code problems  
3. **Timeout errors** → Performance issues
4. **500 errors** → Application crashes

### **✅ DO Assume These First:**
1. **Port conflicts** → Multiple services using same ports
2. **Missing port exposure** → Services not accessible externally
3. **Network connectivity** → Containers can't reach each other
4. **Service configuration** → Docker compose configuration issues

## 🎯 **Today's Specific Issues & Solutions**

### **Issue 1: Port 8000 Conflict**
- **Symptom**: `Bind for 0.0.0.0:8000 failed: port is already allocated`
- **Root Cause**: Development services running on port 8000
- **Solution**: Stop development services or use different port

### **Issue 2: Missing Port Exposure**
- **Symptom**: `docker-compose port backend 8000` returns `:0`
- **Root Cause**: No `ports` section in backend service
- **Solution**: Add `ports: - "8000:8000"` to backend service

### **Issue 3: Multiple Compose Files**
- **Symptom**: Multiple docker-compose files in different directories
- **Root Cause**: Development and production services conflicting
- **Solution**: Use different ports or stop conflicting services

## 🚀 **Immediate Action Plan for 503/500 Errors**

### **Step 1: Infrastructure Check (5 minutes)**
```bash
# Check service status and ports
docker-compose ps
docker-compose port backend 8000
netstat -tlnp | grep :8000
```

### **Step 2: Port Conflict Resolution (5 minutes)**
```bash
# If port conflict found
docker ps -a | grep 8000
# Stop conflicting service or change port
```

### **Step 3: Service Restart (5 minutes)**
```bash
# Restart services with proper configuration
docker-compose down
docker-compose up -d
```

### **Step 4: Verification (5 minutes)**
```bash
# Test endpoint accessibility
curl -v http://localhost:8000/health
# Check service logs
docker-compose logs --tail=20 backend
```

## 📋 **Prevention Checklist**

### **Before Deployment:**
- [ ] **Check for port conflicts** with existing services
- [ ] **Verify port exposure** in docker-compose files
- [ ] **Use different ports** for development vs production
- [ ] **Document port usage** clearly

### **After Configuration Changes:**
- [ ] **Test service accessibility** on expected ports
- [ ] **Verify network connectivity** between containers
- [ ] **Check service health** endpoints
- [ ] **Monitor logs** for errors

### **Regular Maintenance:**
- [ ] **Review running services** monthly
- [ ] **Check for unused containers** and remove them
- [ ] **Update port documentation** when changes made
- [ ] **Test service connectivity** after updates

## 🔗 **Related Documentation**

- **Async Database Migration**: `docs/fixes/ASYNC-DATABASE-MIGRATION-DEBUGGING-20250114.md`
- **Production Deployment**: `deployment/production/README.md`
- **Docker Compose**: `deployment/production/docker-compose.prod.yml`

## 📝 **Key Takeaways**

1. **Infrastructure-first debugging** saves hours of code investigation
2. **Port conflicts** are common and easily overlooked
3. **503 errors** often mean "can't reach service" not "service broken"
4. **Always check service status and ports** before diving into code
5. **Document port usage** to prevent future conflicts

---

**Created**: January 14, 2025  
**Based on**: Today's debugging session  
**Status**: Active debugging guide  
**Priority**: High - Prevents future debugging time waste
