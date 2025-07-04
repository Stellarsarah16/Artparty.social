from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Like(Base):
    """Like model for positive feedback system (likes only, no dislikes)"""
    
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tile_id = Column(Integer, ForeignKey("tiles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="likes_given")
    tile = relationship("Tile", back_populates="likes")
    
    # Ensure a user can only like a tile once
    __table_args__ = (UniqueConstraint('user_id', 'tile_id', name='unique_user_tile_like'),) 