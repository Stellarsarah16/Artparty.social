"""
Chat and messaging database models - Phase 1 Only
Matching the exact migration script for safety
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base

# ========================================================================
# PHASE 1: CHAT ROOMS AND MESSAGING (Exact match to migration script)
# ========================================================================

class ChatRoom(Base):
    """Chat room model for canvas-specific and direct message rooms"""
    
    __tablename__ = "chat_rooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_type = Column(String(20), nullable=False)  # 'canvas', 'direct', 'global'
    canvas_id = Column(Integer, ForeignKey('canvases.id', ondelete='CASCADE'), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships (temporarily minimal to avoid conflicts)
    messages = relationship("ChatMessage", back_populates="room")
    canvas = relationship("Canvas")


class ChatMessage(Base):
    """Chat message model for all chat messages"""
    
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False, default='text')  # 'text', 'system', 'tile_mention', 'user_mention'
    mentioned_tile_id = Column(Integer, ForeignKey('tiles.id', ondelete='SET NULL'), nullable=True)
    mentioned_canvas_id = Column(Integer, ForeignKey('canvases.id', ondelete='SET NULL'), nullable=True)
    mentioned_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    edited_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships (minimal to avoid conflicts)
    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class UserPresence(Base):
    """User presence model for tracking online status and tile editing"""
    
    __tablename__ = "user_presence"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    canvas_id = Column(Integer, ForeignKey('canvases.id', ondelete='CASCADE'), nullable=True)
    status = Column(String(20), default='online')  # 'online', 'away', 'offline'
    current_tile_x = Column(Integer, nullable=True)
    current_tile_y = Column(Integer, nullable=True)
    is_editing_tile = Column(Boolean, default=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    session_id = Column(String(255), nullable=True)
    
    # Relationships (minimal to avoid conflicts)
    user = relationship("User")
    canvas = relationship("Canvas")


class DMParticipant(Base):
    """Direct message participant model"""
    
    __tablename__ = "chat_room_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey('chat_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default='member')
    
    # Relationships (minimal to avoid conflicts)
    chat_room = relationship("ChatRoom")
    user = relationship("User")


# ========================================================================
# PHASE 2 & 3 MODELS - WILL BE ADDED LATER
# ========================================================================
# UserProfile, ActivityFeed, CanvasLike, CanvasComment, TileComment
# These will be added in future phases to avoid complexity