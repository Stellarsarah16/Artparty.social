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
        logger.info(f"Attempting to authenticate WebSocket token: {token[:20]}...")
        user = auth_service.get_current_user(db, token)
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
        logger.info(f"WebSocket connection attempt for canvas {canvas_id}")
        
        # Accept the WebSocket connection first
        await websocket.accept()
        
        # Authenticate user
        user = get_user_from_token(token, db)
        
        # Validate canvas exists
        canvas = db.query(Canvas).filter(
            Canvas.id == canvas_id, 
            Canvas.is_active == True
        ).first()
        
        if not canvas:
            logger.warning(f"Canvas {canvas_id} not found or inactive")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Canvas not found")
            return
        
        # Connect user to canvas
        user_info = {
            "username": user.username,
            "display_name": f"{user.first_name} {user.last_name}".strip()
        }
        
        await connection_manager.connect(websocket, canvas_id, user.id, user_info)
        logger.info(f"User {user.username} connected to canvas {canvas_id}")
        
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
        
    except HTTPException as e:
        logger.error(f"WebSocket HTTP error: {e.detail}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    except Exception as e:
        logger.error(f"WebSocket error: {type(e).__name__}: {str(e)}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Internal server error")
    
    finally:
        # Clean up connection
        if user:
            await connection_manager.disconnect(canvas_id, user.id)
            logger.info(f"User {user.username} disconnected from canvas {canvas_id}")


async def handle_websocket_message(canvas_id: int, user_id: int, message: dict, db: Session):
    """Handle incoming WebSocket messages from clients"""
    message_type = message.get("type")
    
    if message_type == "ping":
        # Handle ping messages
        pass
    elif message_type == "chat":
        # Handle chat messages (future feature)
        pass
    else:
        logger.warning(f"Unknown message type: {message_type}")


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "total_connections": len(connection_manager.active_connections),
        "canvas_connections": connection_manager.get_canvas_stats()
    }


@router.post("/broadcast/{canvas_id}")
async def admin_broadcast(
    canvas_id: int,
    message: dict,
    db: Session = Depends(get_db)
):
    """Admin endpoint to broadcast messages to a canvas"""
    await connection_manager.broadcast_to_canvas(canvas_id, message)
    return {"message": "Broadcast sent"} 