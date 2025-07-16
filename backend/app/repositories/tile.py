"""
Tile repository for tile-specific database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from .base import SQLAlchemyRepository
from ..models.tile import Tile
from ..schemas.tile import TileCreate, TileUpdate


class TileRepository(SQLAlchemyRepository[Tile, TileCreate, TileUpdate]):
    """Tile repository with tile-specific operations"""
    
    def __init__(self):
        super().__init__(Tile)
    
    def get_by_position(self, db: Session, *, canvas_id: int, x: int, y: int) -> Optional[Tile]:
        """Get tile by position on canvas"""
        return db.query(Tile).filter(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.x == x,
                Tile.y == y
            )
        ).first()
    
    def get_by_canvas(self, db: Session, *, canvas_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by canvas ID"""
        return db.query(Tile).filter(
            Tile.canvas_id == canvas_id
        ).offset(skip).limit(limit).all()
    
    def get_by_creator(self, db: Session, *, creator_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by creator ID"""
        return db.query(Tile).filter(
            Tile.creator_id == creator_id
        ).offset(skip).limit(limit).all()
    
    def get_user_tiles_on_canvas(self, db: Session, *, canvas_id: int, creator_id: int) -> List[Tile]:
        """Get all tiles by a specific user on a canvas"""
        return db.query(Tile).filter(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.creator_id == creator_id
            )
        ).all()
    
    def count_user_tiles_on_canvas(self, db: Session, *, canvas_id: int, creator_id: int) -> int:
        """Count user's tiles on a specific canvas"""
        return db.query(Tile).filter(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.creator_id == creator_id
            )
        ).count()
    
    def get_tile_neighbors(self, db: Session, *, tile_id: int, radius: int = 1) -> List[Tile]:
        """Get neighboring tiles around a given tile"""
        tile = self.get(db, tile_id)
        if not tile:
            return []
        
        return db.query(Tile).filter(
            and_(
                Tile.canvas_id == tile.canvas_id,
                Tile.x >= tile.x - radius,
                Tile.x <= tile.x + radius,
                Tile.y >= tile.y - radius,
                Tile.y <= tile.y + radius,
                Tile.id != tile_id
            )
        ).all()
    
    def get_adjacent_neighbors(self, db: Session, *, tile_id: int) -> List[Tile]:
        """Get only adjacent neighbors (left, right, top, bottom) of a tile"""
        tile = self.get(db, tile_id)
        if not tile:
            return []
        
        return db.query(Tile).filter(
            and_(
                Tile.canvas_id == tile.canvas_id,
                Tile.id != tile_id,
                # Left neighbor: (x-1, y)
                # Right neighbor: (x+1, y)
                # Top neighbor: (x, y-1)
                # Bottom neighbor: (x, y+1)
                (
                    (Tile.x == tile.x - 1 and Tile.y == tile.y) or  # Left
                    (Tile.x == tile.x + 1 and Tile.y == tile.y) or  # Right
                    (Tile.x == tile.x and Tile.y == tile.y - 1) or  # Top
                    (Tile.x == tile.x and Tile.y == tile.y + 1)     # Bottom
                )
            )
        ).all()
    
    def get_public_tiles(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get public tiles"""
        return db.query(Tile).filter(
            Tile.is_public == True
        ).offset(skip).limit(limit).all()
    
    def get_popular_tiles(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles sorted by like count"""
        return db.query(Tile).filter(
            Tile.is_public == True
        ).order_by(Tile.like_count.desc()).offset(skip).limit(limit).all()
    
    def is_position_occupied(self, db: Session, *, canvas_id: int, x: int, y: int) -> bool:
        """Check if position is occupied on canvas"""
        return self.get_by_position(db, canvas_id=canvas_id, x=x, y=y) is not None
    
    def increment_like_count(self, db: Session, *, tile_id: int) -> Optional[Tile]:
        """Increment tile's like count"""
        tile = self.get(db, tile_id)
        if tile:
            tile.like_count += 1
            db.commit()
            db.refresh(tile)
        return tile
    
    def decrement_like_count(self, db: Session, *, tile_id: int) -> Optional[Tile]:
        """Decrement tile's like count"""
        tile = self.get(db, tile_id)
        if tile:
            tile.like_count = max(0, tile.like_count - 1)
            db.commit()
            db.refresh(tile)
        return tile


# Create a singleton instance
tile_repository = TileRepository() 