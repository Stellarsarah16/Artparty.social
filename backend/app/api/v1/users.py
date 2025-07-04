"""
User management endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

# Create router
router = APIRouter()


@router.get("/profile")
async def get_profile(db: Session = Depends(get_db)):
    """Get user profile"""
    # TODO: Implement get user profile
    return {"message": "Get user profile endpoint - TODO"}


@router.put("/profile")
async def update_profile(db: Session = Depends(get_db)):
    """Update user profile"""
    # TODO: Implement update user profile
    return {"message": "Update user profile endpoint - TODO"}


@router.get("/tiles")
async def get_user_tiles(db: Session = Depends(get_db)):
    """Get user's tiles"""
    # TODO: Implement get user tiles
    return {"message": "Get user tiles endpoint - TODO"}


@router.get("/points/history")
async def get_points_history(db: Session = Depends(get_db)):
    """Get user's points history"""
    # TODO: Implement get points history
    return {"message": "Get points history endpoint - TODO"} 