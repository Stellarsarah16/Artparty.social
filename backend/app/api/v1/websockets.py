"""
WebSocket endpoints for real-time collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import json
import logging
from datetime import datetime, timezone

from ...core.database import get_db
from ...core.websocket import connection_manager
from ...services.auth import auth_service
from ...models.canvas import Canvas
from ...models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_user_from_token(token: str, db: AsyncSession) -> User:
    """Get user from JWT token for WebSocket authentication"""
    try:
        logger.info(f"Attempting to authenticate WebSocket token: {token[:20]}...")
        user = await auth_service.get_current_user(db, token)
        logger.info(f"WebSocket authentication successful for user: {user.username}")
        return user
    except HTTPException as e:
        logger.error(f"WebSocket authentication HTTP error: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"WebSocket authentication failed with exception: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@router.websocket("/canvas/{canvas_id}")
async def websocket_canvas_endpoint(
    websocket: WebSocket,
    canvas_id: int,
    token: str = Query(..., description="JWT authentication token"),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time canvas collaboration
    
    Connect to a specific canvas to receive real-time updates about:
    - New tiles being created
    - Tiles being updated or deleted  
    - Users joining/leaving the canvas
    - Tile likes/unlikes
    - Active user count
    """
    print(f"🔌 WEBSOCKET ENDPOINT HIT: canvas_id={canvas_id}, token={token[:20]}...")
    logger.error(f"🔌 WEBSOCKET ENDPOINT HIT: canvas_id={canvas_id}, token={token[:20]}...")
    user = None
    
    try:
        logger.info(f"🔌 WebSocket connection attempt for canvas {canvas_id} with token {token[:20]}...")
        
        # Authenticate user BEFORE accepting the connection
        user = await get_user_from_token(token, db)
        
        # Extract user data immediately to avoid lazy loading issues
        user_id = user.id
        username = user.username
        first_name = user.first_name
        last_name = user.last_name
        
        # Validate canvas exists
        from sqlalchemy import select
        stmt = select(Canvas).where(Canvas.id == canvas_id, Canvas.is_active == True)
        result = await db.execute(stmt)
        canvas = result.scalar_one_or_none()
        
        if not canvas:
            logger.warning(f"Canvas {canvas_id} not found or inactive")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Canvas not found")
            return
        
        # Now accept the WebSocket connection after authentication
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for user {username} on canvas {canvas_id}")
        
        # Connect user to canvas
        user_info = {
            "username": username,
            "display_name": f"{first_name} {last_name}".strip()
        }
        
        await connection_manager.connect(websocket, canvas_id, user_id, user_info)
        logger.info(f"User {username} connected to canvas {canvas_id}")
        
        try:
            # Listen for incoming messages (optional - for future features like chat)
            while True:
                data = await websocket.receive_text()
                logger.debug(f"WebSocket message received from user {user_id}: {data}")
                try:
                    message = json.loads(data)
                    await handle_websocket_message(canvas_id, user_id, message, db)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received from user {user_id}: {data}")
                    # Don't disconnect for invalid JSON, just ignore the message
                    continue
                except Exception as e:
                    logger.error(f"Error handling message from user {user_id}: {e}")
                    # Don't disconnect for message handling errors, just log and continue
                    continue
                    
        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected from canvas {canvas_id}")
        
    except HTTPException as e:
        logger.error(f"WebSocket HTTP error: {e.detail}")
        # Don't try to close if connection wasn't accepted
        if websocket.client_state.value == 1:  # CONNECTED
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    except Exception as e:
        logger.error(f"WebSocket error: {type(e).__name__}: {str(e)}")
        # Don't try to close if connection wasn't accepted
        if websocket.client_state.value == 1:  # CONNECTED
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error")
    
    finally:
        # Clean up connection  
        if user:
            await connection_manager.disconnect(canvas_id, user_id)
            logger.info(f"User {user_id} disconnected from canvas {canvas_id}")


async def handle_websocket_message(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle incoming WebSocket messages from clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Handle ping messages
        pass
    elif message_type == "canvas_chat":
        # Handle canvas chat messages
        await handle_canvas_chat_websocket(canvas_id, user_id, message, db)
    elif message_type == "user_presence":
        # Handle user presence updates
        await handle_user_presence_websocket(canvas_id, user_id, message, db)
    elif message_type == "tile_mention":
        # Handle tile mention highlighting
        await handle_tile_mention_websocket(canvas_id, user_id, message, db)
    else:
        logger.warning(f"Unknown message type: {message_type}")


async def handle_canvas_chat_websocket(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle canvas chat messages via WebSocket"""
    try:
        from ...models.chat import ChatRoom, ChatMessage
        from sqlalchemy import select
        
        message_text = message.get("text", "").strip()
        if not message_text or len(message_text) > 2000:
            return
        
        # Get canvas chat room
        room_stmt = select(ChatRoom).where(
            ChatRoom.canvas_id == canvas_id,
            ChatRoom.room_type == 'canvas'
        )
        room_result = await db.execute(room_stmt)
        chat_room = room_result.scalar_one_or_none()
        
        if not chat_room:
            return
        
        # Create chat message
        chat_message = ChatMessage(
            room_id=chat_room.id,
            sender_id=user_id,
            message_text=message_text,
            message_type='text'
        )
        
        db.add(chat_message)
        await db.commit()
        
        # Get sender info
        user_info = connection_manager.user_info.get(user_id, {})
        
        # Broadcast to all canvas users
        await connection_manager.broadcast_to_canvas(canvas_id, {
            "type": "canvas_chat_message",
            "message_id": str(chat_message.id),
            "sender_id": user_id,
            "sender_username": user_info.get("username", "unknown"),
            "message_text": message_text,
            "created_at": chat_message.created_at.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error handling canvas chat WebSocket: {e}")


async def handle_user_presence_websocket(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle user presence updates via WebSocket"""
    try:
        from ...models.chat import UserPresence
        from sqlalchemy import select
        
        presence_type = message.get("presence_type")
        
        if presence_type == "typing":
            # Just broadcast typing indicator, don't store
            user_info = connection_manager.user_info.get(user_id, {})
            await connection_manager.broadcast_to_canvas(canvas_id, {
                "type": "user_typing",
                "user_id": user_id,
                "username": user_info.get("username"),
                "is_typing": message.get("is_typing", False)
            }, exclude_user=user_id)
            
        elif presence_type == "editing_tile":
            # Update database presence and broadcast
            tile_x = message.get("tile_x")
            tile_y = message.get("tile_y")
            is_editing = message.get("is_editing", False)
            
            # Update or create presence
            presence_stmt = select(UserPresence).where(UserPresence.user_id == user_id)
            presence_result = await db.execute(presence_stmt)
            presence = presence_result.scalar_one_or_none()
            
            if presence:
                presence.canvas_id = canvas_id
                presence.current_tile_x = tile_x if is_editing else None
                presence.current_tile_y = tile_y if is_editing else None
                presence.is_editing_tile = is_editing
                presence.last_activity = datetime.now(timezone.utc)
            else:
                presence = UserPresence(
                    user_id=user_id,
                    canvas_id=canvas_id,
                    current_tile_x=tile_x if is_editing else None,
                    current_tile_y=tile_y if is_editing else None,
                    is_editing_tile=is_editing
                )
                db.add(presence)
            
            await db.commit()
            
            # Broadcast presence update
            user_info = connection_manager.user_info.get(user_id, {})
            await connection_manager.broadcast_to_canvas(canvas_id, {
                "type": "user_presence_update",
                "user_id": user_id,
                "username": user_info.get("username"),
                "tile_x": tile_x,
                "tile_y": tile_y,
                "is_editing": is_editing
            }, exclude_user=user_id)
            
    except Exception as e:
        logger.error(f"Error handling user presence WebSocket: {e}")


async def handle_tile_mention_websocket(canvas_id: int, user_id: int, message: dict, db: AsyncSession):
    """Handle tile mention highlighting via WebSocket"""
    try:
        tile_x = message.get("tile_x")
        tile_y = message.get("tile_y")
        
        if tile_x is None or tile_y is None:
            return
        
        user_info = connection_manager.user_info.get(user_id, {})
        
        # Broadcast tile highlight
        await connection_manager.broadcast_to_canvas(canvas_id, {
            "type": "tile_highlight",
            "tile_x": tile_x,
            "tile_y": tile_y,
            "highlight_type": message.get("highlight_type", "mention"),
            "requester_id": user_id,
            "requester_username": user_info.get("username"),
            "message": message.get("message", ""),
            "duration": message.get("duration", 3000)
        })
        
    except Exception as e:
        logger.error(f"Error handling tile mention WebSocket: {e}")


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "total_connections": connection_manager.get_total_connections(),
        "canvas_connections": connection_manager.get_canvas_list()
    }


@router.post("/broadcast/{canvas_id}")
async def admin_broadcast(
    canvas_id: int,
    message: dict,
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to broadcast messages to a canvas"""
    await connection_manager.broadcast_to_canvas(canvas_id, message)
    return {"message": "Broadcast sent"} 