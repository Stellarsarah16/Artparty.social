"""
Canvas management endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db

# Create router
router = APIRouter()


@router.get("/")
async def get_canvas_list(db: Session = Depends(get_db)):
    """Get list of canvases"""
    # TODO: Implement get canvas list
    return {"message": "Get canvas list endpoint - TODO"}


@router.get("/{canvas_id}")
async def get_canvas_details(canvas_id: str, db: Session = Depends(get_db)):
    """Get canvas details"""
    # TODO: Implement get canvas details
    return {"message": f"Get canvas {canvas_id} details endpoint - TODO"}


@router.get("/{canvas_id}/region")
async def get_canvas_region(canvas_id: str, db: Session = Depends(get_db)):
    """Get canvas region tiles"""
    # TODO: Implement get canvas region
    return {"message": f"Get canvas {canvas_id} region endpoint - TODO"} 