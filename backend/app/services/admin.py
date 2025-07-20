from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from ..models.user import User
from ..models.canvas import Canvas
from ..models.tile import Tile
from ..models.like import Like
from ..schemas.admin import AdminUserUpdate, AdminCanvasUpdate, AdminStats, AdminAction


class AdminService:
    """Service for admin operations"""
    
    @staticmethod
    def get_user_stats(db: Session) -> AdminStats:
        """Get overall system statistics"""
        total_users = db.query(User).count()
        total_canvases = db.query(Canvas).count()
        total_tiles = db.query(Tile).count()
        
        # Active users today (users who created tiles today)
        today = datetime.utcnow().date()
        active_users_today = db.query(Tile.creator_id).filter(
            func.date(Tile.created_at) == today
        ).distinct().count()
        
        # New users this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_users_this_week = db.query(User).filter(
            User.created_at >= week_ago
        ).count()
        
        # New canvases this week
        new_canvases_this_week = db.query(Canvas).filter(
            Canvas.created_at >= week_ago
        ).count()
        
        return AdminStats(
            total_users=total_users,
            total_canvases=total_canvases,
            total_tiles=total_tiles,
            active_users_today=active_users_today,
            new_users_this_week=new_users_this_week,
            new_canvases_this_week=new_canvases_this_week
        )
    
    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 50) -> List[User]:
        """Get all users with pagination"""
        return db.query(User).order_by(desc(User.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_update: AdminUserUpdate) -> Optional[User]:
        """Update user admin status"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        # Update fields
        if user_update.is_admin is not None:
            user.is_admin = user_update.is_admin
        if user_update.is_superuser is not None:
            user.is_superuser = user_update.is_superuser
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        if user_update.admin_permissions is not None:
            user.admin_permissions = user_update.admin_permissions
        
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete user (soft delete by setting is_active to False)"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def get_all_canvases(db: Session, skip: int = 0, limit: int = 50) -> List[Canvas]:
        """Get all canvases with pagination"""
        return db.query(Canvas).order_by(desc(Canvas.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_canvas_by_id(db: Session, canvas_id: int) -> Optional[Canvas]:
        """Get canvas by ID"""
        return db.query(Canvas).filter(Canvas.id == canvas_id).first()
    
    @staticmethod
    def update_canvas(db: Session, canvas_id: int, canvas_update: AdminCanvasUpdate) -> Optional[Canvas]:
        """Update canvas admin settings"""
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id).first()
        if not canvas:
            return None
        
        # Update fields
        if canvas_update.is_active is not None:
            canvas.is_active = canvas_update.is_active
        if canvas_update.is_public is not None:
            canvas.is_public = canvas_update.is_public
        if canvas_update.is_moderated is not None:
            canvas.is_moderated = canvas_update.is_moderated
        if canvas_update.max_tiles_per_user is not None:
            canvas.max_tiles_per_user = canvas_update.max_tiles_per_user
        
        db.commit()
        db.refresh(canvas)
        return canvas
    
    @staticmethod
    def delete_canvas(db: Session, canvas_id: int) -> bool:
        """Delete canvas (soft delete by setting is_active to False)"""
        canvas = db.query(Canvas).filter(Canvas.id == canvas_id).first()
        if not canvas:
            return False
        
        canvas.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def get_recent_activity(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent system activity"""
        # Get recent tiles
        recent_tiles = db.query(Tile).order_by(desc(Tile.created_at)).limit(limit).all()
        
        # Get recent likes
        recent_likes = db.query(Like).order_by(desc(Like.created_at)).limit(limit).all()
        
        # Combine and sort by date
        activity = []
        
        for tile in recent_tiles:
            activity.append({
                "type": "tile_created",
                "id": tile.id,
                "user_id": tile.creator_id,
                "canvas_id": tile.canvas_id,
                "created_at": tile.created_at,
                "data": {"x": tile.x, "y": tile.y}
            })
        
        for like in recent_likes:
            activity.append({
                "type": "tile_liked",
                "id": like.id,
                "user_id": like.user_id,
                "tile_id": like.tile_id,
                "created_at": like.created_at,
                "data": {}
            })
        
        # Sort by created_at descending
        activity.sort(key=lambda x: x["created_at"], reverse=True)
        return activity[:limit]


# Create admin service instance
admin_service = AdminService() 