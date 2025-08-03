"""
Canvas management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ...core.database import get_db
from ...services.auth import auth_service
from ...models.user import User
from ...models.canvas import Canvas
from ...models.tile import Tile
from ...schemas.canvas import CanvasCreate, CanvasUpdate, CanvasResponse, CanvasWithTiles

router = APIRouter()
security = HTTPBearer()


async def get_current_user_dependency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return auth_service.get_current_user(db, token)


@router.get("", response_model=List[CanvasResponse])
async def get_canvas_list(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get list of active canvases with stats"""
    canvases = db.query(Canvas).filter(Canvas.is_active == True).offset(skip).limit(limit).all()
    
    # Add stats to each canvas
    canvas_responses = []
    for canvas in canvases:
        # Get tile count for this canvas
        tile_count = db.query(Tile).filter(Tile.canvas_id == canvas.id).count()
        
        # Get unique user count for this canvas
        user_count = db.query(Tile.creator_id).filter(Tile.canvas_id == canvas.id).distinct().count()
        
        canvas_responses.append(CanvasResponse(
            id=canvas.id,
            name=canvas.name,
            description=canvas.description,
            width=canvas.width,
            height=canvas.height,
            tile_size=canvas.tile_size,
            palette_type=canvas.palette_type,
            is_active=canvas.is_active,
            max_tiles_per_user=canvas.max_tiles_per_user,
            collaboration_mode=canvas.collaboration_mode,
            auto_save_interval=canvas.auto_save_interval,
            is_public=canvas.is_public,
            is_moderated=canvas.is_moderated,
            creator_id=canvas.creator_id,
            total_tiles=tile_count,
            user_count=user_count,
            created_at=canvas.created_at,
            updated_at=canvas.updated_at
        ))
    
    return canvas_responses


@router.get("/{canvas_id}", response_model=CanvasWithTiles)
async def get_canvas_details(
    canvas_id: int,
    db: Session = Depends(get_db)
):
    """Get canvas details with tiles"""
    canvas = db.query(Canvas).filter(Canvas.id == canvas_id, Canvas.is_active == True).first()
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    # Get tiles for this canvas
    tiles = db.query(Tile).filter(Tile.canvas_id == canvas_id).all()
    
    # Convert tiles to dict format
    tiles_data = []
    for tile in tiles:
        tiles_data.append({
            "id": tile.id,
            "x": tile.x,
            "y": tile.y,
            "pixel_data": tile.pixel_data,
            "creator_id": tile.creator_id,
            "created_at": tile.created_at,
            "updated_at": tile.updated_at
        })
    
    return CanvasWithTiles(
        id=canvas.id,
        name=canvas.name,
        description=canvas.description,
        width=canvas.width,
        height=canvas.height,
        tile_size=canvas.tile_size,
        palette_type=canvas.palette_type,
        is_active=canvas.is_active,
        max_tiles_per_user=canvas.max_tiles_per_user,
        collaboration_mode=canvas.collaboration_mode,
        auto_save_interval=canvas.auto_save_interval,
        is_public=canvas.is_public,
        is_moderated=canvas.is_moderated,
        created_at=canvas.created_at,
        tiles=tiles_data
    )


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_canvas(
    canvas_create: CanvasCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Create a new canvas"""
    try:
        # Create new canvas
        canvas = Canvas(
            name=canvas_create.name,
            description=canvas_create.description,
            width=canvas_create.width,
            height=canvas_create.height,
            tile_size=canvas_create.tile_size,
            palette_type=canvas_create.palette_type,
            max_tiles_per_user=canvas_create.max_tiles_per_user,
            collaboration_mode=canvas_create.collaboration_mode,
            auto_save_interval=canvas_create.auto_save_interval,
            is_public=canvas_create.is_public,
            is_moderated=canvas_create.is_moderated,
            creator_id=current_user.id
        )
        
        db.add(canvas)
        db.commit()
        db.refresh(canvas)
        
        return {
            "message": "Canvas created successfully",
            "canvas": CanvasResponse(
                id=canvas.id,
                name=canvas.name,
                description=canvas.description,
                width=canvas.width,
                height=canvas.height,
                tile_size=canvas.tile_size,
                palette_type=canvas.palette_type,
                is_active=canvas.is_active,
                max_tiles_per_user=canvas.max_tiles_per_user,
                collaboration_mode=canvas.collaboration_mode,
                auto_save_interval=canvas.auto_save_interval,
                is_public=canvas.is_public,
                is_moderated=canvas.is_moderated,
                creator_id=canvas.creator_id,
                total_tiles=0,
                user_count=0,
                created_at=canvas.created_at,
                updated_at=canvas.updated_at
            )
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error creating canvas"
        )


@router.put("/{canvas_id}", response_model=Dict[str, Any])
async def update_canvas(
    canvas_id: int,
    canvas_update: CanvasUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Update canvas information"""
    try:
        # Get canvas
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Update canvas fields
        if canvas_update.name is not None:
            setattr(canvas, 'name', canvas_update.name)
        if canvas_update.description is not None:
            setattr(canvas, 'description', canvas_update.description)
        if canvas_update.is_active is not None:
            setattr(canvas, 'is_active', canvas_update.is_active)
        if canvas_update.max_tiles_per_user is not None:
            setattr(canvas, 'max_tiles_per_user', canvas_update.max_tiles_per_user)
        if canvas_update.palette_type is not None:
            setattr(canvas, 'palette_type', canvas_update.palette_type)
        if canvas_update.collaboration_mode is not None:
            setattr(canvas, 'collaboration_mode', canvas_update.collaboration_mode)
        if canvas_update.auto_save_interval is not None:
            setattr(canvas, 'auto_save_interval', canvas_update.auto_save_interval)
        if canvas_update.is_public is not None:
            setattr(canvas, 'is_public', canvas_update.is_public)
        if canvas_update.is_moderated is not None:
            setattr(canvas, 'is_moderated', canvas_update.is_moderated)
        
        db.commit()
        db.refresh(canvas)
        
        return {
            "message": "Canvas updated successfully",
            "canvas": CanvasResponse(
                id=canvas.id,
                name=canvas.name,
                description=canvas.description,
                width=canvas.width,
                height=canvas.height,
                tile_size=canvas.tile_size,
                palette_type=canvas.palette_type,
                is_active=canvas.is_active,
                max_tiles_per_user=canvas.max_tiles_per_user,
                collaboration_mode=canvas.collaboration_mode,
                auto_save_interval=canvas.auto_save_interval,
                is_public=canvas.is_public,
                is_moderated=canvas.is_moderated,
                created_at=canvas.created_at,
                updated_at=canvas.updated_at
            )
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error updating canvas"
        )


@router.delete("/{canvas_id}", response_model=Dict[str, str])
async def delete_canvas(
    canvas_id: int,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db)
):
    """Delete a canvas (soft delete by setting is_active to False)"""
    try:
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Soft delete
        canvas.is_active = False
        db.commit()
        
        return {"message": "Canvas deleted successfully"}
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error deleting canvas"
        )


@router.get("/{canvas_id}/region", response_model=Dict[str, Any])
async def get_canvas_region(
    canvas_id: int,
    x: int = 0,
    y: int = 0,
    width: int = 512,
    height: int = 512,
    db: Session = Depends(get_db)
):
    """Get a specific region of the canvas with tiles"""
    try:
        # Get canvas
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id, Canvas.is_active == True).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Calculate tile coordinates for the region
        tile_size = canvas.tile_size
        start_tile_x = x // tile_size
        start_tile_y = y // tile_size
        end_tile_x = (x + width - 1) // tile_size
        end_tile_y = (y + height - 1) // tile_size
        
        # Get tiles in the region
        tiles = db.query(Tile).filter(
            Tile.canvas_id == canvas_id,
            Tile.x >= start_tile_x,
            Tile.x <= end_tile_x,
            Tile.y >= start_tile_y,
            Tile.y <= end_tile_y
        ).all()
        
        # Convert tiles to dict format
        tiles_data = []
        for tile in tiles:
            tiles_data.append({
                "id": tile.id,
                "x": tile.x,
                "y": tile.y,
                "pixel_data": tile.pixel_data,
                "creator_id": tile.creator_id,
                "created_at": tile.created_at,
                "updated_at": tile.updated_at
            })
        
        return {
            "canvas_id": canvas_id,
            "region": {
                "x": x,
                "y": y,
                "width": width,
                "height": height
            },
            "tile_size": tile_size,
            "tiles": tiles_data
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error getting canvas region"
        )


@router.get("/{canvas_id}/stats", response_model=Dict[str, Any])
async def get_canvas_stats(
    canvas_id: int,
    db: Session = Depends(get_db)
):
    """Get canvas statistics"""
    try:
        # Get canvas
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id, Canvas.is_active == True).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Get tile count
        tile_count = db.query(Tile).filter(Tile.canvas_id == canvas_id).count()
        
        # Calculate total tiles possible
        total_tiles_possible = (canvas.width // canvas.tile_size) * (canvas.height // canvas.tile_size)
        
        # Calculate completion percentage
        completion_percentage = (tile_count / total_tiles_possible * 100) if total_tiles_possible > 0 else 0
        
        return {
            "canvas_id": canvas_id,
            "total_tiles": tile_count,
            "total_tiles_possible": total_tiles_possible,
            "completion_percentage": round(completion_percentage, 2),
            "canvas_width": canvas.width,
            "canvas_height": canvas.height,
            "tile_size": canvas.tile_size
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error getting canvas stats"
        ) 