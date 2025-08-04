"""
Schemas for tile lock operations
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TileLockCreate(BaseModel):
    """Schema for creating a tile lock"""
    tile_id: int
    minutes: int = 30


class TileLockResponse(BaseModel):
    """Schema for tile lock response"""
    id: int
    tile_id: int
    user_id: int
    locked_at: datetime
    expires_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class TileLockStatus(BaseModel):
    """Schema for tile lock status"""
    is_locked: bool
    locked_by_user_id: Optional[int] = None
    locked_by_username: Optional[str] = None
    expires_at: Optional[datetime] = None
    can_acquire: bool 