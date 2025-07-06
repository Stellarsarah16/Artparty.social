"""
User service for user-related business logic
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..repositories.user import user_repository
from ..schemas.user import UserCreate, UserUpdate
from ..models.user import User
from .password import password_service


class UserService:
    """Service for user-related business logic"""
    
    def __init__(self):
        self.user_repository = user_repository
        self.password_service = password_service
    
    def create_user(self, db: Session, user_create: UserCreate) -> User:
        """Create a new user account"""
        # Check if username already exists
        if self.user_repository.is_username_taken(db, username=user_create.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email already exists
        if self.user_repository.is_email_taken(db, email=user_create.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = self.password_service.hash_password(user_create.password)
        
        # Create user object
        user_data = user_create.dict()
        user_data.pop('password')  # Remove plain password
        user_data['hashed_password'] = hashed_password
        user_data['username'] = user_create.username.lower()
        user_data['is_active'] = True
        user_data['is_verified'] = False
        user_data['total_points'] = 0
        user_data['tiles_created'] = 0
        user_data['likes_received'] = 0
        
        # Create user using repository
        db_user = User(**user_data)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    def authenticate_user(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password"""
        user = self.user_repository.get_by_username(db, username=username)
        
        if not user:
            return None
        
        if not self.password_service.verify_password(password, user.hashed_password):
            return None
        
        if not user.is_active:
            return None
            
        return user
    
    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.user_repository.get(db, user_id)
    
    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return self.user_repository.get_by_username(db, username=username)
    
    def update_user(self, db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """Update user information"""
        user = self.user_repository.get(db, user_id)
        if not user:
            return None
        
        return self.user_repository.update(db, db_obj=user, obj_in=user_update)
    
    def increment_tiles_created(self, db: Session, user_id: int) -> Optional[User]:
        """Increment user's tiles created count"""
        return self.user_repository.increment_tiles_created(db, user_id=user_id)
    
    def increment_likes_received(self, db: Session, user_id: int) -> Optional[User]:
        """Increment user's likes received count"""
        return self.user_repository.increment_likes_received(db, user_id=user_id)
    
    def decrement_likes_received(self, db: Session, user_id: int) -> Optional[User]:
        """Decrement user's likes received count"""
        return self.user_repository.decrement_likes_received(db, user_id=user_id)
    
    def create_user_response_data(self, user: User) -> dict:
        """Create user data for API responses"""
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "total_points": user.total_points,
            "tiles_created": user.tiles_created,
            "likes_received": user.likes_received,
            "is_verified": user.is_verified
        }


# Create a singleton instance
user_service = UserService() 