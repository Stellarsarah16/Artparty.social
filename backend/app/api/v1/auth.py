"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any

from ...core.database import get_db
from ...services.auth import auth_service
from ...schemas.user import UserCreate, UserLogin, UserResponse
from ...schemas.auth import Token

router = APIRouter()
security = HTTPBearer()


@router.post("/register", response_model=Dict[str, Any])
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account"""
    try:
        # Create new user
        user = auth_service.create_user(db, user_create)
        
        # Generate JWT token
        token_response = auth_service.create_token_response(user)
        
        return {
            "message": "User registered successfully",
            "user": token_response["user"],
            "access_token": token_response["access_token"],
            "token_type": token_response["token_type"],
            "expires_in": token_response["expires_in"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )


@router.post("/login", response_model=Dict[str, Any])
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    try:
        # Authenticate user
        user = auth_service.authenticate_user(db, user_login.username, user_login.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Generate JWT token
        token_response = auth_service.create_token_response(user)
        
        return {
            "message": "Login successful",
            "user": token_response["user"],
            "access_token": token_response["access_token"],
            "token_type": token_response["token_type"],
            "expires_in": token_response["expires_in"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user information from JWT token"""
    try:
        # Extract token from Authorization header
        token = credentials.credentials
        
        # Get current user
        user = auth_service.get_current_user(db, token)
        
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            total_points=user.total_points,
            tiles_created=user.tiles_created,
            likes_received=user.likes_received,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error getting user info"
        )


@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Refresh JWT token"""
    try:
        # Extract token from Authorization header
        token = credentials.credentials
        
        # Get current user (this validates the token)
        user = auth_service.get_current_user(db, token)
        
        # Generate new token
        token_response = auth_service.create_token_response(user)
        
        return {
            "message": "Token refreshed successfully",
            "access_token": token_response["access_token"],
            "token_type": token_response["token_type"],
            "expires_in": token_response["expires_in"]
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error refreshing token"
        )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {
        "message": "Logout successful. Please remove the token from client storage."
    }


# Dependency to get current user (reusable)
async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return auth_service.get_current_user(db, token) 