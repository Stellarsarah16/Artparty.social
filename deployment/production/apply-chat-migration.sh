#!/bin/bash

# 🚀 Production Chat Migration Script
# This script safely applies the chat features migration to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/var/backups/postgres"
CONTAINER_NAME="production-backend"
DB_CONTAINER="production-db"
MIGRATION_ID="25fd50d2f701"

echo -e "${BLUE}🚀 Starting Chat Features Migration to Production${NC}"
echo "=================================================="

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Step 1: Pre-migration checks
log "🔍 Running pre-migration checks..."

# Check if containers are running
if ! docker ps | grep -q $CONTAINER_NAME; then
    error "Backend container $CONTAINER_NAME is not running!"
    exit 1
fi

if ! docker ps | grep -q $DB_CONTAINER; then
    error "Database container $DB_CONTAINER is not running!"
    exit 1
fi

log "✅ Containers are running"

# Check current migration state
log "📋 Checking current migration state..."
CURRENT_MIGRATION=$(docker exec $CONTAINER_NAME python -m alembic current 2>/dev/null | grep -o '[a-f0-9]\{12\}' | head -1)
echo "Current migration: $CURRENT_MIGRATION"

# Check if migration already applied
if docker exec $CONTAINER_NAME python -m alembic history | grep -q $MIGRATION_ID; then
    if docker exec $CONTAINER_NAME python -m alembic current | grep -q $MIGRATION_ID; then
        warning "Migration $MIGRATION_ID already applied!"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Step 2: Create database backup
log "💾 Creating database backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_pre_chat_migration_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
docker exec $DB_CONTAINER mkdir -p $BACKUP_DIR

# Create backup
docker exec $DB_CONTAINER pg_dump -U postgres artparty_social > "/tmp/$BACKUP_FILE"

# Move backup to persistent storage
docker cp $DB_CONTAINER:/tmp/$BACKUP_FILE $BACKUP_DIR/

log "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE"

# Step 3: Test database connection
log "🔌 Testing database connection..."
if ! docker exec $CONTAINER_NAME python -c "
import asyncio
from app.core.database import get_db

async def test():
    async for db in get_db():
        await db.execute('SELECT 1')
        print('✅ Database connection successful')
        break

asyncio.run(test())
" 2>/dev/null; then
    error "Database connection failed!"
    exit 1
fi

# Step 4: Show migration preview
log "📋 Migration will create these tables:"
echo "  - chat_rooms (with canvas relationships)"
echo "  - chat_room_participants (user memberships)"
echo "  - chat_messages (message storage)"
echo "  - user_presence (real-time presence)"
echo "  - activity_feed (user activity tracking)"
echo ""
echo "Plus indexes and constraints for performance and data integrity."

# Confirmation prompt
warning "⚠️  This will modify the production database!"
read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Migration cancelled by user"
    exit 0
fi

# Step 5: Apply migration
log "🔄 Applying chat features migration..."
if docker exec $CONTAINER_NAME python -m alembic upgrade head; then
    log "✅ Migration applied successfully!"
else
    error "Migration failed!"
    echo ""
    warning "To rollback:"
    echo "docker exec $CONTAINER_NAME python -m alembic downgrade $CURRENT_MIGRATION"
    exit 1
fi

# Step 6: Verify migration
log "🧪 Verifying migration results..."

# Check tables were created
TABLES_CREATED=$(docker exec $CONTAINER_NAME python -c "
import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def verify():
    async for db in get_db():
        result = await db.execute(text('''
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('chat_rooms', 'chat_room_participants', 'chat_messages', 'user_presence', 'activity_feed')
        '''))
        count = result.scalar()
        print(count)
        break

asyncio.run(verify())
" 2>/dev/null)

if [ "$TABLES_CREATED" = "5" ]; then
    log "✅ All 5 chat tables created successfully"
else
    error "Expected 5 tables, found $TABLES_CREATED"
    exit 1
fi

# Check chat rooms were created for existing canvases
CHAT_ROOMS_CREATED=$(docker exec $CONTAINER_NAME python -c "
import asyncio
from app.core.database import get_db
from sqlalchemy import text

async def verify():
    async for db in get_db():
        result = await db.execute(text('''
            SELECT COUNT(*) 
            FROM chat_rooms 
            WHERE room_type = 'canvas'
        '''))
        count = result.scalar()
        print(count)
        break

asyncio.run(verify())
" 2>/dev/null)

log "✅ Created $CHAT_ROOMS_CREATED canvas chat rooms"

# Step 7: Test API endpoints
log "🧪 Testing chat API endpoints..."

# Get auth token for testing (you may need to adjust this)
AUTH_TOKEN=$(docker exec $CONTAINER_NAME python -c "
from app.core.security import create_access_token
token = create_access_token(data={'sub': 'admin', 'user_id': 1})
print(token)
" 2>/dev/null)

# Test chat messages endpoint
if curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        "http://localhost:8000/api/v1/chat/canvas/1/messages?limit=1" \
        | grep -q "messages"; then
    log "✅ Chat messages endpoint working"
else
    warning "⚠️  Chat messages endpoint may have issues"
fi

# Test presence endpoint
if curl -s -X PUT \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"status": "online"}' \
        "http://localhost:8000/api/v1/chat/presence" \
        | grep -q "status"; then
    log "✅ Presence endpoint working"
else
    warning "⚠️  Presence endpoint may have issues"
fi

# Step 8: Final verification
log "🎉 Migration completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Migration ID: $MIGRATION_ID"
echo "  - Tables created: 5"
echo "  - Chat rooms created: $CHAT_ROOMS_CREATED"
echo "  - Backup location: $BACKUP_DIR/$BACKUP_FILE"
echo ""
echo "🔍 Next steps:"
echo "  1. Monitor application logs for any issues"
echo "  2. Test chat functionality in the UI"
echo "  3. Verify WebSocket connections are working"
echo "  4. Check real-time messaging between users"
echo ""
log "🚀 Chat features are now live in production!"
