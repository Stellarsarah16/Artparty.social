"""
Like repository for like-specific database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_

from .base import SQLAlchemyRepository
from ..models.like import Like
from ..schemas.like import LikeCreate


class LikeRepository(SQLAlchemyRepository[Like, LikeCreate, LikeCreate]):
    """Like repository with like-specific operations"""
    
    def __init__(self):
        super().__init__(Like)
    
    def get_by_user_and_tile(self, db: Session, *, user_id: int, tile_id: int) -> Optional[Like]:
        """Get like by user and tile"""
        return db.query(Like).filter(
            and_(
                Like.user_id == user_id,
                Like.tile_id == tile_id
            )
        ).first()
    
    def get_tile_likes(self, db: Session, *, tile_id: int, skip: int = 0, limit: int = 100) -> List[Like]:
        """Get likes for a specific tile"""
        return db.query(Like).filter(
            Like.tile_id == tile_id
        ).offset(skip).limit(limit).all()
    
    def get_user_likes(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Like]:
        """Get likes by a specific user"""
        return db.query(Like).filter(
            Like.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def count_tile_likes(self, db: Session, *, tile_id: int) -> int:
        """Count likes for a specific tile"""
        return db.query(Like).filter(Like.tile_id == tile_id).count()
    
    def count_user_likes(self, db: Session, *, user_id: int) -> int:
        """Count likes by a specific user"""
        return db.query(Like).filter(Like.user_id == user_id).count()
    
    def user_has_liked_tile(self, db: Session, *, user_id: int, tile_id: int) -> bool:
        """Check if user has liked a specific tile"""
        return self.get_by_user_and_tile(db, user_id=user_id, tile_id=tile_id) is not None
    
    def unlike_tile(self, db: Session, *, user_id: int, tile_id: int) -> Optional[Like]:
        """Remove like from tile"""
        like = self.get_by_user_and_tile(db, user_id=user_id, tile_id=tile_id)
        if like:
            db.delete(like)
            db.commit()
        return like


# Create a singleton instance
like_repository = LikeRepository() 