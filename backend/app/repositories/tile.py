"""
Tile repository for tile-specific database operations
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, select

from .base import SQLAlchemyRepository
from ..models.tile import Tile
from ..schemas.tile import TileCreate, TileUpdate


class TileRepository(SQLAlchemyRepository[Tile, TileCreate, TileUpdate]):
    """Tile repository with tile-specific operations"""
    
    def __init__(self):
        super().__init__(Tile)
    
    async def get_by_position(self, db: AsyncSession, *, canvas_id: int, x: int, y: int) -> Optional[Tile]:
        """Get tile by position on canvas"""
        stmt = select(Tile).where(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.x == x,
                Tile.y == y
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_by_canvas(self, db: AsyncSession, *, canvas_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by canvas ID"""
        stmt = select(Tile).where(Tile.canvas_id == canvas_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_by_creator(self, db: AsyncSession, *, creator_id: int, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles by creator ID"""
        stmt = select(Tile).where(Tile.creator_id == creator_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_user_tiles_on_canvas(self, db: AsyncSession, *, canvas_id: int, creator_id: int) -> List[Tile]:
        """Get all tiles by a specific user on a canvas"""
        stmt = select(Tile).where(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.creator_id == creator_id
            )
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def count_user_tiles_on_canvas(self, db: AsyncSession, *, canvas_id: int, creator_id: int) -> int:
        """Count user's tiles on a specific canvas"""
        stmt = select(Tile).where(
            and_(
                Tile.canvas_id == canvas_id,
                Tile.creator_id == creator_id
            )
        )
        result = await db.execute(stmt)
        return len(result.scalars().all())
    
    async def get_tile_neighbors(self, db: AsyncSession, *, tile_id: int, radius: int = 1) -> List[Tile]:
        """Get neighboring tiles around a given tile"""
        tile = await self.get(db, tile_id)
        if not tile:
            return []
        
        stmt = select(Tile).where(
            and_(
                Tile.canvas_id == tile.canvas_id,
                Tile.x >= tile.x - radius,
                Tile.x <= tile.x + radius,
                Tile.y >= tile.y - radius,
                Tile.y <= tile.y + radius,
                Tile.id != tile_id
            )
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_adjacent_neighbors(self, db: AsyncSession, *, tile_id: int) -> List[Tile]:
        """Get only adjacent neighbors (left, right, top, bottom) of a tile"""
        tile = await self.get(db, tile_id)
        if not tile:
            return []
        
        # Check what tiles exist at each adjacent position
        left_pos = (tile.x - 1, tile.y)
        right_pos = (tile.x + 1, tile.y)
        top_pos = (tile.x, tile.y - 1)
        bottom_pos = (tile.x, tile.y + 1)
        
        # Check each position individually
        left_tile = await self.get_by_position(db, canvas_id=tile.canvas_id, x=left_pos[0], y=left_pos[1])
        right_tile = await self.get_by_position(db, canvas_id=tile.canvas_id, x=right_pos[0], y=right_pos[1])
        top_tile = await self.get_by_position(db, canvas_id=tile.canvas_id, x=top_pos[0], y=top_pos[1])
        bottom_tile = await self.get_by_position(db, canvas_id=tile.canvas_id, x=bottom_pos[0], y=bottom_pos[1])
        
        # Build list of existing neighbors
        neighbors = []
        if left_tile:
            neighbors.append(left_tile)
        if right_tile:
            neighbors.append(right_tile)
        if top_tile:
            neighbors.append(top_tile)
        if bottom_tile:
            neighbors.append(bottom_tile)
        
        return neighbors
    
    async def get_adjacent_neighbors_by_position(self, db: AsyncSession, *, canvas_id: int, x: int, y: int) -> List[Tile]:
        """Get adjacent neighbors for a position (even if tile doesn't exist)"""
        # Check what tiles exist at each adjacent position
        left_pos = (x - 1, y)
        right_pos = (x + 1, y)
        top_pos = (x, y - 1)
        bottom_pos = (x, y + 1)
        
        # Check each position individually
        left_tile = await self.get_by_position(db, canvas_id=canvas_id, x=left_pos[0], y=left_pos[1])
        right_tile = await self.get_by_position(db, canvas_id=canvas_id, x=right_pos[0], y=right_pos[1])
        top_tile = await self.get_by_position(db, canvas_id=canvas_id, x=top_pos[0], y=top_pos[1])
        bottom_tile = await self.get_by_position(db, canvas_id=canvas_id, x=bottom_pos[0], y=bottom_pos[1])
        
        # Build list of existing neighbors
        neighbors = []
        if left_tile:
            neighbors.append(left_tile)
        if right_tile:
            neighbors.append(right_tile)
        if top_tile:
            neighbors.append(top_tile)
        if bottom_tile:
            neighbors.append(bottom_tile)
        
        return neighbors
    
    async def get_public_tiles(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get public tiles"""
        stmt = select(Tile).where(Tile.is_public == True).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_popular_tiles(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Tile]:
        """Get tiles sorted by like count"""
        stmt = select(Tile).where(Tile.is_public == True).order_by(Tile.like_count.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def is_position_occupied(self, db: AsyncSession, *, canvas_id: int, x: int, y: int) -> bool:
        """Check if position is occupied on canvas"""
        tile = await self.get_by_position(db, canvas_id=canvas_id, x=x, y=y)
        return tile is not None
    
    async def increment_like_count(self, db: AsyncSession, *, tile_id: int) -> Optional[Tile]:
        """Increment tile's like count"""
        tile = await self.get(db, tile_id)
        if tile:
            tile.like_count += 1
            await db.commit()
            await db.refresh(tile)
        return tile
    
    async def decrement_like_count(self, db: AsyncSession, *, tile_id: int) -> Optional[Tile]:
        """Decrement tile's like count"""
        tile = await self.get(db, tile_id)
        if tile:
            tile.like_count = max(0, tile.like_count - 1)
            await db.commit()
            await db.refresh(tile)
        return tile

    async def count_user_total_tiles(self, db: AsyncSession, *, creator_id: int) -> int:
        """Count total tiles created by a user across all canvases"""
        stmt = select(Tile).where(Tile.creator_id == creator_id)
        result = await db.execute(stmt)
        return len(result.scalars().all())


# Create a singleton instance
tile_repository = TileRepository() 