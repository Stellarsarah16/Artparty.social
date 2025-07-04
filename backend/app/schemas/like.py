from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LikeCreate(BaseModel):
    """Schema for creating a like (positive feedback only)"""
    tile_id: int


class LikeResponse(BaseModel):
    """Schema for like data in responses"""
    id: int
    user_id: int
    tile_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LikeWithUser(BaseModel):
    """Like response with user information"""
    id: int
    user_id: int
    username: str
    display_name: Optional[str] = None
    tile_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LikeStats(BaseModel):
    """Statistics for likes on a tile"""
    tile_id: int
    like_count: int
    user_has_liked: bool  # Whether the current user has liked this tile
    recent_likes: int  # Likes in the last 24 hours 