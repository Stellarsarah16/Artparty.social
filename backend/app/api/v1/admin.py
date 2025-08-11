"""
Admin management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ...core.database import get_db
from ...services.auth import auth_service
from ...services.admin import admin_service
from ...models.user import User
from ...schemas.admin import (
    AdminUserUpdate, AdminUserResponse, AdminCanvasUpdate, 
    AdminStats, AdminAction
)
from ...schemas.canvas import CanvasResponse
from ...repositories.tile_lock import tile_lock_repository
from ...models.tile_lock import TileLock

router = APIRouter()
security = HTTPBearer()


async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated admin user"""
    token = credentials.credentials
    user = auth_service.get_current_user(db, token)
    
    if not user.is_admin and not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user


async def get_current_superuser(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated superuser"""
    token = credentials.credentials
    user = auth_service.get_current_user(db, token)
    
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    
    return user


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get admin statistics"""
    return admin_service.get_user_stats(db)


@router.get("/users", response_model=List[AdminUserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = admin_service.get_all_users(db, skip, limit)
    return users


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_details(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get user details (admin only)"""
    user = admin_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    user_update: AdminUserUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update user (admin only)"""
    user = admin_service.update_user(db, user_id, user_update)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_superuser: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Delete user (superuser only)"""
    success = admin_service.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User deleted successfully"}


@router.get("/canvases", response_model=List[CanvasResponse])
async def get_all_canvases(
    skip: int = 0,
    limit: int = 50,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all canvases (admin only)"""
    canvases = admin_service.get_all_canvases(db, skip, limit)
    return canvases


@router.get("/canvases/{canvas_id}", response_model=CanvasResponse)
async def get_canvas_details(
    canvas_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get canvas details (admin only)"""
    canvas = admin_service.get_canvas_by_id(db, canvas_id)
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    return canvas


@router.put("/canvases/{canvas_id}", response_model=CanvasResponse)
async def update_canvas(
    canvas_id: int,
    canvas_update: AdminCanvasUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update canvas (admin only)"""
    canvas = admin_service.update_canvas(db, canvas_id, canvas_update)
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    return canvas


@router.delete("/canvases/{canvas_id}")
async def delete_canvas(
    canvas_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete canvas (admin only)"""
    success = admin_service.delete_canvas(db, canvas_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    return {"message": "Canvas deleted successfully"}


@router.get("/activity")
async def get_recent_activity(
    limit: int = 20,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get recent system activity (admin only)"""
    activity = admin_service.get_recent_activity(db, limit)
    return {"activity": activity}


@router.post("/make-superuser/{user_id}")
async def make_superuser(
    user_id: int,
    current_superuser: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Make a user a superuser (superuser only)"""
    user = admin_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_superuser = True
    user.is_admin = True
    db.commit()
    
    return {"message": f"User {user.username} is now a superuser"}


# ===== TILE LOCK MANAGEMENT =====

@router.get("/locks")
async def get_all_locks(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all active locks (admin only)"""
    return tile_lock_repository.get_active_locks(db)

@router.get("/locks/statistics")
async def get_lock_statistics(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get lock statistics (admin only)"""
    return tile_lock_repository.get_lock_statistics(db)

@router.delete("/locks/{tile_id}")
async def force_release_lock(
    tile_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Force release a lock on a tile (admin only)"""
    success = tile_lock_repository.force_release_lock(db, tile_id)
    if success:
        return {"message": f"Lock on tile {tile_id} has been force released"}
    else:
        raise HTTPException(status_code=404, detail="No active lock found for this tile")

@router.post("/locks/cleanup")
async def cleanup_all_expired_locks(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Clean up all expired locks (admin only)"""
    count = tile_lock_repository.cleanup_expired_locks(db)
    return {"message": f"Cleaned up {count} expired locks"}

# ===== SYSTEM REPORTS =====

@router.get("/reports/system-overview")
async def get_system_overview(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get system overview report (admin only)"""
    # Get user statistics
    user_stats = admin_service.get_user_stats(db)
    
    # Get lock statistics
    lock_stats = tile_lock_repository.get_lock_statistics(db)
    
    return {
        "users": {
            "total": user_stats.total_users,
            "active": user_stats.active_users,
            "inactive": user_stats.total_users - user_stats.active_users
        },
        "locks": lock_stats,
        "system_health": {
            "status": "healthy" if lock_stats['cleanup_needed'] == False else "needs_cleanup",
            "recommendations": [
                "Run lock cleanup" if lock_stats['cleanup_needed'] else "System is clean"
            ]
        }
    } 