"""
API v1 endpoints
"""

from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .canvas import router as canvas_router
from .tiles import router as tiles_router

api_router = APIRouter()

# Include authentication router
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])

# Include users router
api_router.include_router(users_router, prefix="/users", tags=["users"])

# Include canvas router
api_router.include_router(canvas_router, prefix="/canvas", tags=["canvas"])

# Include tiles router
api_router.include_router(tiles_router, prefix="/tiles", tags=["tiles"]) 