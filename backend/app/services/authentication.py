"""
Authentication service that orchestrates user authentication workflow
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.user import User
from ..schemas.user import UserCreate
from .user import user_service
from .token import token_service
from .password import password_service


class AuthenticationService:
    """Service for authentication workflows"""
    
    def __init__(self):
        self.user_service = user_service
        self.token_service = token_service
        self.password_service = password_service
    
    def register_user(self, db: Session, user_create: UserCreate) -> dict:
        """Register a new user and return authentication response"""
        # Create user
        user = self.user_service.create_user(db, user_create)
        
        # Generate token response
        user_data = self.user_service.create_user_response_data(user)
        return self.token_service.create_token_response(user.username, user.id, user_data)
    
    def login_user(self, db: Session, username: str, password: str) -> dict:
        """Authenticate user and return authentication response"""
        # Authenticate user
        user = self.user_service.authenticate_user(db, username, password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        # Generate token response
        user_data = self.user_service.create_user_response_data(user)
        return self.token_service.create_token_response(user.username, user.id, user_data)
    
    def get_current_user(self, db: Session, token: str) -> User:
        """Get current user from JWT token"""
        token_data = self.token_service.verify_token(token)
        
        if token_data.user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = self.user_service.get_user_by_id(db, token_data.user_id)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive"
            )
        
        return user


# Create a singleton instance
authentication_service = AuthenticationService() 