# 🔒 Quick Tile Lock System Deployment

## 🚀 One-Command Deployment

```bash
# SSH to production server
ssh root@104.248.124.8

# Navigate to project
cd /opt/artparty-social/StellarCollabApp/deployment/production

# Run automated deployment script
./deploy-tile-lock-system.sh
```

## 📋 Manual Deployment Steps

If you prefer manual deployment:

### 1. Backup & Update
```bash
# Create backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Pull latest code
cd /opt/artparty-social/StellarCollabApp
git pull origin main
cd deployment/production
```

### 2. Database Migration
```bash
# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Run migration (or manual table creation)
docker-compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# If migration fails, create table manually:
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

### 3. Rebuild & Restart Services
```bash
# Backend
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d backend

# Frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

### 4. Verify Deployment
```bash
# Check services
docker-compose -f docker-compose.prod.yml ps

# Test health
curl -I https://artparty.social/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔍 Quick Testing

### Test Tile Locking
1. Open https://artparty.social
2. Login and click on a tile to edit
3. Open another browser/incognito window
4. Try to edit the same tile
5. Should see "tile is locked" message

### Test API Endpoints
```bash
# Test lock acquisition (replace YOUR_TOKEN)
curl -X POST "https://artparty.social/api/v1/tiles/1/lock" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚨 Rollback (if needed)
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore backup
cp .env.backup.* .env

# Revert code
cd /opt/artparty-social/StellarCollabApp
git reset --hard HEAD~1

# Restart
cd deployment/production
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring Commands

```bash
# View active locks
docker-compose -f docker-compose.prod.yml exec db psql -U artparty -d artparty_social_prod -c "
SELECT t.id as tile_id, u.username, tl.locked_at, tl.expires_at 
FROM tile_locks tl 
JOIN tiles t ON tl.tile_id = t.id 
JOIN users u ON tl.user_id = u.id 
WHERE tl.is_active = true;
"

# Check service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

---

**✅ Deployment completed when:**
- All services show "Up" status
- Health endpoint returns 200
- Tile locking works in browser
- No JavaScript errors in console 