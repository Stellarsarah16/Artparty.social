"""
Chat and messaging endpoints for real-time communication - Phase 1
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta, timezone
import re

from ...core.database import get_db
from ...core.websocket import connection_manager
from ...services.auth import auth_service
from ...models.user import User
from ...models.canvas import Canvas
from ...models.tile import Tile
from ...models.chat import (
    ChatRoom, DMParticipant, ChatMessage, UserPresence
)
from ...schemas.chat import (
    ChatMessageCreate, ChatMessageUpdate, ChatMessageResponse,
    ChatRoomCreate, ChatRoomResponse, ChatHistoryRequest, ChatHistoryResponse,
    UserPresenceUpdate, UserPresenceResponse, ChatErrorResponse
)

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return await auth_service.get_current_user(db, token)


# ========================================================================
# CANVAS CHAT ENDPOINTS
# ========================================================================

@router.get("/canvas/{canvas_id}/room", response_model=ChatRoomResponse)
async def get_canvas_chat_room(
    canvas_id: int = Path(..., description="Canvas ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get or create chat room for a canvas"""
    try:
        # Verify canvas exists and user has access
        canvas_stmt = select(Canvas).where(Canvas.id == canvas_id, Canvas.is_active == True)
        canvas_result = await db.execute(canvas_stmt)
        canvas = canvas_result.scalar_one_or_none()
        
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found or inactive"
            )
        
        # Get or create canvas chat room
        room_stmt = select(ChatRoom).where(
            ChatRoom.canvas_id == canvas_id,
            ChatRoom.room_type == 'canvas'
        )
        room_result = await db.execute(room_stmt)
        chat_room = room_result.scalar_one_or_none()
        
        if not chat_room:
            # Create canvas chat room
            chat_room = ChatRoom(
                room_type='canvas',
                canvas_id=canvas_id,
                created_by=current_user.id
            )
            db.add(chat_room)
            await db.commit()
            await db.refresh(chat_room)
        
        # Get last message with sender eagerly loaded to prevent MissingGreenlet errors
        from sqlalchemy.orm import selectinload
        last_message_stmt = select(ChatMessage).options(
            selectinload(ChatMessage.sender)
        ).where(
            ChatMessage.room_id == chat_room.id,
            ChatMessage.is_deleted == False
        ).order_by(desc(ChatMessage.created_at)).limit(1)
        last_message_result = await db.execute(last_message_stmt)
        last_message = last_message_result.scalar_one_or_none()
        
        # Get participant count from WebSocket connections
        participant_count = connection_manager.get_canvas_user_count(canvas_id)
        
        return ChatRoomResponse(
            id=str(chat_room.id),
            room_type=chat_room.room_type,
            canvas_id=chat_room.canvas_id,
            canvas_name=canvas.name,
            created_by=chat_room.created_by,
            created_at=chat_room.created_at,
            updated_at=chat_room.updated_at,
            is_active=chat_room.is_active,
            participant_count=participant_count,
            last_message=ChatMessageResponse(
                id=str(last_message.id),
                room_id=str(last_message.room_id),
                sender_id=last_message.sender_id,
                sender_username=last_message.sender.username,
                sender_display_name=f"{last_message.sender.first_name} {last_message.sender.last_name}".strip(),
                message_text=last_message.message_text,
                message_type=last_message.message_type,
                mentioned_tile=None,  # Simplified for Phase 1
                mentioned_user=None,  # Simplified for Phase 1
                created_at=last_message.created_at,
                updated_at=last_message.updated_at,
                edited_at=last_message.edited_at,
                is_deleted=last_message.is_deleted
            ) if last_message else None,
            unread_count=0  # Simplified for Phase 1
        )
        
    except Exception as e:
        logger.error(f"Error getting canvas chat room: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat room"
        )


@router.get("/canvas/{canvas_id}/messages", response_model=ChatHistoryResponse)
async def get_canvas_chat_history(
    canvas_id: int = Path(..., description="Canvas ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to retrieve"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    before_message_id: Optional[str] = Query(None, description="Get messages before this message ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get chat message history for a canvas"""
    try:
        # Get canvas chat room with explicit canvas join
        room_stmt = select(ChatRoom, Canvas).join(
            Canvas, ChatRoom.canvas_id == Canvas.id
        ).where(
            ChatRoom.canvas_id == canvas_id,
            ChatRoom.room_type == 'canvas'
        )
        room_result = await db.execute(room_stmt)
        room_row = room_result.first()
        chat_room = room_row[0] if room_row else None
        canvas = room_row[1] if room_row else None
        
        if not chat_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas chat room not found"
            )
        
        # Build message query with explicit join to load sender data
        message_query = select(ChatMessage, User).join(
            User, ChatMessage.sender_id == User.id
        ).where(
            ChatMessage.room_id == chat_room.id,
            ChatMessage.is_deleted == False
        )
        
        # Add before_message_id filter if provided
        if before_message_id:
            before_message_stmt = select(ChatMessage.created_at).where(ChatMessage.id == before_message_id)
            before_result = await db.execute(before_message_stmt)
            before_timestamp = before_result.scalar_one_or_none()
            if before_timestamp:
                message_query = message_query.where(ChatMessage.created_at < before_timestamp)
        
        # Apply pagination and ordering
        message_query = message_query.order_by(desc(ChatMessage.created_at)).offset(offset).limit(limit)
        
        messages_result = await db.execute(message_query)
        message_rows = messages_result.all()
        
        # Get total count
        count_stmt = select(func.count(ChatMessage.id)).where(
            ChatMessage.room_id == chat_room.id,
            ChatMessage.is_deleted == False
        )
        count_result = await db.execute(count_stmt)
        total_count = count_result.scalar()
        
        # Convert to response format
        message_responses = []
        for msg, user in message_rows:
            message_responses.append(ChatMessageResponse(
                id=str(msg.id),
                room_id=str(msg.room_id),
                sender_id=msg.sender_id,
                sender_username=user.username,
                sender_display_name=f"{user.first_name} {user.last_name}".strip(),
                message_text=msg.message_text,
                message_type=msg.message_type,
                mentioned_tile=None,  # Simplified for Phase 1
                mentioned_user=None,  # Simplified for Phase 1
                created_at=msg.created_at,
                updated_at=msg.updated_at,
                edited_at=msg.edited_at,
                is_deleted=msg.is_deleted
            ))
        
        # Get room info
        room_info = ChatRoomResponse(
            id=str(chat_room.id),
            room_type=chat_room.room_type,
            canvas_id=chat_room.canvas_id,
            canvas_name=canvas.name if canvas else None,
            created_by=chat_room.created_by,
            created_at=chat_room.created_at,
            updated_at=chat_room.updated_at,
            is_active=chat_room.is_active,
            participant_count=connection_manager.get_canvas_user_count(canvas_id),
            last_message=message_responses[0] if message_responses else None
        )
        
        return ChatHistoryResponse(
            messages=list(reversed(message_responses)),  # Reverse to show oldest first
            total_count=total_count,
            has_more=offset + len(message_rows) < total_count,
            next_offset=offset + len(message_rows) if offset + len(message_rows) < total_count else None,
            room_info=room_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting canvas chat history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat history"
        )


@router.post("/canvas/{canvas_id}/messages", response_model=ChatMessageResponse)
async def send_canvas_chat_message(
    canvas_id: int = Path(..., description="Canvas ID"),
    message_data: ChatMessageCreate = ...,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a chat message to a canvas chat room"""
    try:
        # Load user data explicitly to avoid lazy loading issues
        user_stmt = select(User).where(User.id == current_user.id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one()
        
        # Store user data to avoid any lazy loading issues
        user_id = user.id
        username = user.username
        first_name = user.first_name
        last_name = user.last_name
        
        # Get canvas chat room
        room_stmt = select(ChatRoom).where(
            ChatRoom.canvas_id == canvas_id,
            ChatRoom.room_type == 'canvas'
        )
        room_result = await db.execute(room_stmt)
        chat_room = room_result.scalar_one_or_none()
        
        if not chat_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas chat room not found"
            )
        
        # Create chat message (simplified for Phase 1)
        chat_message = ChatMessage(
            room_id=chat_room.id,
            sender_id=user_id,
            message_text=message_data.message_text,
            message_type=message_data.message_type,
            mentioned_tile_id=None,  # Simplified for Phase 1
            mentioned_canvas_id=None,  # Simplified for Phase 1
            mentioned_user_id=None  # Simplified for Phase 1
        )
        
        db.add(chat_message)
        await db.commit()
        await db.refresh(chat_message)
        
        # Store message data to avoid lazy loading issues
        message_id = str(chat_message.id)
        room_id = str(chat_message.room_id)
        message_text = chat_message.message_text
        message_type = chat_message.message_type
        created_at = chat_message.created_at
        updated_at = chat_message.updated_at
        edited_at = chat_message.edited_at
        is_deleted = chat_message.is_deleted
        
        # Broadcast via WebSocket
        user_info = {
            "username": username,
            "display_name": f"{first_name} {last_name}".strip()
        }
        
        broadcast_data = {
            "message_id": message_id,
            "sender_id": user_id,
            "sender_username": username,
            "sender_display_name": user_info["display_name"],
            "message_text": message_text,
            "message_type": message_type,
            "mentioned_tile": None,  # Simplified for Phase 1
            "created_at": created_at.isoformat()
        }
        
        await connection_manager.broadcast_to_canvas(canvas_id, {
            "type": "canvas_chat_message",
            **broadcast_data
        })
        
        return ChatMessageResponse(
            id=message_id,
            room_id=room_id,
            sender_id=user_id,
            sender_username=username,
            sender_display_name=user_info["display_name"],
            message_text=message_text,
            message_type=message_type,
            mentioned_tile=None,  # Simplified for Phase 1
            mentioned_user=None,  # Simplified for Phase 1
            created_at=created_at,
            updated_at=updated_at,
            edited_at=edited_at,
            is_deleted=is_deleted
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending canvas chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send chat message"
        )


# Message update/delete endpoints removed for Phase 1 simplicity


# ========================================================================
# USER PRESENCE ENDPOINTS
# ========================================================================

@router.get("/canvas/{canvas_id}/users", response_model=List[UserPresenceResponse])
async def get_canvas_active_users(
    canvas_id: int = Path(..., description="Canvas ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of users currently active in a canvas"""
    try:
        # Get active users from WebSocket connections
        websocket_users = await connection_manager.get_canvas_active_users(canvas_id)
        
        # Convert to response format
        active_users = []
        for ws_user in websocket_users:
            active_users.append(UserPresenceResponse(
                id=f"ws_{ws_user['user_id']}",
                user_id=ws_user["user_id"],
                username=ws_user["username"],
                display_name=ws_user.get("display_name"),
                canvas_id=canvas_id,
                status="online",  # Simplified for Phase 1
                current_tile_x=None,  # Simplified for Phase 1
                current_tile_y=None,  # Simplified for Phase 1
                is_editing_tile=False,  # Simplified for Phase 1
                last_activity=datetime.now()
            ))
        
        return active_users
        
    except Exception as e:
        logger.error(f"Error getting canvas active users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get active users"
        )


@router.put("/presence", response_model=UserPresenceResponse)
async def update_user_presence(
    presence_data: UserPresenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user presence status"""
    try:
        # Load user data explicitly to avoid lazy loading issues
        user_stmt = select(User).where(User.id == current_user.id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one()
        
        # Store user data to avoid any lazy loading issues
        user_id = user.id
        username = user.username
        first_name = user.first_name
        last_name = user.last_name
        
        # Get or create user presence
        presence_stmt = select(UserPresence).where(UserPresence.user_id == user_id)
        presence_result = await db.execute(presence_stmt)
        presence = presence_result.scalar_one_or_none()
        
        if presence:
            # Update existing presence
            presence.status = presence_data.status
            presence.canvas_id = presence_data.canvas_id
            presence.current_tile_x = presence_data.current_tile_x
            presence.current_tile_y = presence_data.current_tile_y
            presence.is_editing_tile = presence_data.is_editing_tile
            presence.last_activity = datetime.now(timezone.utc)
        else:
            # Create new presence
            presence = UserPresence(
                user_id=user_id,
                status=presence_data.status,
                canvas_id=presence_data.canvas_id,
                current_tile_x=presence_data.current_tile_x,
                current_tile_y=presence_data.current_tile_y,
                is_editing_tile=presence_data.is_editing_tile
            )
            db.add(presence)
        
        await db.commit()
        await db.refresh(presence)
        
        # Broadcast presence update via WebSocket if in a canvas
        if presence_data.canvas_id:
            await connection_manager.broadcast_to_canvas(presence_data.canvas_id, {
                "type": "user_presence_update",
                "user_id": user_id,
                "username": username,
                "status": presence_data.status,
                "tile_x": presence_data.current_tile_x,
                "tile_y": presence_data.current_tile_y,
                "is_editing": presence_data.is_editing_tile
            }, exclude_user=user_id)
        
        return UserPresenceResponse(
            id=str(presence.id),
            user_id=presence.user_id,
            username=username,
            display_name=f"{first_name} {last_name}".strip(),
            canvas_id=presence.canvas_id,
            status=presence.status,
            current_tile_x=presence.current_tile_x,
            current_tile_y=presence.current_tile_y,
            is_editing_tile=presence.is_editing_tile,
            last_activity=presence.last_activity
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user presence: {e}")
        logger.error(f"Presence data received: {presence_data}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update presence"
        )


# ========================================================================
# CORS OPTIONS ENDPOINTS
# ========================================================================

@router.options("/canvas/{canvas_id}/room")
async def canvas_room_options(canvas_id: int):
    """Handle CORS preflight for canvas room endpoints"""
    return {"message": "OK"}

@router.options("/canvas/{canvas_id}/messages")
async def canvas_messages_options(canvas_id: int):
    """Handle CORS preflight for canvas messages endpoints"""
    return {"message": "OK"}

@router.options("/presence")
async def presence_options():
    """Handle CORS preflight for presence endpoints"""
    return {"message": "OK"}

@router.options("/canvas/{canvas_id}/users")
async def canvas_users_options(canvas_id: int):
    """Handle CORS preflight for canvas users endpoints"""
    return {"message": "OK"}

