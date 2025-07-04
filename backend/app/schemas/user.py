from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not v.isalnum():
            raise ValueError('Username can only contain letters and numbers')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: int
    username: str
    email: str
    display_name: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    total_points: int = 0
    tiles_created: int = 0
    likes_received: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @validator('display_name')
    def validate_display_name(cls, v):
        if v is not None and len(v) > 100:
            raise ValueError('Display name must be less than 100 characters')
        return v


class UserProfile(BaseModel):
    """Extended user profile with additional stats"""
    id: int
    username: str
    display_name: Optional[str] = None
    total_points: int = 0
    tiles_created: int = 0
    likes_received: int = 0
    created_at: datetime
    is_verified: bool = False
    
    class Config:
        from_attributes = True


class PasswordUpdate(BaseModel):
    """Schema for updating user password"""
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        return v


class AccountDelete(BaseModel):
    """Schema for account deletion confirmation"""
    password: str
    confirm_deletion: bool = False
    
    @validator('confirm_deletion')
    def validate_confirmation(cls, v):
        if not v:
            raise ValueError('You must confirm account deletion')
        return v 