from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


class CanvasCreate(BaseModel):
    """Schema for creating a new canvas"""
    name: str
    description: Optional[str] = None
    width: int = 1024
    height: int = 1024
    tile_size: int = 32
    palette_type: str = 'classic'
    max_tiles_per_user: int = 5
    
    @validator('name')
    def validate_name(cls, v):
        if len(v) < 3:
            raise ValueError('Canvas name must be at least 3 characters long')
        if len(v) > 100:
            raise ValueError('Canvas name must be less than 100 characters')
        return v
    
    @validator('width', 'height')
    def validate_dimensions(cls, v):
        if v < 256:
            raise ValueError('Canvas dimensions must be at least 256 pixels')
        if v > 4096:
            raise ValueError('Canvas dimensions must be less than 4096 pixels')
        return v
    
    @validator('tile_size')
    def validate_tile_size(cls, v):
        if v not in [16, 32, 64]:
            raise ValueError('Tile size must be 16, 32, or 64 pixels')
        return v
    
    @validator('palette_type')
    def validate_palette_type(cls, v):
        valid_palettes = ['classic', 'earth', 'pastel', 'monochrome', 'neon', 'retro']
        if v not in valid_palettes:
            raise ValueError(f'Palette type must be one of: {", ".join(valid_palettes)}')
        return v


class CanvasUpdate(BaseModel):
    """Schema for updating canvas information"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    max_tiles_per_user: Optional[int] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and len(v) < 3:
            raise ValueError('Canvas name must be at least 3 characters long')
        if v is not None and len(v) > 100:
            raise ValueError('Canvas name must be less than 100 characters')
        return v


class CanvasResponse(BaseModel):
    """Schema for canvas data in responses"""
    id: int
    name: str
    description: Optional[str] = None
    width: int
    height: int
    tile_size: int
    palette_type: str
    is_active: bool
    max_tiles_per_user: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CanvasWithTiles(BaseModel):
    """Canvas response with associated tiles"""
    id: int
    name: str
    description: Optional[str] = None
    width: int
    height: int
    tile_size: int
    palette_type: str
    is_active: bool
    max_tiles_per_user: int
    created_at: datetime
    tiles: List[dict] = []  # Will contain TileResponse data
    
    class Config:
        from_attributes = True 