"""
User management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...services.auth import auth_service
from ...models.user import User
from ...schemas.user import UserUpdate, UserProfile, UserResponse, PasswordUpdate, AccountDelete

router = APIRouter()
security = HTTPBearer()


@router.options("/profile")
async def profile_options():
    """Handle CORS preflight requests for profile endpoints"""
    return {"message": "OK"}


@router.options("/stats")
async def stats_options():
    """Handle CORS preflight requests for stats endpoints"""
    return {"message": "OK"}


@router.options("/{user_id}")
async def user_options(user_id: int):
    """Handle CORS preflight requests for user endpoints"""
    return {"message": "OK"}


@router.options("/password")
async def password_options():
    """Handle CORS preflight requests for password endpoints"""
    return {"message": "OK"}


@router.options("/account")
async def account_options():
    """Handle CORS preflight requests for account endpoints"""
    return {"message": "OK"}


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return await auth_service.get_current_user(db, token)


@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user_dependency)
):
    """Get current user's detailed profile"""
    return current_user


@router.get("/stats", response_model=Dict[str, Any])
async def get_user_stats(
    current_user: User = Depends(get_current_user_dependency)
):
    """Get current user's statistics"""
    return {
        "total_points": current_user.total_points,
        "tiles_created": current_user.tiles_created,
        "likes_received": current_user.likes_received,
        "account_age_days": (datetime.now() - current_user.created_at).days if current_user.created_at else 0,
        "is_verified": current_user.is_verified
    }


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get public user profile by ID"""
    from sqlalchemy import select
    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserProfile(
        id=user.id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        total_points=user.total_points,
        tiles_created=user.tiles_created,
        likes_received=user.likes_received,
        created_at=user.created_at,
        is_verified=user.is_verified
    )


@router.put("/profile", response_model=Dict[str, Any])
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile information"""
    try:
        # Update user fields
        if user_update.first_name is not None:
            setattr(current_user, 'first_name', user_update.first_name)
        if user_update.last_name is not None:
            setattr(current_user, 'last_name', user_update.last_name)
        if user_update.email is not None:
            setattr(current_user, 'email', user_update.email)
        
        # Save changes
        await db.commit()
        await db.refresh(current_user)
        
        return {
            "message": "Profile updated successfully",
            "user": UserResponse(
                id=current_user.id,
                username=current_user.username,
                email=current_user.email,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
                is_active=current_user.is_active,
                is_verified=current_user.is_verified,
                total_points=current_user.total_points,
                tiles_created=current_user.tiles_created,
                likes_received=current_user.likes_received,
                created_at=current_user.created_at,
                updated_at=current_user.updated_at
            )
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error updating profile"
        )


@router.put("/password", response_model=Dict[str, str])
async def update_password(
    password_update: PasswordUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db)
):
    """Update user's password"""
    try:
        # Verify current password
        if not auth_service.verify_password(password_update.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_password_hash = auth_service.hash_password(password_update.new_password)
        
        # Update password
        setattr(current_user, 'hashed_password', new_password_hash)
        await db.commit()
        
        return {"message": "Password updated successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error updating password"
        )


@router.delete("/account", response_model=Dict[str, str])
async def delete_account(
    account_delete: AccountDelete,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_db)
):
    """Delete user account (soft delete)"""
    try:
        # Verify password
        if not auth_service.verify_password(account_delete.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is incorrect"
            )
        
        # Soft delete - just mark as inactive
        setattr(current_user, 'is_active', False)
        await db.commit()
        
        return {"message": "Account deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error deleting account"
        ) 