from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Canvas(Base):
    """Canvas model representing the shared drawing space"""
    
    __tablename__ = "canvases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    width = Column(Integer, default=1024)  # Canvas width in pixels
    height = Column(Integer, default=1024)  # Canvas height in pixels
    tile_size = Column(Integer, default=32)  # Size of each tile (32x32)
    is_active = Column(Boolean, default=True)
    max_tiles_per_user = Column(Integer, default=5)  # Limit tiles per user
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tiles = relationship("Tile", back_populates="canvas") 