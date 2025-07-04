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


@router.get("/", response_model=List[CanvasResponse])
async def get_canvas_list(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get list of active canvases"""
    canvases = db.query(Canvas).filter(Canvas.is_active == True).offset(skip).limit(limit).all()
    return canvases


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
            "user_id": tile.user_id,
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
        is_active=canvas.is_active,
        max_tiles_per_user=canvas.max_tiles_per_user,
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
            max_tiles_per_user=canvas_create.max_tiles_per_user
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
                is_active=canvas.is_active,
                max_tiles_per_user=canvas.max_tiles_per_user,
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
                is_active=canvas.is_active,
                max_tiles_per_user=canvas.max_tiles_per_user,
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
    """Delete canvas (soft delete)"""
    try:
        # Get canvas
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id).first()
        if not canvas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found"
            )
        
        # Soft delete - mark as inactive
        setattr(canvas, 'is_active', False)
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
    """Get canvas region tiles within specified bounds"""
    canvas = db.query(Canvas).filter(Canvas.id == canvas_id, Canvas.is_active == True).first()
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    # Get tiles within the specified region
    tiles = db.query(Tile).filter(
        Tile.canvas_id == canvas_id,
        Tile.x >= x,
        Tile.x < x + width,
        Tile.y >= y,
        Tile.y < y + height
    ).all()
    
    # Convert tiles to dict format
    tiles_data = []
    for tile in tiles:
        tiles_data.append({
            "id": tile.id,
            "x": tile.x,
            "y": tile.y,
            "pixel_data": tile.pixel_data,
            "user_id": tile.user_id,
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
        "tiles": tiles_data,
        "tile_count": len(tiles_data)
    }


@router.get("/{canvas_id}/stats", response_model=Dict[str, Any])
async def get_canvas_stats(
    canvas_id: int,
    db: Session = Depends(get_db)
):
    """Get canvas statistics"""
    canvas = db.query(Canvas).filter(Canvas.id == canvas_id, Canvas.is_active == True).first()
    if not canvas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas not found"
        )
    
    # Get canvas statistics
    total_tiles = int(db.query(Tile).filter(Tile.canvas_id == canvas_id).count())
    unique_users = int(db.query(Tile.user_id).filter(Tile.canvas_id == canvas_id).distinct().count())
    
    # Calculate coverage percentage
    max_tiles = (canvas.width // canvas.tile_size) * (canvas.height // canvas.tile_size)
    coverage_percentage = (total_tiles / max_tiles) * 100 if max_tiles > 0 else 0
    
    return {
        "canvas_id": canvas_id,
        "canvas_name": canvas.name,
        "total_tiles": total_tiles,
        "unique_contributors": unique_users,
        "max_possible_tiles": max_tiles,
        "coverage_percentage": round(float(coverage_percentage), 2),
        "canvas_size": f"{canvas.width}x{canvas.height}",
        "tile_size": canvas.tile_size,
        "created_at": canvas.created_at
    } 