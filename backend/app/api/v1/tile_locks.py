"""
Tile lock management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any

from ...core.database import get_db
from ...services.authentication import authentication_service
from ...services.tile import tile_service
from ...models.user import User

router = APIRouter()
security = HTTPBearer()


@router.options("/{tile_id}")
async def tile_lock_options(tile_id: int):
    """Handle CORS preflight requests for tile lock endpoints"""
    return {"message": "OK"}


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return authentication_service.get_current_user(db, token)


@router.post("/{tile_id}/lock", response_model=Dict[str, Any])
async def acquire_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Acquire a lock for editing a tile"""
    try:
        result = tile_service.acquire_tile_lock(db, tile_id, current_user)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error acquiring tile lock"
        )


@router.delete("/{tile_id}/lock", response_model=Dict[str, str])
async def release_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
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


@router.put("/{tile_id}/lock", response_model=Dict[str, str])
async def extend_tile_lock(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
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


@router.get("/{tile_id}/lock", response_model=Dict[str, Any])
async def get_tile_lock_status(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
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