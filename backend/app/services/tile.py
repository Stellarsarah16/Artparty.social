"""
Tile service for tile-related business logic
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..repositories.tile import tile_repository
from ..repositories.canvas import canvas_repository
from ..repositories.like import like_repository
from ..schemas.tile import TileCreate, TileUpdate, TileResponse
from ..models.tile import Tile
from ..models.user import User


class TileService:
    """Service for tile-related business logic"""
    
    def __init__(self):
        self.tile_repository = tile_repository
        self.canvas_repository = canvas_repository
        self.like_repository = like_repository
    
    def create_tile(self, db: Session, tile_create: TileCreate, creator: User) -> Tile:
        """Create a new tile with validation"""
        # Validate canvas exists and is active
        canvas = self.canvas_repository.get(db, tile_create.canvas_id)
        if not canvas or not canvas.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Canvas not found or inactive"
            )
        
        # Check if position is already occupied
        if self.tile_repository.is_position_occupied(
            db, canvas_id=tile_create.canvas_id, x=tile_create.x, y=tile_create.y
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Position already occupied by another tile"
            )
        
        # Check user tile limit on this canvas
        user_tiles_count = self.tile_repository.count_user_tiles_on_canvas(
            db, canvas_id=tile_create.canvas_id, creator_id=creator.id
        )
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
        tile_data = tile_create.dict()
        tile_data['creator_id'] = creator.id
        tile = Tile(**tile_data)
        
        db.add(tile)
        db.commit()
        db.refresh(tile)
        
        return tile
    
    def get_tile_by_id(self, db: Session, tile_id: int) -> Optional[Tile]:
        """Get tile by ID"""
        return self.tile_repository.get(db, tile_id)
    
    def get_tile_by_position(self, db: Session, canvas_id: int, x: int, y: int) -> Optional[Tile]:
        """Get tile by position"""
        return self.tile_repository.get_by_position(db, canvas_id=canvas_id, x=x, y=y)
    
    def get_canvas_tiles(self, db: Session, canvas_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles for a canvas"""
        return self.tile_repository.get_by_canvas(db, canvas_id=canvas_id, skip=skip, limit=limit)
    
    def get_user_tiles(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by user"""
        return self.tile_repository.get_by_creator(db, creator_id=user_id, skip=skip, limit=limit)
    
    def get_tile_neighbors(self, db: Session, tile_id: int, radius: int = 1) -> List[Tile]:
        """Get neighboring tiles"""
        return self.tile_repository.get_tile_neighbors(db, tile_id=tile_id, radius=radius)
    
    def get_adjacent_neighbors(self, db: Session, tile_id: int) -> List[Tile]:
        """Get only adjacent neighbors (left, right, top, bottom) of a tile"""
        return self.tile_repository.get_adjacent_neighbors(db, tile_id=tile_id)
    
    def get_adjacent_neighbors_by_position(self, db: Session, canvas_id: int, x: int, y: int) -> List[Tile]:
        """Get adjacent neighbors for a position (even if tile doesn't exist)"""
        return self.tile_repository.get_adjacent_neighbors_by_position(db, canvas_id=canvas_id, x=x, y=y)
    
    def update_tile(self, db: Session, tile_id: int, tile_update: TileUpdate, current_user: User) -> Optional[Tile]:
        """Update tile (only owner can update)"""
        tile = self.tile_repository.get(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        if tile.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own tiles"
            )
        
        return self.tile_repository.update(db, db_obj=tile, obj_in=tile_update)
    
    def delete_tile(self, db: Session, tile_id: int, current_user: User) -> Optional[Tile]:
        """Delete tile (only owner can delete)"""
        tile = self.tile_repository.get(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        if tile.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own tiles"
            )
        
        return self.tile_repository.delete(db, id=tile_id)
    
    def like_tile(self, db: Session, tile_id: int, user_id: int) -> bool:
        """Like a tile"""
        # Check if tile exists
        tile = self.tile_repository.get(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Check if user already liked this tile
        if self.like_repository.user_has_liked_tile(db, user_id=user_id, tile_id=tile_id):
            return False  # Already liked
        
        # Create like
        from ..models.like import Like
        like = Like(user_id=user_id, tile_id=tile_id)
        db.add(like)
        
        # Increment tile like count
        self.tile_repository.increment_like_count(db, tile_id=tile_id)
        
        db.commit()
        return True
    
    def unlike_tile(self, db: Session, tile_id: int, user_id: int) -> bool:
        """Unlike a tile"""
        # Check if tile exists
        tile = self.tile_repository.get(db, tile_id)
        if not tile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tile not found"
            )
        
        # Remove like
        like = self.like_repository.unlike_tile(db, user_id=user_id, tile_id=tile_id)
        if like:
            # Decrement tile like count
            self.tile_repository.decrement_like_count(db, tile_id=tile_id)
            return True
        
        return False  # Like not found
    
    def create_tile_response(self, tile: Tile) -> TileResponse:
        """Create tile response object"""
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


# Create a singleton instance
tile_service = TileService() 