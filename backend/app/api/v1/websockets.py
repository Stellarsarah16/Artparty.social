"""
WebSocket endpoints for real-time collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import json
import logging

from ...core.database import get_db
from ...core.websocket import connection_manager
from ...services.auth import auth_service
from ...models.canvas import Canvas
from ...models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


def get_user_from_token(token: str, db: Session) -> User:
    """Get user from JWT token for WebSocket authentication"""
    try:
        user = auth_service.get_current_user(db, token)
        return user
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@router.websocket("/canvas/{canvas_id}")
async def websocket_canvas_endpoint(
    websocket: WebSocket,
    canvas_id: int,
    token: str = Query(..., description="JWT authentication token"),
    db: Session = Depends(get_db)
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
    user = None
    
    try:
        # Authenticate user (this is a sync function, no need for await)
        user = get_user_from_token(token, db)
        
        # Validate canvas exists
        canvas = db.query(Canvas).filter(
            Canvas.id == canvas_id, 
            Canvas.is_active == True
        ).first()
        
        if not canvas:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Canvas not found")
            return
        
        # Connect user to canvas
        user_info = {
            "username": user.username,
            "display_name": f"{user.first_name} {user.last_name}".strip()
        }
        
        await connection_manager.connect(websocket, canvas_id, user.id, user_info)
        
        try:
            # Listen for incoming messages (optional - for future features like chat)
            while True:
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    await handle_websocket_message(canvas_id, user.id, message, db)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received from user {user.id}: {data}")
                except Exception as e:
                    logger.error(f"Error handling message from user {user.id}: {e}")
                    
        except WebSocketDisconnect:
            logger.info(f"User {user.id} disconnected from canvas {canvas_id}")
        
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error")
    
    finally:
        # Clean up connection
        if user:
            await connection_manager.disconnect(canvas_id, user.id)


async def handle_websocket_message(canvas_id: int, user_id: int, message: dict, db: Session):
    """Handle incoming WebSocket messages from clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Respond to ping with pong
        await connection_manager.send_to_user(canvas_id, user_id, {
            "type": "pong",
            "timestamp": connection_manager._get_timestamp()
        })
    
    elif message_type == "request_canvas_state":
        # Send current canvas state
        canvas_users = []
        for uid in connection_manager.canvas_users.get(canvas_id, set()):
            if uid in connection_manager.user_info:
                canvas_users.append({
                    "user_id": uid,
                    "username": connection_manager.user_info[uid]["username"],
                    "display_name": connection_manager.user_info[uid].get("display_name")
                })
        
        await connection_manager.send_to_user(canvas_id, user_id, {
            "type": "canvas_state",
            "active_users": canvas_users,
            "user_count": len(canvas_users),
            "timestamp": connection_manager._get_timestamp()
        })
    
    elif message_type == "typing_indicator":
        # Broadcast typing indicator to other users (for future chat feature)
        position = message.get("position")  # {"x": int, "y": int}
        if position:
            await connection_manager.broadcast_to_canvas(canvas_id, {
                "type": "user_typing",
                "user_id": user_id,
                "username": connection_manager.user_info.get(user_id, {}).get("username", "unknown"),
                "position": position,
                "timestamp": connection_manager._get_timestamp()
            }, exclude_user=user_id)
    
    else:
        logger.warning(f"Unknown message type '{message_type}' from user {user_id}")


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "total_connections": connection_manager.get_total_connections(),
        "active_canvases": len(connection_manager.canvas_connections),
        "canvas_details": connection_manager.get_canvas_list()
    }


@router.post("/broadcast/{canvas_id}")
async def admin_broadcast(
    canvas_id: int,
    message: dict,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to broadcast messages to all users on a canvas
    (Future feature - requires admin authentication)
    """
    # TODO: Add admin authentication
    
    await connection_manager.broadcast_to_canvas(canvas_id, {
        "type": "admin_message",
        "message": message,
        "timestamp": connection_manager._get_timestamp()
    })
    
    return {"message": f"Broadcasted to canvas {canvas_id}", "user_count": connection_manager.get_canvas_user_count(canvas_id)} 