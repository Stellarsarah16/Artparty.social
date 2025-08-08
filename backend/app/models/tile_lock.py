from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta, timezone
from ..core.database import Base


class TileLock(Base):
    """Model for managing tile editing locks to prevent concurrent editing"""
    
    __tablename__ = "tile_locks"
    
    id = Column(Integer, primary_key=True, index=True)
    tile_id = Column(Integer, ForeignKey("tiles.id"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    tile = relationship("Tile", back_populates="lock")
    user = relationship("User")
    
    def is_expired(self) -> bool:
        """Check if the lock has expired"""
        # Use timezone-aware datetime for comparison
        return datetime.now(timezone.utc) > self.expires_at
    
    def extend_lock(self, minutes: int = 30):
        """Extend the lock expiration time"""
        # Use timezone-aware datetime for consistency
        self.expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes) 