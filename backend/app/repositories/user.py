"""
User repository for user-specific database operations
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from .base import SQLAlchemyRepository
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate


class UserRepository(SQLAlchemyRepository[User, UserCreate, UserUpdate]):
    """User repository with user-specific operations"""
    
    def __init__(self):
        super().__init__(User)
    
    async def get_by_username(self, db: AsyncSession, *, username: str) -> Optional[User]:
        """Get user by username"""
        stmt = select(User).where(func.lower(User.username) == func.lower(username))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get user by email"""
        stmt = select(User).where(func.lower(User.email) == func.lower(email))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def is_username_taken(self, db: AsyncSession, *, username: str) -> bool:
        """Check if username is already taken"""
        user = await self.get_by_username(db, username=username)
        return user is not None
    
    async def is_email_taken(self, db: AsyncSession, *, email: str) -> bool:
        """Check if email is already taken"""
        user = await self.get_by_email(db, email=email)
        return user is not None
    
    async def get_active_users(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[User]:
        """Get active users"""
        stmt = select(User).where(User.is_active == True).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def update_user_stats(self, db: AsyncSession, *, user_id: int, **stats) -> Optional[User]:
        """Update user statistics"""
        user = await self.get(db, user_id)
        if user:
            for key, value in stats.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            await db.commit()
            await db.refresh(user)
        return user
    
    async def increment_tiles_created(self, db: AsyncSession, *, user_id: int) -> Optional[User]:
        """Increment user's tiles created count"""
        user = await self.get(db, user_id)
        if user:
            user.tiles_created += 1
            await db.commit()
            await db.refresh(user)
        return user
    
    async def increment_likes_received(self, db: AsyncSession, *, user_id: int) -> Optional[User]:
        """Increment user's likes received count"""
        user = await self.get(db, user_id)
        if user:
            user.likes_received += 1
            await db.commit()
            await db.refresh(user)
        return user
    
    async def decrement_likes_received(self, db: AsyncSession, *, user_id: int) -> Optional[User]:
        """Decrement user's likes received count"""
        user = await self.get(db, user_id)
        if user:
            user.likes_received = max(0, user.likes_received - 1)
            await db.commit()
            await db.refresh(user)
        return user


# Create a singleton instance
user_repository = UserRepository() 