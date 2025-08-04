"""
Main API router for v1 endpoints
"""
from fastapi import APIRouter

from app.api.v1 import auth, users, canvas, tiles, websockets, tile_locks
from .admin import router as admin_router

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(canvas.router, prefix="/canvas", tags=["canvas"])
api_router.include_router(tiles.router, prefix="/tiles", tags=["tiles"])
api_router.include_router(tile_locks.router, prefix="/tiles", tags=["tile-locks"])
api_router.include_router(websockets.router, prefix="/ws", tags=["websockets"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"]) 