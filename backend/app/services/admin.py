from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, select
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
    async def get_user_stats(db: AsyncSession) -> AdminStats:
        """Get overall system statistics - ASYNC VERSION"""
        # Total users
        result = await db.execute(select(func.count(User.id)))
        total_users = result.scalar()
        
        # Total canvases
        result = await db.execute(select(func.count(Canvas.id)))
        total_canvases = result.scalar()
        
        # Total tiles
        result = await db.execute(select(func.count(Tile.id)))
        total_tiles = result.scalar()
        
        # Active users today (users who created tiles today)
        today = datetime.utcnow().date()
        stmt = select(func.count(func.distinct(Tile.creator_id))).where(
            func.date(Tile.created_at) == today
        )
        result = await db.execute(stmt)
        active_users_today = result.scalar()
        
        # New users this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        stmt = select(func.count(User.id)).where(User.created_at >= week_ago)
        result = await db.execute(stmt)
        new_users_this_week = result.scalar()
        
        # New canvases this week
        stmt = select(func.count(Canvas.id)).where(Canvas.created_at >= week_ago)
        result = await db.execute(stmt)
        new_canvases_this_week = result.scalar()
        
        return AdminStats(
            total_users=total_users,
            total_canvases=total_canvases,
            total_tiles=total_tiles,
            active_users_today=active_users_today,
            new_users_this_week=new_users_this_week,
            new_canvases_this_week=new_canvases_this_week
        )
    
    @staticmethod
    async def get_all_users(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[User]:
        """Get all users with pagination - ASYNC VERSION"""
        stmt = select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get user by ID - ASYNC VERSION"""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    
    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, user_update: AdminUserUpdate) -> Optional[User]:
        """Update user admin status - ASYNC VERSION"""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
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
        
        await db.commit()
        await db.refresh(user)
        return user
    
    @staticmethod
    async def delete_user(db: AsyncSession, user_id: int) -> bool:
        """Delete user (soft delete) - ASYNC VERSION"""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return False
        
        user.is_active = False
        await db.commit()
        return True
    
    @staticmethod
    async def get_all_canvases(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[Canvas]:
        """Get all canvases with pagination - ASYNC VERSION"""
        stmt = select(Canvas).order_by(desc(Canvas.created_at)).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_canvas_by_id(db: AsyncSession, canvas_id: int) -> Optional[Canvas]:
        """Get canvas by ID - ASYNC VERSION"""
        stmt = select(Canvas).where(Canvas.id == canvas_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_canvas(db: AsyncSession, canvas_id: int, canvas_update: AdminCanvasUpdate) -> Optional[Canvas]:
        """Update canvas admin settings - ASYNC VERSION"""
        stmt = select(Canvas).where(Canvas.id == canvas_id)
        result = await db.execute(stmt)
        canvas = result.scalar_one_or_none()
        
        if not canvas:
            return None
        
        # Update fields
        if canvas_update.name is not None:
            canvas.name = canvas_update.name
        if canvas_update.description is not None:
            canvas.description = canvas_update.description
        if canvas_update.is_active is not None:
            canvas.is_active = canvas_update.is_active
        if canvas_update.max_tiles_per_user is not None:
            canvas.max_tiles_per_user = canvas_update.max_tiles_per_user
        
        await db.commit()
        await db.refresh(canvas)
        return canvas
    
    @staticmethod
    async def delete_canvas(db: AsyncSession, canvas_id: int) -> bool:
        """Delete canvas (soft delete) - ASYNC VERSION"""
        stmt = select(Canvas).where(Canvas.id == canvas_id)
        result = await db.execute(stmt)
        canvas = result.scalar_one_or_none()
        
        if not canvas:
            return False
        
        canvas.is_active = False
        await db.commit()
        return True
    
    @staticmethod
    async def cleanup_inactive_users(db: AsyncSession) -> int:
        """Remove all inactive users permanently - ASYNC VERSION"""
        try:
            from ..models.verification import VerificationToken
            
            # Get inactive users
            stmt = select(User).where(User.is_active == False)
            result = await db.execute(stmt)
            inactive_users = result.scalars().all()
            inactive_count = len(inactive_users)
            
            print(f"🧹 Found {inactive_count} inactive users to clean up")
            
            for user in inactive_users:
                # Delete verification tokens for this user
                stmt = select(VerificationToken).where(VerificationToken.user_id == user.id)
                result = await db.execute(stmt)
                await result.delete()
                print(f"🧹 Deleted verification tokens for user {user.id}")
                
                # Delete likes given by this user
                stmt = select(Like).where(Like.user_id == user.id)
                result = await db.execute(stmt)
                await result.delete()
                print(f"🧹 Deleted likes given by user {user.id}")
                
                # Delete tiles created by this user
                stmt = select(Tile).where(Tile.creator_id == user.id)
                result = await db.execute(stmt)
                await result.delete()
                print(f"🧹 Deleted tiles created by user {user.id}")
            
            # Now delete the inactive users
            stmt = select(User).where(User.is_active == False)
            result = await db.execute(stmt)
            await result.delete()
            await db.commit()
            
            print(f"🧹 Successfully cleaned up {inactive_count} inactive users")
            return inactive_count
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error cleaning up inactive users: {e}")
            raise e
    
    @staticmethod
    async def cleanup_inactive_canvases(db: AsyncSession) -> int:
        """Remove all inactive canvases permanently - ASYNC VERSION"""
        try:
            # Get count of inactive canvases before deletion
            stmt = select(func.count(Canvas.id)).where(Canvas.is_active == False)
            result = await db.execute(stmt)
            inactive_count = result.scalar()
            
            # Delete inactive canvases (this will cascade to related tiles)
            stmt = select(Canvas).where(Canvas.is_active == False)
            result = await db.execute(stmt)
            await result.delete()
            await db.commit()
            
            print(f"🧹 Cleaned up {inactive_count} inactive canvases")
            return inactive_count
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error cleaning up inactive canvases: {e}")
            raise e
    
    @staticmethod
    async def get_recent_activity(db: AsyncSession, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent system activity - ASYNC VERSION"""
        # Get recent tiles
        stmt = select(Tile).order_by(desc(Tile.created_at)).limit(limit)
        result = await db.execute(stmt)
        recent_tiles = result.scalars().all()
        
        # Get recent likes
        stmt = select(Like).order_by(desc(Like.created_at)).limit(limit)
        result = await db.execute(stmt)
        recent_likes = result.scalars().all()
        
        # Combine and sort by date
        activities = []
        
        for tile in recent_tiles:
            activities.append({
                "type": "tile_created",
                "timestamp": tile.created_at,
                "user_id": tile.creator_id,
                "canvas_id": tile.canvas_id,
                "details": f"Tile created at ({tile.x}, {tile.y})"
            })
        
        for like in recent_likes:
            activities.append({
                "type": "tile_liked",
                "timestamp": like.created_at,
                "user_id": like.user_id,
                "tile_id": like.tile_id,
                "details": "Tile liked"
            })
        
        # Sort by timestamp (most recent first)
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return activities[:limit]


# Create admin service instance
admin_service = AdminService()