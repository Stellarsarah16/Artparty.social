from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


class CanvasCreate(BaseModel):
    """Schema for creating a new canvas"""
    name: str
    description: Optional[str] = None
    width: int = 1024
    height: int = 1024
    tile_size: int = 64
    palette_type: str = 'classic'
    max_tiles_per_user: int = 10
    collaboration_mode: str = 'free'
    auto_save_interval: int = 60
    is_public: bool = True
    is_moderated: bool = False
    
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
        valid_sizes = [32, 64, 128, 256, 512]
        if v not in valid_sizes:
            raise ValueError(f'Tile size must be one of: {", ".join(map(str, valid_sizes))}')
        return v
    
    @validator('palette_type')
    def validate_palette_type(cls, v):
        valid_palettes = [
            'classic', 'earth', 'pastel', 'monochrome', 'neon', 'retro',
            'artistic', 'sunset', 'ocean', 'forest'
        ]
        if v not in valid_palettes:
            raise ValueError(f'Palette type must be one of: {", ".join(valid_palettes)}')
        return v
    
    @validator('collaboration_mode')
    def validate_collaboration_mode(cls, v):
        valid_modes = ['free', 'tile-lock', 'area-lock', 'review']
        if v not in valid_modes:
            raise ValueError(f'Collaboration mode must be one of: {", ".join(valid_modes)}')
        return v
    
    @validator('auto_save_interval')
    def validate_auto_save_interval(cls, v):
        valid_intervals = [0, 30, 60, 300, 600]
        if v not in valid_intervals:
            raise ValueError(f'Auto-save interval must be one of: {", ".join(map(str, valid_intervals))}')
        return v


class CanvasUpdate(BaseModel):
    """Schema for updating canvas information"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    max_tiles_per_user: Optional[int] = None
    collaboration_mode: Optional[str] = None
    auto_save_interval: Optional[int] = None
    is_public: Optional[bool] = None
    is_moderated: Optional[bool] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and len(v) < 3:
            raise ValueError('Canvas name must be at least 3 characters long')
        if v is not None and len(v) > 100:
            raise ValueError('Canvas name must be less than 100 characters')
        return v
    
    @validator('collaboration_mode')
    def validate_collaboration_mode(cls, v):
        if v is not None:
            valid_modes = ['free', 'tile-lock', 'area-lock', 'review']
            if v not in valid_modes:
                raise ValueError(f'Collaboration mode must be one of: {", ".join(valid_modes)}')
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
    collaboration_mode: str
    auto_save_interval: int
    is_public: bool
    is_moderated: bool
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
    collaboration_mode: str
    auto_save_interval: int
    is_public: bool
    is_moderated: bool
    created_at: datetime
    tiles: List[dict] = []  # Will contain TileResponse data
    
    class Config:
        from_attributes = True 