"""
User repository for user-specific database operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from .base import SQLAlchemyRepository
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate


class UserRepository(SQLAlchemyRepository[User, UserCreate, UserUpdate]):
    """User repository with user-specific operations"""
    
    def __init__(self):
        super().__init__(User)
    
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(
            func.lower(User.username) == func.lower(username)
        ).first()
    
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(
            func.lower(User.email) == func.lower(email)
        ).first()
    
    def is_username_taken(self, db: Session, *, username: str) -> bool:
        """Check if username is already taken"""
        return self.get_by_username(db, username=username) is not None
    
    def is_email_taken(self, db: Session, *, email: str) -> bool:
        """Check if email is already taken"""
        return self.get_by_email(db, email=email) is not None
    
    def get_active_users(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[User]:
        """Get active users"""
        return db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()
    
    def update_user_stats(self, db: Session, *, user_id: int, **stats) -> Optional[User]:
        """Update user statistics"""
        user = self.get(db, user_id)
        if user:
            for key, value in stats.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            db.commit()
            db.refresh(user)
        return user
    
    def increment_tiles_created(self, db: Session, *, user_id: int) -> Optional[User]:
        """Increment user's tiles created count"""
        user = self.get(db, user_id)
        if user:
            user.tiles_created += 1
            db.commit()
            db.refresh(user)
        return user
    
    def increment_likes_received(self, db: Session, *, user_id: int) -> Optional[User]:
        """Increment user's likes received count"""
        user = self.get(db, user_id)
        if user:
            user.likes_received += 1
            db.commit()
            db.refresh(user)
        return user
    
    def decrement_likes_received(self, db: Session, *, user_id: int) -> Optional[User]:
        """Decrement user's likes received count"""
        user = self.get(db, user_id)
        if user:
            user.likes_received = max(0, user.likes_received - 1)
            db.commit()
            db.refresh(user)
        return user


# Create a singleton instance
user_repository = UserRepository() 