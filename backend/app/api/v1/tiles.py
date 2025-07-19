"""
Tiles management endpoints - Refactored with service layer
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ...core.database import get_db
from ...core.websocket import connection_manager
from ...services.authentication import authentication_service
from ...services.tile import tile_service
from ...services.user import user_service
from ...models.user import User
from ...models.tile import Tile
from ...schemas.tile import TileCreate, TileUpdate, TileResponse, TileWithCreator

router = APIRouter()
security = HTTPBearer()


@router.options("/")
async def tiles_options():
    """Handle CORS preflight requests for tiles endpoints"""
    return {"message": "OK"}


@router.options("/{tile_id}")
async def tile_options(tile_id: int):
    """Handle CORS preflight requests for specific tile endpoints"""
    return {"message": "OK"}


@router.options("/{tile_id}/like")
async def tile_like_options(tile_id: int):
    """Handle CORS preflight requests for tile like endpoints"""
    return {"message": "OK"}


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return authentication_service.get_current_user(db, token)


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_tile(
    tile_create: TileCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new tile (paint on canvas)"""
    try:
        # Create tile using service
        tile = tile_service.create_tile(db, tile_create, current_user)
        
        # Update user stats
        user_service.increment_tiles_created(db, current_user.id)
        
        # Broadcast tile creation to WebSocket clients
        tile_data = {
            "id": tile.id,
            "canvas_id": tile.canvas_id,
            "creator_id": tile.creator_id,
            "x": tile.x,
            "y": tile.y,
            "pixel_data": tile.pixel_data,
            "title": tile.title,
            "description": tile.description,
            "is_public": tile.is_public,
            "like_count": tile.like_count,
            "created_at": tile.created_at.isoformat(),
            "updated_at": tile.updated_at.isoformat() if tile.updated_at else None
        }
        await connection_manager.broadcast_tile_created(tile.canvas_id, tile_data, current_user.id)
        
        return {
            "message": "Tile created successfully",
            "tile": tile_service.create_tile_response(tile)
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error creating tile"
        )


@router.get("/{tile_id}", response_model=TileWithCreator)
async def get_tile_details(
    tile_id: int,
    db: Session = Depends(get_db)
):
    """Get tile details with creator information"""
    tile = tile_service.get_tile_by_id(db, tile_id)
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tile not found"
        )
    
    # Get creator information
    creator = tile.creator
    
    return TileWithCreator(
        id=tile.id,
        canvas_id=tile.canvas_id,
        creator_id=tile.creator_id,
        creator_username=creator.username,
        creator_display_name=f"{creator.first_name} {creator.last_name}",
        x=tile.x,
        y=tile.y,
        pixel_data=tile.pixel_data,
        title=tile.title,
        description=tile.description,
        is_public=tile.is_public,
        like_count=tile.like_count,
        created_at=tile.created_at
    )


@router.put("/{tile_id}", response_model=Dict[str, Any])
async def update_tile(
    tile_id: int,
    tile_update: TileUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update tile (only owner can update)"""
    try:
        # Update tile using service
        tile = tile_service.update_tile(db, tile_id, tile_update, current_user)
        
        # Broadcast tile update to WebSocket clients
        tile_data = {
            "id": tile.id,
            "canvas_id": tile.canvas_id,
            "creator_id": tile.creator_id,
            "x": tile.x,
            "y": tile.y,
            "pixel_data": tile.pixel_data,
            "title": tile.title,
            "description": tile.description,
            "is_public": tile.is_public,
            "like_count": tile.like_count,
            "created_at": tile.created_at.isoformat(),
            "updated_at": tile.updated_at.isoformat() if tile.updated_at else None
        }
        await connection_manager.broadcast_tile_updated(tile.canvas_id, tile_data, current_user.id)
        
        return {
            "message": "Tile updated successfully",
            "tile": tile_service.create_tile_response(tile)
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error updating tile"
        )


@router.delete("/{tile_id}", response_model=Dict[str, str])
async def delete_tile(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete tile (only owner can delete)"""
    try:
        # Delete tile using service
        tile = tile_service.delete_tile(db, tile_id, current_user)
        
        # Broadcast tile deletion to WebSocket clients
        await connection_manager.broadcast_tile_deleted(tile.canvas_id, tile_id, current_user.id)
        
        return {"message": "Tile deleted successfully"}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error deleting tile"
        )


@router.get("/{tile_id}/neighbors", response_model=List[TileResponse])
async def get_tile_neighbors(
    tile_id: int,
    db: Session = Depends(get_db)
):
    """Get neighboring tiles around a tile"""
    neighbors = tile_service.get_tile_neighbors(db, tile_id)
    return [tile_service.create_tile_response(tile) for tile in neighbors]


@router.get("/{tile_id}/adjacent-neighbors", response_model=List[TileResponse])
async def get_adjacent_neighbors(
    tile_id: int,
    db: Session = Depends(get_db)
):
    """Get only adjacent neighbors (left, right, top, bottom) of a tile"""
    neighbors = tile_service.get_adjacent_neighbors(db, tile_id)
    return [tile_service.create_tile_response(tile) for tile in neighbors]


@router.get("/canvas/{canvas_id}", response_model=List[TileResponse])
async def get_canvas_tiles(
    canvas_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get tiles for a specific canvas"""
    tiles = tile_service.get_canvas_tiles(db, canvas_id, skip, limit)
    return [tile_service.create_tile_response(tile) for tile in tiles]


@router.get("/canvas/{canvas_id}/position", response_model=TileResponse)
async def get_tile_at_position(
    canvas_id: int,
    x: int,
    y: int,
    db: Session = Depends(get_db)
):
    """Get tile at specific position"""
    tile = tile_service.get_tile_by_position(db, canvas_id, x, y)
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tile found at this position"
        )
    
    return tile_service.create_tile_response(tile)


@router.get("/canvas/{canvas_id}/position/neighbors", response_model=List[TileResponse])
async def get_neighbors_at_position(
    canvas_id: int,
    x: int,
    y: int,
    db: Session = Depends(get_db)
):
    """Get adjacent neighbors for a position (even if tile doesn't exist)"""
    neighbors = tile_service.get_adjacent_neighbors_by_position(db, canvas_id, x, y)
    return [tile_service.create_tile_response(tile) for tile in neighbors]


@router.get("/user/{user_id}", response_model=List[TileResponse])
async def get_user_tiles(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get tiles by a specific user"""
    tiles = tile_service.get_user_tiles(db, user_id, skip, limit)
    return [tile_service.create_tile_response(tile) for tile in tiles]


@router.post("/{tile_id}/like", response_model=Dict[str, Any])
async def like_tile(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Like a tile"""
    try:
        # Like tile using service
        liked = tile_service.like_tile(db, tile_id, current_user.id)
        
        if liked:
            # Update creator's like count
            tile = tile_service.get_tile_by_id(db, tile_id)
            if tile:
                user_service.increment_likes_received(db, tile.creator_id)
            
            # Broadcast like to WebSocket clients
            await connection_manager.broadcast_tile_liked(tile.canvas_id, tile_id, current_user.id)
            
            return {
                "message": "Tile liked successfully",
                "liked": True
            }
        else:
            return {
                "message": "Tile already liked",
                "liked": False
            }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error liking tile"
        )


@router.delete("/{tile_id}/like", response_model=Dict[str, str])
async def unlike_tile(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Unlike a tile"""
    try:
        # Unlike tile using service
        unliked = tile_service.unlike_tile(db, tile_id, current_user.id)
        
        if unliked:
            # Update creator's like count
            tile = tile_service.get_tile_by_id(db, tile_id)
            if tile:
                user_service.decrement_likes_received(db, tile.creator_id)
            
            # Broadcast unlike to WebSocket clients
            await connection_manager.broadcast_tile_unliked(tile.canvas_id, tile_id, current_user.id)
            
            return {"message": "Tile unliked successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Like not found"
            )
            
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error unliking tile"
        ) 