from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
import re


class UserCreate(BaseModel):
    """Schema for user registration"""
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError('Username is required')
        v = v.strip()
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        if v.startswith('_') or v.endswith('_'):
            raise ValueError('Username cannot start or end with underscore')
        return v.lower()
    
    @validator('email')
    def validate_email_format(cls, v):
        if not v or not v.strip():
            raise ValueError('Email is required')
        # Additional email validation beyond EmailStr
        email_str = str(v).strip().lower()
        if len(email_str) > 100:
            raise ValueError('Email address is too long')
        return email_str
    
    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required')
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password is too long (maximum 128 characters)')
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        # Check for at least one uppercase letter or number
        if not re.search(r'[A-Z0-9]', v):
            raise ValueError('Password must contain at least one uppercase letter or number')
        
        # Check for no common weak passwords
        weak_passwords = [
            'password', 'password123', 'password1', 'password12', 
            '12345678', '123456789', 'qwerty123', 'qwerty', 'abc12345',
            'welcome123', 'admin123', 'letmein', 'iloveyou', 'sunshine',
            'princess', 'football', 'baseball', 'basketball', 'computer'
        ]
        if v.lower() in weak_passwords:
            raise ValueError('Password is too common, please choose a stronger password')
        
        # Check for simple patterns (password + numbers)
        if re.match(r'^password\d+$', v.lower()):
            raise ValueError('Password is too predictable, please choose a stronger password')
        
        return v
    
    @validator('first_name')
    def validate_first_name(cls, v):
        if not v or not v.strip():
            raise ValueError('First name is required')
        v = v.strip()
        if len(v) > 50:
            raise ValueError('First name must be less than 50 characters')
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('First name can only contain letters, spaces, hyphens, and apostrophes')
        return v.title()
    
    @validator('last_name')
    def validate_last_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Last name is required')
        v = v.strip()
        if len(v) > 50:
            raise ValueError('Last name must be less than 50 characters')
        if not re.match(r'^[a-zA-Z\s\-\']+$', v):
            raise ValueError('Last name can only contain letters, spaces, hyphens, and apostrophes')
        return v.title()


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str
    password: str


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
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
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @validator('first_name')
    def validate_first_name(cls, v):
        if v is not None and len(v) > 50:
            raise ValueError('First name must be less than 50 characters')
        return v.strip() if v else v
    
    @validator('last_name')
    def validate_last_name(cls, v):
        if v is not None and len(v) > 50:
            raise ValueError('Last name must be less than 50 characters')
        return v.strip() if v else v


class UserProfile(BaseModel):
    """Extended user profile with additional stats"""
    id: int
    username: str
    first_name: str
    last_name: str
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