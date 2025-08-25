"""
Canvas repository for canvas-specific database operations
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .base import SQLAlchemyRepository
from ..models.canvas import Canvas
from ..schemas.canvas import CanvasCreate, CanvasUpdate


class CanvasRepository(SQLAlchemyRepository[Canvas, CanvasCreate, CanvasUpdate]):
    """Canvas repository with canvas-specific operations"""
    
    def __init__(self):
        super().__init__(Canvas)
    
    async def get_active_canvases(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get active canvases"""
        stmt = select(Canvas).where(Canvas.is_active == True).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_by_creator(self, db: AsyncSession, *, creator_id: int, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get canvases by creator ID"""
        stmt = select(Canvas).where(Canvas.creator_id == creator_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_public_canvases(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get public canvases"""
        stmt = select(Canvas).where(Canvas.is_public == True).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_collaborative_canvases(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get collaborative canvases"""
        stmt = select(Canvas).where(Canvas.is_collaborative == True).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def deactivate_canvas(self, db: AsyncSession, *, canvas_id: int) -> Optional[Canvas]:
        """Deactivate a canvas"""
        canvas = await self.get(db, canvas_id)
        if canvas:
            canvas.is_active = False
            await db.commit()
            await db.refresh(canvas)
        return canvas
    
    async def activate_canvas(self, db: AsyncSession, *, canvas_id: int) -> Optional[Canvas]:
        """Activate a canvas"""
        canvas = await self.get(db, canvas_id)
        if canvas:
            canvas.is_active = True
            await db.commit()
            await db.refresh(canvas)
        return canvas


# Create a singleton instance
canvas_repository = CanvasRepository() 