"""
Chat and messaging schemas for request/response validation
"""
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    """Enum for message types"""
    TEXT = "text"
    SYSTEM = "system"
    TILE_MENTION = "tile_mention"
    CANVAS_MENTION = "canvas_mention"


class RoomType(str, Enum):
    """Enum for chat room types"""
    CANVAS = "canvas"
    DIRECT = "direct"
    GLOBAL = "global"


class UserStatus(str, Enum):
    """Enum for user presence status"""
    ONLINE = "online"
    AWAY = "away"
    OFFLINE = "offline"


# ========================================================================
# CHAT MESSAGE SCHEMAS
# ========================================================================

class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    message_text: str
    message_type: MessageType = MessageType.TEXT
    mentioned_tile_x: Optional[int] = None
    mentioned_tile_y: Optional[int] = None
    mentioned_user_id: Optional[int] = None
    
    @validator('message_text')
    def validate_message_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Message text is required')
        v = v.strip()
        if len(v) > 2000:
            raise ValueError('Message text must be less than 2000 characters')
        return v
    
    @validator('mentioned_tile_x', 'mentioned_tile_y')
    def validate_tile_coordinates(cls, v):
        if v is not None and (v < 0 or v > 999):
            raise ValueError('Tile coordinates must be between 0 and 999')
        return v


class ChatMessageUpdate(BaseModel):
    """Schema for updating a chat message"""
    message_text: str
    
    @validator('message_text')
    def validate_message_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Message text is required')
        v = v.strip()
        if len(v) > 2000:
            raise ValueError('Message text must be less than 2000 characters')
        return v


class ChatMessageResponse(BaseModel):
    """Schema for chat message responses"""
    id: str
    room_id: str
    sender_id: int
    sender_username: str
    sender_display_name: Optional[str]
    message_text: str
    message_type: MessageType
    mentioned_tile: Optional[Dict[str, int]]  # {"x": int, "y": int}
    mentioned_user: Optional[Dict[str, Any]]  # {"id": int, "username": str}
    created_at: datetime
    updated_at: datetime
    edited_at: Optional[datetime]
    is_deleted: bool
    
    class Config:
        from_attributes = True


# ========================================================================
# CHAT ROOM SCHEMAS
# ========================================================================

class ChatRoomCreate(BaseModel):
    """Schema for creating a new chat room"""
    room_type: RoomType
    canvas_id: Optional[int] = None
    participant_user_ids: Optional[List[int]] = []
    
    @validator('canvas_id')
    def validate_canvas_room(cls, v, values):
        room_type = values.get('room_type')
        if room_type == RoomType.CANVAS and v is None:
            raise ValueError('Canvas ID is required for canvas rooms')
        if room_type != RoomType.CANVAS and v is not None:
            raise ValueError('Canvas ID should only be set for canvas rooms')
        return v


class ChatRoomResponse(BaseModel):
    """Schema for chat room responses"""
    id: str
    room_type: RoomType
    canvas_id: Optional[int]
    canvas_name: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    participant_count: int
    last_message: Optional[ChatMessageResponse]
    unread_count: int = 0
    
    class Config:
        from_attributes = True


# ========================================================================
# USER PRESENCE SCHEMAS
# ========================================================================

class UserPresenceUpdate(BaseModel):
    """Schema for updating user presence"""
    status: UserStatus = UserStatus.ONLINE
    canvas_id: Optional[int] = None
    current_tile_x: Optional[int] = None
    current_tile_y: Optional[int] = None
    is_editing_tile: bool = False
    
    @validator('current_tile_x', 'current_tile_y')
    def validate_tile_coordinates(cls, v):
        if v is not None and (v < 0 or v > 999):
            raise ValueError('Tile coordinates must be between 0 and 999')
        return v


class UserPresenceResponse(BaseModel):
    """Schema for user presence responses"""
    id: str
    user_id: int
    username: str
    display_name: Optional[str]
    canvas_id: Optional[int]
    status: UserStatus
    current_tile_x: Optional[int]
    current_tile_y: Optional[int]
    is_editing_tile: bool
    last_activity: datetime
    
    class Config:
        from_attributes = True


# ========================================================================
# DIRECT MESSAGE SCHEMAS
# ========================================================================

class DirectMessageCreate(BaseModel):
    """Schema for creating a direct message"""
    recipient_id: int
    message_text: str
    canvas_context_id: Optional[int] = None
    tile_context_x: Optional[int] = None
    tile_context_y: Optional[int] = None
    
    @validator('message_text')
    def validate_message_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Message text is required')
        v = v.strip()
        if len(v) > 2000:
            raise ValueError('Message text must be less than 2000 characters')
        return v
    
    @validator('tile_context_x', 'tile_context_y')
    def validate_tile_coordinates(cls, v):
        if v is not None and (v < 0 or v > 999):
            raise ValueError('Tile coordinates must be between 0 and 999')
        return v


class DirectMessageResponse(BaseModel):
    """Schema for direct message responses"""
    id: str
    sender_id: int
    sender_username: str
    sender_display_name: Optional[str]
    recipient_id: int
    recipient_username: str
    recipient_display_name: Optional[str]
    message_text: str
    canvas_context: Optional[Dict[str, Any]]
    tile_context: Optional[Dict[str, int]]
    created_at: datetime
    is_read: bool = False
    
    class Config:
        from_attributes = True


# ========================================================================
# CHAT HISTORY AND PAGINATION SCHEMAS
# ========================================================================

class ChatHistoryRequest(BaseModel):
    """Schema for requesting chat history"""
    limit: int = 50
    offset: int = 0
    before_message_id: Optional[str] = None
    after_message_id: Optional[str] = None
    
    @validator('limit')
    def validate_limit(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Limit must be between 1 and 100')
        return v
    
    @validator('offset')
    def validate_offset(cls, v):
        if v < 0:
            raise ValueError('Offset must be non-negative')
        return v


class ChatHistoryResponse(BaseModel):
    """Schema for chat history responses"""
    messages: List[ChatMessageResponse]
    total_count: int
    has_more: bool
    next_offset: Optional[int]
    room_info: ChatRoomResponse


# ========================================================================
# WEBSOCKET MESSAGE SCHEMAS
# ========================================================================

class WebSocketChatMessage(BaseModel):
    """Schema for WebSocket chat message events"""
    type: str = "canvas_chat"
    text: str
    canvas_id: Optional[int] = None
    
    @validator('text')
    def validate_text(cls, v):
        if not v or not v.strip():
            raise ValueError('Message text is required')
        return v.strip()


class WebSocketPresenceUpdate(BaseModel):
    """Schema for WebSocket presence update events"""
    type: str = "user_presence"
    presence_type: str  # "typing", "editing_tile", "status_change"
    is_typing: Optional[bool] = None
    tile_x: Optional[int] = None
    tile_y: Optional[int] = None
    is_editing: Optional[bool] = None
    status: Optional[UserStatus] = None


class WebSocketTileMention(BaseModel):
    """Schema for WebSocket tile mention events"""
    type: str = "tile_mention"
    tile_x: int
    tile_y: int
    highlight_type: str = "mention"
    message: str = ""
    duration: int = 3000
    
    @validator('tile_x', 'tile_y')
    def validate_coordinates(cls, v):
        if v < 0 or v > 999:
            raise ValueError('Tile coordinates must be between 0 and 999')
        return v


# ========================================================================
# ACTIVITY FEED SCHEMAS
# ========================================================================

class ActivityFeedResponse(BaseModel):
    """Schema for activity feed responses"""
    id: str
    user_id: int
    username: str
    display_name: Optional[str]
    activity_type: str
    canvas_id: Optional[int]
    canvas_name: Optional[str]
    tile_id: Optional[int]
    tile_coordinates: Optional[Dict[str, int]]
    target_user_id: Optional[int]
    target_username: Optional[str]
    activity_data: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========================================================================
# ERROR SCHEMAS
# ========================================================================

class ChatErrorResponse(BaseModel):
    """Schema for chat error responses"""
    error: str
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ========================================================================
# BULK OPERATIONS SCHEMAS
# ========================================================================

class BulkMessageMarkRead(BaseModel):
    """Schema for marking multiple messages as read"""
    message_ids: List[str]
    
    @validator('message_ids')
    def validate_message_ids(cls, v):
        if not v:
            raise ValueError('At least one message ID is required')
        if len(v) > 100:
            raise ValueError('Cannot mark more than 100 messages at once')
        return v


class ChatRoomJoinRequest(BaseModel):
    """Schema for joining a chat room"""
    room_id: str


class ChatRoomLeaveRequest(BaseModel):
    """Schema for leaving a chat room"""
    room_id: str


# ========================================================================
# SEARCH AND FILTER SCHEMAS
# ========================================================================

class ChatSearchRequest(BaseModel):
    """Schema for searching chat messages"""
    query: str
    room_id: Optional[str] = None
    sender_id: Optional[int] = None
    message_type: Optional[MessageType] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = 20
    offset: int = 0
    
    @validator('query')
    def validate_query(cls, v):
        if not v or not v.strip():
            raise ValueError('Search query is required')
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Search query must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Search query must be less than 100 characters')
        return v


class ChatSearchResponse(BaseModel):
    """Schema for chat search results"""
    messages: List[ChatMessageResponse]
    total_count: int
    query: str
    search_time_ms: float
