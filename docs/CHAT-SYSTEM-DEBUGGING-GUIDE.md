# 🐛 Chat System Debugging Guide

## 🚨 Current Issue (2025-08-29)

### **Problem Summary**
SQLAlchemy is generating queries with **old column names** that don't exist in the database, despite having **correct model definitions**.

### **Specific Errors**
```
ERROR: column chat_messages.tile_x does not exist
ERROR: column user_presence.is_online does not exist
ERROR: 'coroutine' object is not iterable (FIXED)
```

### **Error Analysis**
- **Models are CORRECT**: Verified with `docker-compose exec backend python -c "from app.models.chat import ChatMessage; print([c.name for c in ChatMessage.__table__.columns])"`
- **Database schema is CORRECT**: Migration applied successfully
- **Query generation is WRONG**: SQLAlchemy generating SELECT statements with old field names

### **Current Model Columns**
**ChatMessage**: `['id', 'room_id', 'sender_id', 'message_text', 'message_type', 'mentioned_tile_id', 'mentioned_canvas_id', 'mentioned_user_id', 'created_at', 'updated_at', 'edited_at', 'is_deleted']`

**UserPresence**: `['id', 'user_id', 'canvas_id', 'status', 'current_tile_x', 'current_tile_y', 'is_editing_tile', 'last_activity', 'session_id']`

### **Wrong Columns Being Queried**
- `tile_x`, `tile_y` → should be `mentioned_tile_id`, `mentioned_canvas_id`
- `parent_message_id` → doesn't exist (removed for Phase 1 simplicity)
- `is_edited` → should be `edited_at`
- `is_online`, `is_typing` → should be `status`

## 🔍 Debugging Steps for Tomorrow

### **Step 1: Clear All Python Cache**
```bash
# Clear Python bytecode cache
docker-compose exec backend find /app -name "*.pyc" -delete
docker-compose exec backend find /app -name "__pycache__" -type d -exec rm -rf {} +

# Force complete container rebuild
docker-compose down backend
docker-compose build --no-cache backend
docker-compose up -d backend
```

### **Step 2: Check for Hidden Model Definitions**
```bash
# Search for any old model definitions
grep -r "tile_x\|tile_y\|is_online\|is_typing\|parent_message_id\|is_edited" backend/
```

### **Step 3: Verify SQLAlchemy Metadata**
```bash
# Check if SQLAlchemy metadata is corrupted
docker-compose exec backend python -c "
from app.models.chat import ChatMessage, UserPresence
from app.core.database import Base
print('ChatMessage table:', ChatMessage.__table__)
print('UserPresence table:', UserPresence.__table__)
print('Base metadata tables:', list(Base.metadata.tables.keys()))
"
```

### **Step 4: Check Schema Definitions**
- Review `backend/app/schemas/chat.py` for any old field references
- Ensure Pydantic schemas match SQLAlchemy models exactly
- Look for `tile_x`/`tile_y` in WebSocket schemas that might be causing confusion

### **Step 5: Trace Query Generation**
- Add debug logging to see exactly where the wrong queries are generated
- Check if there are any direct SQL queries instead of ORM queries
- Verify all imports are using the correct model definitions

## 📋 Implementation Status

### ✅ **Completed Components**
- **Database Schema**: `tasks/chat-database-migration.sql` applied successfully
- **Backend Models**: `ChatRoom`, `ChatMessage`, `UserPresence`, `DMParticipant` with correct columns
- **API Structure**: REST endpoints in `backend/app/api/v1/chat.py`
- **Frontend Managers**: `ChatManager`, `PresenceManager` following Manager Pattern
- **UI Styling**: Responsive chat sidebar in `frontend/css/styles.css`
- **WebSocket Integration**: Extended existing system for chat messages

### 🔄 **In Progress**
- **SQLAlchemy Query Issues**: Column name mismatch debugging
- **Error Handling**: API error responses and user feedback
- **Testing**: End-to-end chat functionality verification

### 📋 **Pending**
- **Documentation**: Phase 1 implementation guide
- **Testing**: Multi-user chat room functionality
- **Performance**: Optimization for high user count scenarios

## 🛠️ Quick Fixes to Try

### **Fix 1: Force Model Reload**
```python
# In backend startup, force model table recreation
from app.core.database import Base, engine
Base.metadata.drop_all(bind=engine)  # DANGER: Only for dev!
Base.metadata.create_all(bind=engine)
```

### **Fix 2: Check Import Order**
- Ensure `backend/app/models/__init__.py` imports are correct
- Verify no circular imports or old cached imports
- Check if any code is importing old model versions

### **Fix 3: Schema Alignment**
- Update `backend/app/schemas/chat.py` to match exact model columns
- Remove any references to `tile_x`, `tile_y`, `is_online`, `is_typing`
- Ensure WebSocket schemas use correct field names

### **Fix 4: API Query Review**
- Check all SQLAlchemy queries in `backend/app/api/v1/chat.py`
- Ensure all `select()` statements use correct model attributes
- Verify no raw SQL queries with old column names

## 📚 Architecture Context

### **Manager Pattern Integration**
- `ChatManager`: Handles chat UI, message sending, room management
- `PresenceManager`: Tracks user activity, tile editing status, online presence
- `WebSocketManager`: Real-time communication, message broadcasting
- `CanvasInteractionManager`: Tile mention integration (highlight overlay disabled)

### **Event System Usage**
- Uses `window.eventManager.on()` and `window.eventManager.emit()`
- Cross-manager communication via events
- WebSocket messages trigger events for UI updates

### **API Integration**
- Frontend uses `window.API.chat.*` methods
- All endpoints prefixed with `/api/v1/chat/`
- Authentication via JWT tokens in headers

## 🎯 Success Criteria

### **Phase 1 Complete When:**
- ✅ Users can see canvas-specific chat rooms
- ✅ Real-time message sending and receiving works
- ✅ User presence shows who's online and editing tiles
- ✅ Responsive chat sidebar functions on desktop
- ✅ No JavaScript or backend errors
- ✅ WebSocket connections stable and performant

### **Ready for Phase 2 When:**
- Phase 1 fully functional and documented
- Performance benchmarked and optimized
- Error handling comprehensive and tested
- Code reviewed and refactored for maintainability

## 🔗 Related Documentation

- **Manager Pattern**: `docs/MANAGER-PATTERN-GUIDE.md`
- **Event System**: `docs/EVENT-SYSTEM-GUIDE.md`
- **WebSocket Architecture**: `docs/WEBSOCKET-IMPLEMENTATION.md` (to be created)
- **Chat API Reference**: `docs/CHAT-API-GUIDE.md` (to be created)

---

**Last Updated**: 2025-08-29  
**Status**: Debugging SQLAlchemy column reference issues  
**Priority**: 🔴 Critical - Complete Phase 1 implementation
