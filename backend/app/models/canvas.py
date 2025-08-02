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
    tile_size = Column(Integer, default=64)  # Size of each tile (64x64)
    palette_type = Column(String(20), default='classic')  # Color palette type
    is_active = Column(Boolean, default=True)
    max_tiles_per_user = Column(Integer, default=10)  # Limit tiles per user
    collaboration_mode = Column(String(20), default='free')  # Collaboration mode
    auto_save_interval = Column(Integer, default=60)  # Auto-save interval in seconds
    is_public = Column(Boolean, default=True)  # Whether canvas is public
    is_moderated = Column(Boolean, default=False)  # Whether changes require moderation
    creator_id = Column(Integer, nullable=True)  # ID of the user who created the canvas
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tiles = relationship("Tile", back_populates="canvas") 