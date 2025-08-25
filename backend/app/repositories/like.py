"""
Like repository for like-specific database operations
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select

from .base import SQLAlchemyRepository
from ..models.like import Like
from ..schemas.like import LikeCreate


class LikeRepository(SQLAlchemyRepository[Like, LikeCreate, LikeCreate]):
    """Like repository with like-specific operations"""
    
    def __init__(self):
        super().__init__(Like)
    
    async def get_by_user_and_tile(self, db: AsyncSession, *, user_id: int, tile_id: int) -> Optional[Like]:
        """Get like by user and tile"""
        stmt = select(Like).where(
            and_(
                Like.user_id == user_id,
                Like.tile_id == tile_id
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_tile_likes(self, db: AsyncSession, *, tile_id: int, skip: int = 0, limit: int = 100) -> List[Like]:
        """Get likes for a specific tile"""
        stmt = select(Like).where(Like.tile_id == tile_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_user_likes(self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Like]:
        """Get likes by a specific user"""
        stmt = select(Like).where(Like.user_id == user_id).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def count_tile_likes(self, db: AsyncSession, *, tile_id: int) -> int:
        """Count likes for a specific tile"""
        stmt = select(Like).where(Like.tile_id == tile_id)
        result = await db.execute(stmt)
        return len(result.scalars().all())
    
    async def count_user_likes(self, db: AsyncSession, *, user_id: int) -> int:
        """Count likes by a specific user"""
        stmt = select(Like).where(Like.user_id == user_id)
        result = await db.execute(stmt)
        return len(result.scalars().all())
    
    async def user_has_liked_tile(self, db: AsyncSession, *, user_id: int, tile_id: int) -> bool:
        """Check if user has liked a specific tile"""
        like = await self.get_by_user_and_tile(db, user_id=user_id, tile_id=tile_id)
        return like is not None
    
    async def unlike_tile(self, db: AsyncSession, *, user_id: int, tile_id: int) -> Optional[Like]:
        """Remove like from tile"""
        like = await self.get_by_user_and_tile(db, user_id=user_id, tile_id=tile_id)
        if like:
            await db.delete(like)
            await db.commit()
        return like


# Create a singleton instance
like_repository = LikeRepository() 