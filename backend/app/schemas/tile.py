from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime


class TileCreate(BaseModel):
    """Schema for creating a new tile"""
    canvas_id: int
    x: int
    y: int
    pixel_data: str  # JSON string of pixel array
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: bool = True
    
    @validator('x', 'y')
    def validate_coordinates(cls, v):
        if v < 0:
            raise ValueError('Tile coordinates must be non-negative')
        if v > 999:  # Reasonable upper limit
            raise ValueError('Tile coordinates must be less than 1000')
        return v
    
    @validator('pixel_data')
    def validate_pixel_data(cls, v):
        try:
            import json
            data = json.loads(v)
            if not isinstance(data, list):
                raise ValueError('Pixel data must be an array')
            
            # Updated: Removed 256 and 512, kept only reasonable sizes
            expected_sizes = [16, 24, 32, 64, 128]
            rows = len(data)
            
            if rows not in expected_sizes:
                raise ValueError(f'Pixel data must be a square array with size: {", ".join(map(str, expected_sizes))}')
            
            for i, row in enumerate(data):
                if not isinstance(row, list) or len(row) != rows:
                    raise ValueError(f'Each row must contain exactly {rows} pixels (row {i} has {len(row) if isinstance(row, list) else "invalid"} pixels)')
                    
        except json.JSONDecodeError:
            raise ValueError('Pixel data must be valid JSON')
        return v
    
    @validator('title')
    def validate_title(cls, v):
        if v is not None and len(v) > 100:
            raise ValueError('Tile title must be less than 100 characters')
        return v


class TileUpdate(BaseModel):
    """Schema for updating tile information"""
    pixel_data: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    
    @validator('pixel_data')
    def validate_pixel_data(cls, v):
        if v is not None:
            try:
                import json
                data = json.loads(v)
                if not isinstance(data, list):
                    raise ValueError('Pixel data must be an array')
                
                # Updated: Removed 256 and 512, kept only reasonable sizes
                expected_sizes = [16, 24, 32, 64, 128]
                rows = len(data)
                
                if rows not in expected_sizes:
                    raise ValueError(f'Pixel data must be a square array with size: {", ".join(map(str, expected_sizes))}')
                
                for i, row in enumerate(data):
                    if not isinstance(row, list) or len(row) != rows:
                        raise ValueError(f'Each row must contain exactly {rows} pixels (row {i} has {len(row) if isinstance(row, list) else "invalid"} pixels)')
                        
            except json.JSONDecodeError:
                raise ValueError('Pixel data must be valid JSON')
        return v


class TileResponse(BaseModel):
    """Schema for tile data in responses"""
    id: int
    canvas_id: int
    creator_id: int
    x: int
    y: int
    pixel_data: str
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: bool
    like_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TileWithCreator(BaseModel):
    """Tile response with creator information"""
    id: int
    canvas_id: int
    creator_id: int
    creator_username: str
    creator_display_name: Optional[str] = None
    x: int
    y: int
    pixel_data: str
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: bool
    like_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TilePosition(BaseModel):
    """Schema for tile position queries"""
    x: int
    y: int
    
    @validator('x', 'y')
    def validate_coordinates(cls, v):
        if v < 0:
            raise ValueError('Coordinates must be non-negative')
        return v 