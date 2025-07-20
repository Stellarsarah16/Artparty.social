from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class AdminUserUpdate(BaseModel):
    """Schema for admin user updates"""
    is_admin: Optional[bool] = None
    is_superuser: Optional[bool] = None
    is_active: Optional[bool] = None
    admin_permissions: Optional[Dict[str, Any]] = None


class AdminUserResponse(BaseModel):
    """Schema for admin user responses"""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_active: bool
    is_admin: bool
    is_superuser: bool
    admin_permissions: Dict[str, Any]
    total_points: int
    tiles_created: int
    likes_received: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AdminCanvasUpdate(BaseModel):
    """Schema for admin canvas updates"""
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    is_moderated: Optional[bool] = None
    max_tiles_per_user: Optional[int] = None


class AdminStats(BaseModel):
    """Schema for admin statistics"""
    total_users: int
    total_canvases: int
    total_tiles: int
    active_users_today: int
    new_users_this_week: int
    new_canvases_this_week: int


class AdminAction(BaseModel):
    """Schema for admin actions"""
    action: str
    target_type: str  # 'user', 'canvas', 'tile'
    target_id: int
    reason: Optional[str] = None
    data: Optional[Dict[str, Any]] = None 