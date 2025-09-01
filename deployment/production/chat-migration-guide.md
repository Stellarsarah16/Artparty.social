# 🚀 Chat Features Migration Guide for Production

## 📋 Overview
This guide covers the deployment of chat and social features to production, including database migrations, safety checks, and rollback procedures.

## 🎯 Migration Details
- **Migration ID**: `25fd50d2f701`
- **Description**: Add chat and social features tables
- **Tables Created**: `chat_rooms`, `chat_room_participants`, `chat_messages`, `user_presence`, `activity_feed`
- **Dependencies**: Requires existing `users`, `canvases`, and `tiles` tables

## 🔒 Pre-Migration Safety Checks

### 1. Database Backup
```bash
# Create full database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_pre_chat_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file
ls -la backup_pre_chat_migration_*.sql
```

### 2. Verify Current Migration State
```bash
# Check current migration version
docker exec production-backend alembic current

# Check for pending migrations
docker exec production-backend alembic history --verbose
```

### 3. Check Database Health
```bash
# Check database connections
docker exec production-backend python -c "
from app.core.database import get_db
import asyncio
async def test():
    async for db in get_db():
        result = await db.execute('SELECT 1')
        print('✅ Database connection successful')
        break
asyncio.run(test())
"
```

## 🚀 Migration Execution

### Step 1: Deploy Code (No Migration)
```bash
# Deploy new code without running migrations
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# Verify services are healthy
docker-compose -f docker-compose.prod.yml ps
```

### Step 2: Run Migration
```bash
# Run the migration
docker exec production-backend python -m alembic upgrade head

# Verify migration completed
docker exec production-backend python -m alembic current
```

### Step 3: Verify Tables Created
```bash
# Check tables were created
docker exec production-backend python -c "
import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def verify():
    async for db in get_db():
        result = await db.execute(text('''
            SELECT table_name, column_count
            FROM (
                SELECT 
                    table_name,
                    COUNT(*) as column_count
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name IN (
                    'chat_rooms', 'chat_room_participants', 'chat_messages',
                    'user_presence', 'activity_feed'
                )
                GROUP BY table_name
            ) t
            ORDER BY table_name
        '''))
        tables = result.fetchall()
        for table in tables:
            print(f'✅ {table[0]}: {table[1]} columns')
        break

asyncio.run(verify())
"
```

## 🧪 Post-Migration Testing

### 1. Test Chat Room Creation
```bash
# Test that chat rooms are auto-created for existing canvases
docker exec production-backend python -c "
import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def test():
    async for db in get_db():
        result = await db.execute(text('''
            SELECT c.id, c.name, cr.id as room_id
            FROM canvases c
            LEFT JOIN chat_rooms cr ON c.id = cr.canvas_id AND cr.room_type = 'canvas'
            WHERE c.is_active = TRUE
            LIMIT 5
        '''))
        canvases = result.fetchall()
        for canvas in canvases:
            status = '✅ Has chat room' if canvas[2] else '❌ Missing chat room'
            print(f'Canvas {canvas[0]} ({canvas[1]}): {status}')
        break

asyncio.run(test())
"
```

### 2. Test API Endpoints
```bash
# Test chat endpoints are working
curl -H "Authorization: Bearer $AUTH_TOKEN" \
     "https://your-domain.com/api/v1/chat/canvas/1/messages?limit=1"

# Test presence endpoint
curl -X PUT \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"status": "online"}' \
     "https://your-domain.com/api/v1/chat/presence"
```

### 3. Test WebSocket Connection
```bash
# Check WebSocket stats
curl -H "Authorization: Bearer $AUTH_TOKEN" \
     "https://your-domain.com/api/v1/ws/stats"
```

## 🚨 Rollback Procedure

### If Migration Fails
```bash
# Rollback to previous migration
docker exec production-backend python -m alembic downgrade 20250809_backfill_canvas_defaults

# Restore from backup if needed
docker exec -i production-db psql -U $DB_USER -d $DB_NAME < backup_pre_chat_migration_TIMESTAMP.sql
```

### If Application Issues After Migration
```bash
# Quick rollback: revert to previous version
docker-compose -f docker-compose.prod.yml down
git checkout previous-stable-commit
docker-compose -f docker-compose.prod.yml up -d

# Database rollback
docker exec production-backend python -m alembic downgrade 20250809_backfill_canvas_defaults
```

## 📊 Monitoring After Deployment

### 1. Check Application Logs
```bash
# Monitor backend logs
docker logs production-backend --follow --tail 50

# Monitor frontend logs
docker logs production-frontend --follow --tail 50

# Monitor database logs
docker logs production-db --follow --tail 50
```

### 2. Monitor Performance
```bash
# Check database performance
docker exec production-backend python -c "
import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def check_performance():
    async for db in get_db():
        # Check table sizes
        result = await db.execute(text('''
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename LIKE 'chat_%' OR tablename = 'user_presence' OR tablename = 'activity_feed'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        '''))
        tables = result.fetchall()
        for table in tables:
            print(f'{table[1]}: {table[2]}')
        break

asyncio.run(check_performance())
"
```

### 3. Verify Chat Functionality
- ✅ Users can send messages
- ✅ Messages appear in real-time
- ✅ Presence updates work
- ✅ WebSocket connections are stable
- ✅ Chat history loads correctly

## 🔧 Production Environment Variables

Ensure these environment variables are set:
```env
# WebSocket Configuration
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_TIMEOUT=60
WEBSOCKET_MAX_CONNECTIONS=1000

# Chat Configuration
CHAT_MESSAGE_MAX_LENGTH=1000
CHAT_HISTORY_PAGE_SIZE=50
CHAT_PRESENCE_UPDATE_INTERVAL=30

# Database Performance
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=0
DB_POOL_TIMEOUT=30
```

## 📝 Success Criteria

Migration is successful when:
- ✅ All 5 chat tables are created
- ✅ All indexes are created
- ✅ Chat rooms exist for all active canvases
- ✅ API endpoints return 200 status codes
- ✅ WebSocket connections are stable
- ✅ Real-time chat works end-to-end
- ✅ No errors in application logs
- ✅ Database performance is acceptable

## 🆘 Emergency Contacts

If issues arise during migration:
1. **Immediate rollback** using procedures above
2. **Check monitoring dashboards** for system health
3. **Review application logs** for specific errors
4. **Contact development team** with specific error messages

## 📚 Related Documentation
- **Architecture Guide**: `docs/ARCHITECTURE-GUIDE.md`
- **WebSocket Implementation**: `docs/WEBSOCKET-IMPLEMENTATION-GUIDE.md`
- **Deployment Safety**: `deployment/DEPLOYMENT-RULES.md`
