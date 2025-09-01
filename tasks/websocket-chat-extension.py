# ========================================================================
# WEBSOCKET CHAT EXTENSION - Phase 1 Implementation
# Extends existing WebSocket system to handle chat functionality
# ========================================================================

"""
Enhanced WebSocket message handler for chat functionality
Extends backend/app/api/v1/websockets.py handle_websocket_message function
"""

async def handle_websocket_message(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Enhanced WebSocket message handler with chat support"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Handle ping messages - keep existing functionality
        pass
        
    elif message_type == "canvas_chat":
        # Handle canvas-specific chat messages
        await handle_canvas_chat_message(canvas_id, user_id, message, db)
        
    elif message_type == "direct_message":
        # Handle direct messages between users
        await handle_direct_message(user_id, message, db)
        
    elif message_type == "user_presence":
        # Handle user presence updates (typing, editing tile, etc.)
        await handle_user_presence_update(canvas_id, user_id, message, db)
        
    elif message_type == "tile_mention":
        # Handle tile mention highlighting
        await handle_tile_mention(canvas_id, user_id, message, db)
        
    elif message_type == "chat_command":
        # Handle chat commands like @user, @tile:x,y
        await handle_chat_command(canvas_id, user_id, message, db)
        
    else:
        logger.warning(f"Unknown message type: {message_type}")


async def handle_canvas_chat_message(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle canvas-specific chat messages"""
    try:
        # Validate message content
        message_text = message.get("text", "").strip()
        if not message_text or len(message_text) > 2000:
            logger.warning(f"Invalid chat message from user {user_id}: {message_text[:100]}...")
            return
        
        # Get or create canvas chat room
        from sqlalchemy import select
        from ...models.chat import ChatRoom, ChatMessage  # Will need to create these models
        
        # Find canvas chat room
        stmt = select(ChatRoom).where(
            ChatRoom.canvas_id == canvas_id,
            ChatRoom.room_type == 'canvas'
        )
        result = await db.execute(stmt)
        chat_room = result.scalar_one_or_none()
        
        if not chat_room:
            # Create canvas chat room if it doesn't exist
            chat_room = ChatRoom(
                room_type='canvas',
                canvas_id=canvas_id,
                created_by=user_id
            )
            db.add(chat_room)
            await db.flush()  # Get the ID
        
        # Parse message for mentions and context
        parsed_message = parse_chat_message(message_text)
        
        # Create chat message
        chat_message = ChatMessage(
            room_id=chat_room.id,
            sender_id=user_id,
            message_text=message_text,
            message_type=parsed_message.get('type', 'text'),
            mentioned_tile_id=parsed_message.get('mentioned_tile_id'),
            mentioned_canvas_id=parsed_message.get('mentioned_canvas_id'),
            mentioned_user_id=parsed_message.get('mentioned_user_id')
        )
        
        db.add(chat_message)
        await db.commit()
        
        # Get sender info
        user_info = connection_manager.user_info.get(user_id, {})
        
        # Broadcast message to all canvas users
        broadcast_message = {
            "type": "canvas_chat_message",
            "message_id": str(chat_message.id),
            "sender_id": user_id,
            "sender_username": user_info.get("username", "unknown"),
            "sender_display_name": user_info.get("display_name"),
            "message_text": message_text,
            "message_type": chat_message.message_type,
            "mentioned_tile": parsed_message.get('mentioned_tile'),
            "mentioned_user": parsed_message.get('mentioned_user'),
            "created_at": chat_message.created_at.isoformat(),
            "timestamp": connection_manager._get_timestamp()
        }
        
        await connection_manager.broadcast_to_canvas(canvas_id, broadcast_message)
        
        logger.info(f"Canvas chat message sent by user {user_id} to canvas {canvas_id}")
        
    except Exception as e:
        logger.error(f"Error handling canvas chat message: {e}")
        # Send error back to sender
        error_message = {
            "type": "chat_error",
            "error": "Failed to send message",
            "timestamp": connection_manager._get_timestamp()
        }
        await connection_manager.send_to_user(canvas_id, user_id, error_message)


async def handle_user_presence_update(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle user presence updates (typing, editing tile, etc.)"""
    try:
        presence_type = message.get("presence_type")
        
        if presence_type == "typing":
            # Broadcast typing indicator
            user_info = connection_manager.user_info.get(user_id, {})
            typing_message = {
                "type": "user_typing",
                "user_id": user_id,
                "username": user_info.get("username"),
                "is_typing": message.get("is_typing", False),
                "timestamp": connection_manager._get_timestamp()
            }
            await connection_manager.broadcast_to_canvas(canvas_id, typing_message, exclude_user=user_id)
            
        elif presence_type == "editing_tile":
            # Update user presence in database and broadcast
            from ...models.chat import UserPresence  # Will need to create this model
            
            tile_x = message.get("tile_x")
            tile_y = message.get("tile_y")
            is_editing = message.get("is_editing", False)
            
            # Update presence in database
            from sqlalchemy import select
            stmt = select(UserPresence).where(UserPresence.user_id == user_id)
            result = await db.execute(stmt)
            presence = result.scalar_one_or_none()
            
            if presence:
                presence.canvas_id = canvas_id
                presence.current_tile_x = tile_x if is_editing else None
                presence.current_tile_y = tile_y if is_editing else None
                presence.is_editing_tile = is_editing
                presence.last_activity = func.now()
            else:
                presence = UserPresence(
                    user_id=user_id,
                    canvas_id=canvas_id,
                    current_tile_x=tile_x if is_editing else None,
                    current_tile_y=tile_y if is_editing else None,
                    is_editing_tile=is_editing,
                    status='online'
                )
                db.add(presence)
            
            await db.commit()
            
            # Broadcast presence update
            user_info = connection_manager.user_info.get(user_id, {})
            presence_message = {
                "type": "user_presence_update",
                "user_id": user_id,
                "username": user_info.get("username"),
                "tile_x": tile_x,
                "tile_y": tile_y,
                "is_editing": is_editing,
                "timestamp": connection_manager._get_timestamp()
            }
            await connection_manager.broadcast_to_canvas(canvas_id, presence_message, exclude_user=user_id)
            
    except Exception as e:
        logger.error(f"Error handling presence update: {e}")


async def handle_tile_mention(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle tile mention highlighting requests"""
    try:
        tile_x = message.get("tile_x")
        tile_y = message.get("tile_y")
        highlight_type = message.get("highlight_type", "mention")  # mention, help_request, etc.
        
        if tile_x is None or tile_y is None:
            return
        
        user_info = connection_manager.user_info.get(user_id, {})
        
        # Broadcast tile highlight to all canvas users
        highlight_message = {
            "type": "tile_highlight",
            "tile_x": tile_x,
            "tile_y": tile_y,
            "highlight_type": highlight_type,
            "requester_id": user_id,
            "requester_username": user_info.get("username"),
            "message": message.get("message", ""),
            "duration": message.get("duration", 3000),  # 3 seconds default
            "timestamp": connection_manager._get_timestamp()
        }
        
        await connection_manager.broadcast_to_canvas(canvas_id, highlight_message)
        logger.info(f"Tile highlight broadcast by user {user_id} for tile ({tile_x}, {tile_y})")
        
    except Exception as e:
        logger.error(f"Error handling tile mention: {e}")


async def handle_chat_command(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle chat commands like @user, @tile:x,y, etc."""
    try:
        command = message.get("command", "").strip()
        command_args = message.get("args", [])
        
        if command == "help_tile":
            # @user come help with tile x,y
            target_username = command_args[0] if command_args else None
            tile_x = message.get("tile_x")
            tile_y = message.get("tile_y")
            
            if target_username and tile_x is not None and tile_y is not None:
                # Find target user in canvas
                target_user_id = None
                for uid in connection_manager.canvas_users.get(canvas_id, set()):
                    user_info = connection_manager.user_info.get(uid, {})
                    if user_info.get("username") == target_username:
                        target_user_id = uid
                        break
                
                if target_user_id:
                    # Send help request to specific user
                    requester_info = connection_manager.user_info.get(user_id, {})
                    help_message = {
                        "type": "help_request",
                        "requester_id": user_id,
                        "requester_username": requester_info.get("username"),
                        "tile_x": tile_x,
                        "tile_y": tile_y,
                        "message": f"@{target_username} come help with tile {tile_x},{tile_y}",
                        "timestamp": connection_manager._get_timestamp()
                    }
                    await connection_manager.send_to_user(canvas_id, target_user_id, help_message)
                    
                    # Also broadcast to canvas as regular chat
                    await handle_canvas_chat_message(canvas_id, user_id, {
                        "text": f"@{target_username} come help with tile {tile_x},{tile_y}"
                    }, db)
        
    except Exception as e:
        logger.error(f"Error handling chat command: {e}")


def parse_chat_message(message_text: str) -> dict:
    """Parse chat message for mentions and special content"""
    import re
    
    result = {
        "type": "text",
        "mentioned_tile_id": None,
        "mentioned_canvas_id": None,
        "mentioned_user_id": None,
        "mentioned_tile": None,
        "mentioned_user": None
    }
    
    # Parse tile mentions: "tile 15,20" or "tile:15,20"
    tile_pattern = r'tile[:\s]+(\d+)[,\s]+(\d+)'
    tile_match = re.search(tile_pattern, message_text, re.IGNORECASE)
    if tile_match:
        result["type"] = "tile_mention"
        result["mentioned_tile"] = {
            "x": int(tile_match.group(1)),
            "y": int(tile_match.group(2))
        }
    
    # Parse user mentions: "@username"
    user_pattern = r'@(\w+)'
    user_matches = re.findall(user_pattern, message_text)
    if user_matches:
        result["mentioned_user"] = user_matches[0]  # First mention
    
    return result


# ========================================================================
# ENHANCED CONNECTION MANAGER METHODS
# Add these methods to backend/app/core/websocket.py ConnectionManager class
# ========================================================================

async def broadcast_chat_message(self, canvas_id: int, chat_data: dict):
    """Broadcast chat message to all canvas users"""
    message = {
        "type": "canvas_chat_message",
        **chat_data,
        "timestamp": self._get_timestamp()
    }
    await self.broadcast_to_canvas(canvas_id, message)

async def send_direct_message(self, sender_id: int, recipient_id: int, message_data: dict):
    """Send direct message between users (if they're online)"""
    # Find which canvas the recipient is connected to
    recipient_canvas = None
    for canvas_id, users in self.canvas_users.items():
        if recipient_id in users:
            recipient_canvas = canvas_id
            break
    
    if recipient_canvas:
        dm_message = {
            "type": "direct_message",
            **message_data,
            "timestamp": self._get_timestamp()
        }
        await self.send_to_user(recipient_canvas, recipient_id, dm_message)
        return True
    
    return False  # User is offline

async def broadcast_user_activity(self, canvas_id: int, activity_data: dict):
    """Broadcast user activity to canvas users"""
    activity_message = {
        "type": "user_activity",
        **activity_data,
        "timestamp": self._get_timestamp()
    }
    await self.broadcast_to_canvas(canvas_id, activity_message)

async def get_canvas_active_users(self, canvas_id: int) -> List[dict]:
    """Get detailed info about users currently active in a canvas"""
    active_users = []
    
    if canvas_id in self.canvas_users:
        for user_id in self.canvas_users[canvas_id]:
            user_info = self.user_info.get(user_id, {})
            active_users.append({
                "user_id": user_id,
                "username": user_info.get("username", "unknown"),
                "display_name": user_info.get("display_name"),
                "connected_at": user_info.get("connected_at"),
                "is_active": True
            })
    
    return active_users

# ========================================================================
# CHAT DATABASE MODELS
# Create these in backend/app/models/chat.py
# ========================================================================

"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type = Column(String(20), nullable=False)  # 'canvas', 'direct', 'global'
    canvas_id = Column(Integer, ForeignKey('canvas.id', ondelete='CASCADE'), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    canvas = relationship("Canvas", back_populates="chat_room")
    creator = relationship("User", foreign_keys=[created_by])
    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")
    participants = relationship("ChatRoomParticipant", back_populates="room", cascade="all, delete-orphan")


class ChatRoomParticipant(Base):
    __tablename__ = "chat_room_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default='member')  # 'member', 'moderator', 'admin'
    
    # Relationships
    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(20), default='text')  # 'text', 'system', 'tile_mention', 'canvas_mention'
    
    # Context references
    mentioned_tile_id = Column(Integer, ForeignKey('tiles.id', ondelete='SET NULL'), nullable=True)
    mentioned_canvas_id = Column(Integer, ForeignKey('canvas.id', ondelete='SET NULL'), nullable=True)
    mentioned_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    edited_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    mentioned_tile = relationship("Tile", foreign_keys=[mentioned_tile_id])
    mentioned_canvas = relationship("Canvas", foreign_keys=[mentioned_canvas_id])
    mentioned_user = relationship("User", foreign_keys=[mentioned_user_id])


class UserPresence(Base):
    __tablename__ = "user_presence"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    canvas_id = Column(Integer, ForeignKey('canvas.id', ondelete='CASCADE'), nullable=True)
    status = Column(String(20), default='online')  # 'online', 'away', 'offline'
    current_tile_x = Column(Integer, nullable=True)
    current_tile_y = Column(Integer, nullable=True)
    is_editing_tile = Column(Boolean, default=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    session_id = Column(String(255), nullable=True)
    
    # Relationships
    user = relationship("User")
    canvas = relationship("Canvas")
"""

# ========================================================================
# FRONTEND WEBSOCKET MESSAGE TYPES
# Add these to frontend WebSocket message handling
# ========================================================================

"""
Frontend WebSocket Message Types for Chat:

// Sending messages to server:
{
    type: "canvas_chat",
    text: "Hello everyone! Working on tile 15,20",
    canvas_id: 123
}

{
    type: "user_presence", 
    presence_type: "typing",
    is_typing: true
}

{
    type: "user_presence",
    presence_type: "editing_tile", 
    tile_x: 15,
    tile_y: 20,
    is_editing: true
}

{
    type: "tile_mention",
    tile_x: 15,
    tile_y: 20,
    highlight_type: "mention",
    message: "Check out this tile!",
    duration: 3000
}

// Receiving messages from server:
{
    type: "canvas_chat_message",
    message_id: "uuid",
    sender_id: 123,
    sender_username: "artist1", 
    message_text: "Hello everyone!",
    message_type: "text",
    created_at: "2025-01-20T...",
    mentioned_tile: {x: 15, y: 20},
    mentioned_user: "artist2"
}

{
    type: "user_typing",
    user_id: 123,
    username: "artist1",
    is_typing: true
}

{
    type: "user_presence_update",
    user_id: 123, 
    username: "artist1",
    tile_x: 15,
    tile_y: 20,
    is_editing: true
}

{
    type: "tile_highlight",
    tile_x: 15,
    tile_y: 20,
    highlight_type: "mention",
    requester_username: "artist1",
    message: "Check this out!",
    duration: 3000
}
"""
