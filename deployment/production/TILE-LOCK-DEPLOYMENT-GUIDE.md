# 🔒 Tile Lock System - Production Deployment Guide

## 📋 Overview
This guide covers deploying the new tile locking system that prevents concurrent editing of tiles. The system includes:
- New `tile_locks` database table
- Backend API endpoints for lock management
- Frontend integration with lock acquisition/release
- Database migration requirements

## 🚨 Critical Changes
- **Database Schema**: New `tile_locks` table
- **API Endpoints**: New tile lock management endpoints
- **Frontend**: Updated tile editor with lock management
- **Collaboration Modes**: Enhanced permission system

## 📦 Pre-Deployment Checklist

### 1. Database Migration Required ✅
```bash
# The tile_locks table needs to be created
# This requires running Alembic migrations on the production database
```

### 2. Code Changes Summary
- **Backend**: New models, repositories, services, and API endpoints
- **Frontend**: Updated tile editor manager with lock handling
- **Database**: New `tile_locks` table schema

## 🚀 Deployment Steps

### Step 1: Backup Current Production
```bash
# SSH into your production server
ssh root@104.248.124.8

# Navigate to project directory
cd /opt/artparty-social/StellarCollabApp

# Create timestamped backup
cp deployment/production/.env deployment/production/.env.backup.$(date +%Y%m%d_%H%M%S)

# Backup current database (optional but recommended)
docker-compose -f deployment/production/docker-compose.prod.yml exec db pg_dump -U artparty artparty_social_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Pull Latest Code
```bash
# Pull the latest changes
git pull origin main

# Verify the new files are present
ls backend/app/models/tile_lock.py
ls backend/app/repositories/tile_lock.py
ls backend/app/api/v1/tile_locks.py
```

### Step 3: Database Migration
```bash
# Navigate to production directory
cd deployment/production

# Stop the backend service
docker-compose -f docker-compose.prod.yml stop backend

# Run database migration
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# If the above doesn't work, you may need to run it manually:
docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c "
CREATE TABLE IF NOT EXISTS tile_locks (
    id SERIAL PRIMARY KEY,
    tile_id INTEGER NOT NULL UNIQUE REFERENCES tiles(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);
"
```

### Step 4: Rebuild and Restart Backend
```bash
# Rebuild backend with new code
docker-compose -f docker-compose.prod.yml build --no-cache backend

# Start backend service
docker-compose -f docker-compose.prod.yml up -d backend

# Check backend logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Step 5: Rebuild and Restart Frontend
```bash
# Rebuild frontend with new code
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# Restart frontend service
docker-compose -f docker-compose.prod.yml up -d frontend

# Check frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Step 6: Verify Deployment
```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Test the new API endpoints
curl -X GET "https://artparty.social/api/v1/tiles/1/lock" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test the health endpoint
curl -I https://artparty.social/health
```

## 🔍 Post-Deployment Testing

### 1. Test Tile Locking
```bash
# Test acquiring a lock
curl -X POST "https://artparty.social/api/v1/tiles/1/lock" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Test extending a lock
curl -X PUT "https://artparty.social/api/v1/tiles/1/lock" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test releasing a lock
curl -X DELETE "https://artparty.social/api/v1/tiles/1/lock" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test Frontend Integration
1. Open https://artparty.social in browser
2. Login and navigate to a canvas
3. Click on a tile to edit it
4. Verify lock is acquired (check browser console)
5. Try to edit the same tile from another browser/incognito window
6. Verify the second user gets a "tile is locked" message

### 3. Test Collaboration Modes
1. Create a canvas with "free" collaboration mode
2. Verify any user can edit any tile (with locking)
3. Create a canvas with "tile-lock" collaboration mode
4. Verify only tile creators can edit their tiles

## 🚨 Rollback Plan

If issues occur, rollback immediately:

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore backup environment
cp deployment/production/.env.backup.* deployment/production/.env

# Revert to previous git commit
git reset --hard HEAD~1

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### Check Lock Status
```bash
# View active locks in database
docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c "
SELECT t.id as tile_id, u.username, tl.locked_at, tl.expires_at 
FROM tile_locks tl 
JOIN tiles t ON tl.tile_id = t.id 
JOIN users u ON tl.user_id = u.id 
WHERE tl.is_active = true;
"
```

### Monitor Logs
```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# Database logs
docker-compose -f docker-compose.prod.yml logs -f db
```

## 🔧 Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check if table already exists
   docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c "\dt tile_locks"
   
   # If it exists, skip migration
   # If it doesn't exist, run manual creation
   ```

2. **Backend Won't Start**
   ```bash
   # Check logs for specific errors
   docker-compose -f docker-compose.prod.yml logs backend
   
   # Verify environment variables
   docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
   ```

3. **Frontend Lock Issues**
   ```bash
   # Check browser console for JavaScript errors
   # Verify API endpoints are accessible
   curl -I https://artparty.social/api/v1/tiles/1/lock
   ```

## ✅ Success Criteria

- [ ] Database migration completed successfully
- [ ] Backend starts without errors
- [ ] Frontend loads without JavaScript errors
- [ ] Tile locking works in browser
- [ ] Collaboration modes work correctly
- [ ] No 403 errors for valid tile edits
- [ ] Concurrent editing is prevented

## 📞 Support

If deployment fails:
1. Check logs immediately
2. Follow rollback plan if needed
3. Review this guide for missed steps
4. Contact development team with error details

---

**Deployment completed successfully! 🎉**

The tile locking system is now live and preventing concurrent editing while maintaining proper collaboration mode permissions. 