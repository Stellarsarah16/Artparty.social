"""
Tile lock management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ...core.database import get_db
from ...services.auth import auth_service
from ...services.tile import tile_service
from ...models.user import User
from ...models.tile_lock import TileLock
from ...schemas.tile_lock import TileLockResponse, TileLockCreate, TileLockUpdate

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.options("/{tile_id}")
async def tile_lock_options(tile_id: int):
    """Handle CORS preflight requests for tile lock endpoints"""
    return {"message": "OK"}


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return auth_service.get_current_user(db, token)


@router.post("/{tile_id}/lock", response_model=TileLockResponse)
async def acquire_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acquire a lock for editing a tile"""
    try:
        print(f"🔒 Attempting to acquire lock for tile {tile_id} by user {current_user.username}")
        result = tile_service.acquire_tile_lock(db, tile_id, current_user)
        print(f"✅ Successfully acquired lock for tile {tile_id}")
        return result
    except HTTPException as e:
        print(f"❌ HTTP Exception in acquire_tile_lock: {e.status_code} - {e.detail}")
        raise e
    except Exception as e:
        print(f"❌ Unexpected error in acquire_tile_lock: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error acquiring tile lock: {str(e)}"
        )


@router.delete("/{tile_id}/lock")
async def release_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Release a lock for a tile"""
    try:
        result = tile_service.release_tile_lock(db, tile_id, current_user)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error releasing tile lock"
        )


@router.put("/{tile_id}/lock")
async def extend_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extend a lock for a tile"""
    try:
        result = tile_service.extend_tile_lock(db, tile_id, current_user)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error extending tile lock"
        )


@router.get("/{tile_id}/lock", response_model=TileLockResponse)
async def get_tile_lock_status(
    tile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the lock status for a tile"""
    try:
        result = tile_service.get_tile_lock_status(db, tile_id, current_user)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error getting tile lock status"
        ) 