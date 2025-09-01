"""
API v1 endpoints
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .canvas import router as canvas_router
from .tiles import router as tiles_router
from .tile_locks import router as tile_locks_router
from .websockets import router as websockets_router
from .admin import router as admin_router
from .chat import router as chat_router

api_router = APIRouter()

# Include authentication router
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Include users router
api_router.include_router(users_router, prefix="/users", tags=["users"])

# Include canvas router
api_router.include_router(canvas_router, prefix="/canvas", tags=["canvas"])

# Include tiles router
api_router.include_router(tiles_router, prefix="/tiles", tags=["tiles"])

# Include tile locks router
api_router.include_router(tile_locks_router, prefix="/tile-locks", tags=["tile-locks"])

# Include WebSocket router
api_router.include_router(websockets_router, prefix="/ws", tags=["websockets"])

# Include admin router
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])

# Include chat router
api_router.include_router(chat_router, prefix="/chat", tags=["chat"]) 