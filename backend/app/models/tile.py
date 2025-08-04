from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Tile(Base):
    """Tile model representing a 32x32 pixel art tile on the canvas"""
    
    __tablename__ = "tiles"
    
    id = Column(Integer, primary_key=True, index=True)
    canvas_id = Column(Integer, ForeignKey("canvases.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Position on the canvas (in tile coordinates)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    
    # Pixel data stored as JSON string (32x32 array of color values)
    pixel_data = Column(Text, nullable=False)
    
    # Metadata
    title = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    like_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    canvas = relationship("Canvas", back_populates="tiles")
    creator = relationship("User", back_populates="tiles")
    likes = relationship("Like", back_populates="tile")
    lock = relationship("TileLock", back_populates="tile", uselist=False) 