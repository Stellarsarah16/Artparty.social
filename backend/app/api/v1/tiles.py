"""
Tiles management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from ...core.database import get_db
from ...core.websocket import connection_manager
from ...services.auth import auth_service
from ...models.user import User
from ...models.canvas import Canvas
from ...models.tile import Tile
from ...schemas.tile import TileCreate, TileUpdate, TileResponse, TileWithCreator, TilePosition
from ...schemas.like import LikeCreate, LikeResponse, LikeWithUser, LikeStats
from ...models.like import Like

router = APIRouter()
security = HTTPBearer()


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return auth_service.get_current_user(db, token)


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_tile(
    tile_create: TileCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new tile (paint on canvas)"""
    try:
        # Validate canvas exists
        canvas = db.query(Canvas).filter(
            Canvas.id == tile_create.canvas_id, 
            Canvas.is_active == True
        ).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Check if position is already occupied
        existing_tile = db.query(Tile).filter(
            Tile.canvas_id == tile_create.canvas_id,
            Tile.x == tile_create.x,
            Tile.y == tile_create.y
        ).first()
        if existing_tile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Position already occupied by another tile"
            )
        
        # Check user tile limit on this canvas
        user_tiles_count = db.query(Tile).filter(
            Tile.canvas_id == tile_create.canvas_id,
            Tile.creator_id == current_user.id
        ).count()
        if user_tiles_count >= canvas.max_tiles_per_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum {canvas.max_tiles_per_user} tiles per user on this canvas"
            )
        
        # Validate position is within canvas bounds
        max_x = canvas.width // canvas.tile_size
        max_y = canvas.height // canvas.tile_size
        if tile_create.x >= max_x or tile_create.y >= max_y:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position out of bounds. Max position: ({max_x-1}, {max_y-1})"
            )
        
        # Create tile
        tile = Tile(
            canvas_id=tile_create.canvas_id,
            creator_id=current_user.id,
            x=tile_create.x,
            y=tile_create.y,
            pixel_data=tile_create.pixel_data,
            title=tile_create.title,
            description=tile_create.description,
            is_public=tile_create.is_public
        )
        
        db.add(tile)
        db.commit()
        db.refresh(tile)
        
        # Update user stats
        setattr(current_user, 'tiles_created', current_user.tiles_created + 1)
        db.commit()
        
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
            "tile": TileResponse(
                id=tile.id,
                canvas_id=tile.canvas_id,
                creator_id=tile.creator_id,
                x=tile.x,
                y=tile.y,
                pixel_data=tile.pixel_data,
                title=tile.title,
                description=tile.description,
                is_public=tile.is_public,
                like_count=tile.like_count,
                created_at=tile.created_at,
                updated_at=tile.updated_at
            )
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
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
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
        creator_display_name=creator.display_name,
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
        # Get tile
        tile = db.query(Tile).filter(Tile.id == tile_id).first()
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check if user is the creator
        if tile.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the tile creator can update it"
            )
        
        # Update tile fields
        if tile_update.pixel_data is not None:
            setattr(tile, 'pixel_data', tile_update.pixel_data)
        if tile_update.title is not None:
            setattr(tile, 'title', tile_update.title)
        if tile_update.description is not None:
            setattr(tile, 'description', tile_update.description)
        if tile_update.is_public is not None:
            setattr(tile, 'is_public', tile_update.is_public)
        
        db.commit()
        db.refresh(tile)
        
        return {
            "message": "Tile updated successfully",
            "tile": TileResponse(
                id=tile.id,
                canvas_id=tile.canvas_id,
                creator_id=tile.creator_id,
                x=tile.x,
                y=tile.y,
                pixel_data=tile.pixel_data,
                title=tile.title,
                description=tile.description,
                is_public=tile.is_public,
                like_count=tile.like_count,
                created_at=tile.created_at,
                updated_at=tile.updated_at
            )
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
        # Get tile
        tile = db.query(Tile).filter(Tile.id == tile_id).first()
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check if user is the creator
        if tile.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the tile creator can delete it"
            )
        
        # Delete tile
        db.delete(tile)
        
        # Update user stats
        setattr(current_user, 'tiles_created', max(0, current_user.tiles_created - 1))
        db.commit()
        
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
    """Get neighboring tiles (8 directions)"""
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tile not found"
        )
    
    # Get all tiles in a 3x3 grid around this tile
    neighbors = db.query(Tile).filter(
        Tile.canvas_id == tile.canvas_id,
        Tile.x >= tile.x - 1,
        Tile.x <= tile.x + 1,
        Tile.y >= tile.y - 1,
        Tile.y <= tile.y + 1,
        Tile.id != tile.id  # Exclude the tile itself
    ).all()
    
    return [TileResponse(
        id=t.id,
        canvas_id=t.canvas_id,
        creator_id=t.creator_id,
        x=t.x,
        y=t.y,
        pixel_data=t.pixel_data,
        title=t.title,
        description=t.description,
        is_public=t.is_public,
        like_count=t.like_count,
        created_at=t.created_at,
        updated_at=t.updated_at
    ) for t in neighbors]


@router.get("/canvas/{canvas_id}", response_model=List[TileResponse])
async def get_canvas_tiles(
    canvas_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get tiles for a specific canvas"""
    # Validate canvas exists
    canvas = db.query(Canvas).filter(
        Canvas.id == canvas_id, 
        Canvas.is_active == True
    ).first()
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    # Get tiles
    tiles = db.query(Tile).filter(
        Tile.canvas_id == canvas_id,
        Tile.is_public == True
    ).offset(skip).limit(limit).all()
    
    return [TileResponse(
        id=t.id,
        canvas_id=t.canvas_id,
        creator_id=t.creator_id,
        x=t.x,
        y=t.y,
        pixel_data=t.pixel_data,
        title=t.title,
        description=t.description,
        is_public=t.is_public,
        like_count=t.like_count,
        created_at=t.created_at,
        updated_at=t.updated_at
    ) for t in tiles]


@router.get("/canvas/{canvas_id}/position", response_model=TileResponse)
async def get_tile_at_position(
    canvas_id: int,
    x: int,
    y: int,
    db: Session = Depends(get_db)
):
    """Get tile at specific position"""
    tile = db.query(Tile).filter(
        Tile.canvas_id == canvas_id,
        Tile.x == x,
        Tile.y == y
    ).first()
    
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tile found at this position"
        )
    
    return TileResponse(
        id=tile.id,
        canvas_id=tile.canvas_id,
        creator_id=tile.creator_id,
        x=tile.x,
        y=tile.y,
        pixel_data=tile.pixel_data,
        title=tile.title,
        description=tile.description,
        is_public=tile.is_public,
        like_count=tile.like_count,
        created_at=tile.created_at,
        updated_at=tile.updated_at
    )


@router.get("/user/{user_id}", response_model=List[TileResponse])
async def get_user_tiles(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get tiles created by a specific user"""
    # Get user's public tiles
    tiles = db.query(Tile).filter(
        Tile.creator_id == user_id,
        Tile.is_public == True
    ).offset(skip).limit(limit).all()
    
    return [TileResponse(
        id=t.id,
        canvas_id=t.canvas_id,
        creator_id=t.creator_id,
        x=t.x,
        y=t.y,
        pixel_data=t.pixel_data,
        title=t.title,
        description=t.description,
        is_public=t.is_public,
        like_count=t.like_count,
        created_at=t.created_at,
        updated_at=t.updated_at
    ) for t in tiles] 


# LIKE SYSTEM ENDPOINTS (Positive-Only Feedback)

@router.post("/{tile_id}/like", response_model=Dict[str, Any])
async def like_tile(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Like a tile (positive feedback only)"""
    try:
        # Check if tile exists
        tile = db.query(Tile).filter(Tile.id == tile_id).first()
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check if user already liked this tile
        existing_like = db.query(Like).filter(
            Like.user_id == current_user.id,
            Like.tile_id == tile_id
        ).first()
        
        if existing_like:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already liked this tile"
            )
        
        # Create like
        like = Like(
            user_id=current_user.id,
            tile_id=tile_id
        )
        
        db.add(like)
        
        # Update tile like count
        setattr(tile, 'like_count', tile.like_count + 1)
        
        # Update user stats (likes received by tile creator)
        if tile.creator_id != current_user.id:  # Don't count self-likes
            creator = db.query(User).filter(User.id == tile.creator_id).first()
            if creator:
                setattr(creator, 'likes_received', creator.likes_received + 1)
        
        db.commit()
        db.refresh(like)
        
        return {
            "message": "Tile liked successfully",
            "like": LikeResponse(
                id=like.id,
                user_id=like.user_id,
                tile_id=like.tile_id,
                created_at=like.created_at
            ),
            "new_like_count": tile.like_count
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
    """Unlike a tile (remove like)"""
    try:
        # Check if tile exists
        tile = db.query(Tile).filter(Tile.id == tile_id).first()
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Find the like
        like = db.query(Like).filter(
            Like.user_id == current_user.id,
            Like.tile_id == tile_id
        ).first()
        
        if not like:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You haven't liked this tile"
            )
        
        # Remove like
        db.delete(like)
        
        # Update tile like count
        setattr(tile, 'like_count', max(0, tile.like_count - 1))
        
        # Update user stats (likes received by tile creator)
        if tile.creator_id != current_user.id:  # Don't count self-likes
            creator = db.query(User).filter(User.id == tile.creator_id).first()
            if creator:
                setattr(creator, 'likes_received', max(0, creator.likes_received - 1))
        
        db.commit()
        
        return {"message": "Tile unliked successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error unliking tile"
        )


@router.get("/{tile_id}/likes", response_model=List[LikeWithUser])
async def get_tile_likes(
    tile_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get users who liked a tile"""
    # Check if tile exists
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tile not found"
        )
    
    # Get likes with user information
    likes = db.query(Like).join(User).filter(
        Like.tile_id == tile_id
    ).offset(skip).limit(limit).all()
    
    return [LikeWithUser(
        id=like.id,
        user_id=like.user_id,
        username=like.user.username,
        display_name=like.user.display_name,
        tile_id=like.tile_id,
        created_at=like.created_at
    ) for like in likes]


@router.get("/{tile_id}/like-stats", response_model=LikeStats)
async def get_tile_like_stats(
    tile_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Get like statistics for a tile"""
    # Check if tile exists
    tile = db.query(Tile).filter(Tile.id == tile_id).first()
    if not tile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tile not found"
        )
    
    # Check if current user has liked this tile
    user_has_liked = db.query(Like).filter(
        Like.user_id == current_user.id,
        Like.tile_id == tile_id
    ).first() is not None
    
    # Get recent likes (last 24 hours)
    from datetime import datetime, timedelta
    yesterday = datetime.now() - timedelta(days=1)
    recent_likes_count = db.query(Like).filter(
        Like.tile_id == tile_id,
        Like.created_at >= yesterday
    ).count()
    
    return LikeStats(
        tile_id=tile_id,
        like_count=tile.like_count,
        user_has_liked=user_has_liked,
        recent_likes=int(recent_likes_count)
    ) 