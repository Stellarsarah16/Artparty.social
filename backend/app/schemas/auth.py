from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Token payload data"""
    username: Optional[str] = None
    user_id: Optional[int] = None


class AuthResponse(BaseModel):
    """Authentication response with user data and token"""
    user: dict  # Will contain UserResponse data
    token: Token
    
    class Config:
        from_attributes = True 