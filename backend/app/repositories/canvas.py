"""
Canvas repository for canvas-specific database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session

from .base import SQLAlchemyRepository
from ..models.canvas import Canvas
from ..schemas.canvas import CanvasCreate, CanvasUpdate


class CanvasRepository(SQLAlchemyRepository[Canvas, CanvasCreate, CanvasUpdate]):
    """Canvas repository with canvas-specific operations"""
    
    def __init__(self):
        super().__init__(Canvas)
    
    def get_active_canvases(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get active canvases"""
        return db.query(Canvas).filter(
            Canvas.is_active == True
        ).offset(skip).limit(limit).all()
    
    def get_by_creator(self, db: Session, *, creator_id: int, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get canvases by creator ID"""
        return db.query(Canvas).filter(
            Canvas.creator_id == creator_id
        ).offset(skip).limit(limit).all()
    
    def get_public_canvases(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get public canvases"""
        return db.query(Canvas).filter(
            Canvas.is_public == True
        ).offset(skip).limit(limit).all()
    
    def get_collaborative_canvases(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Canvas]:
        """Get collaborative canvases"""
        return db.query(Canvas).filter(
            Canvas.is_collaborative == True
        ).offset(skip).limit(limit).all()
    
    def deactivate_canvas(self, db: Session, *, canvas_id: int) -> Optional[Canvas]:
        """Deactivate a canvas"""
        canvas = self.get(db, canvas_id)
        if canvas:
            canvas.is_active = False
            db.commit()
            db.refresh(canvas)
        return canvas
    
    def activate_canvas(self, db: Session, *, canvas_id: int) -> Optional[Canvas]:
        """Activate a canvas"""
        canvas = self.get(db, canvas_id)
        if canvas:
            canvas.is_active = True
            db.commit()
            db.refresh(canvas)
        return canvas


# Create a singleton instance
canvas_repository = CanvasRepository() 