"""
Tile lock repository for managing tile editing locks
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, text, or_, select
from datetime import datetime, timedelta, timezone

from .base import SQLAlchemyRepository
from ..models.tile_lock import TileLock
from ..utils.smart_logger import smart_logger, LogLevel


class TileLockRepository(SQLAlchemyRepository[TileLock, dict, dict]):
    """Tile lock repository with lock-specific operations"""
    
    def __init__(self):
        super().__init__(TileLock)
    
    async def get_by_tile_id(self, db: AsyncSession, tile_id: int) -> Optional[TileLock]:
        """Get active lock for a tile"""
        stmt = select(TileLock).where(
            and_(
                TileLock.tile_id == tile_id,
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def acquire_lock(self, db: AsyncSession, tile_id: int, user_id: int, minutes: int = 30) -> Optional[TileLock]:
        """Acquire a lock for a tile with proper race condition handling"""
        try:
            # First, clean up any expired OR inactive locks for this tile
            # This is crucial because the unique constraint on tile_id prevents
            # creating new locks even if old ones are expired or inactive
            stale_stmt = select(TileLock).where(
                and_(
                    TileLock.tile_id == tile_id,
                    or_(
                        TileLock.expires_at <= datetime.now(timezone.utc),  # Expired
                        TileLock.is_active == False  # Inactive
                    )
                )
            )
            result = await db.execute(stale_stmt)
            stale_locks = result.scalars().all()
            
            if stale_locks:
                print(f"🧹 Removing {len(stale_locks)} stale lock(s) for tile {tile_id}")
                for stale_lock in stale_locks:
                    await db.delete(stale_lock)
                await db.commit()
            
            # Check if there's already an active lock for this tile
            existing_stmt = select(TileLock).where(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.is_active == True,
                    TileLock.expires_at > datetime.now(timezone.utc)
                )
            )
            result = await db.execute(existing_stmt)
            existing_lock = result.scalar_one_or_none()
            
            if existing_lock:
                # If the existing lock is owned by the same user, extend it
                if existing_lock.user_id == user_id:
                    print(f"🔄 Extending existing lock for tile {tile_id} by user {user_id}")
                    existing_lock.extend_lock(minutes)
                    await db.commit()
                    await db.refresh(existing_lock)
                    return existing_lock
                else:
                    # Tile is locked by another user
                    print(f"❌ Tile {tile_id} is locked by user {existing_lock.user_id}, cannot acquire for user {user_id}")
                    return None
            
            # No active lock exists, try to create new one with conflict resolution
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            
            # Use database-level conflict resolution to handle race conditions
            try:
                # First, try to insert a new lock
                lock = TileLock(
                    tile_id=tile_id,
                    user_id=user_id,
                    expires_at=expires_at,
                    is_active=True
                )
                
                print(f"🔒 Attempting to create new lock for tile {tile_id} by user {user_id}")
                db.add(lock)
                await db.commit()
                await db.refresh(lock)
                return lock
                
            except Exception as insert_error:
                # If insert fails due to unique constraint, check if another user got the lock
                if "UniqueViolation" in str(insert_error) or "duplicate key" in str(insert_error).lower():
                    print(f"🔄 Unique constraint violation during lock acquisition for tile {tile_id}")
                    await db.rollback()
                    return None
                else:
                    # Some other error occurred
                    print(f"❌ Unexpected error during lock acquisition: {type(insert_error).__name__}: {str(insert_error)}")
                    await db.rollback()
                    raise
        
        except Exception as e:
            print(f"❌ Error acquiring lock: {type(e).__name__}: {str(e)}")
            await db.rollback()
            return None
    
    async def release_lock(self, db: AsyncSession, tile_id: int, user_id: int) -> bool:
        """Release a lock for a tile"""
        try:
            stmt = select(TileLock).where(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.user_id == user_id,
                    TileLock.is_active == True
                )
            )
            result = await db.execute(stmt)
            lock = result.scalar_one_or_none()
            
            if lock:
                lock.is_active = False
                lock.expires_at = datetime.now(timezone.utc)
                await db.commit()
                print(f"🔓 Released lock for tile {tile_id} by user {user_id}")
                return True
            return False
        except Exception as e:
            print(f"❌ Error releasing lock: {type(e).__name__}: {str(e)}")
            await db.rollback()
            return False
    
    async def extend_lock(self, db: AsyncSession, tile_id: int, user_id: int, minutes: int = 30) -> bool:
        """Extend an existing lock for a tile"""
        try:
            stmt = select(TileLock).where(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.user_id == user_id,
                    TileLock.is_active == True,
                    TileLock.expires_at > datetime.now(timezone.utc)
                )
            )
            result = await db.execute(stmt)
            lock = result.scalar_one_or_none()
            
            if lock:
                lock.extend_lock(minutes)
                await db.commit()
                print(f"⏰ Extended lock for tile {tile_id} by user {user_id} for {minutes} minutes")
                return True
            return False
        except Exception as e:
            print(f"❌ Error extending lock: {type(e).__name__}: {str(e)}")
            await db.rollback()
            return False
    
    async def cleanup_expired_locks(self, db: AsyncSession) -> int:
        """Clean up expired locks with better performance"""
        try:
            # Count expired locks first
            expired_stmt = select(TileLock).where(
                or_(
                    TileLock.expires_at <= datetime.now(timezone.utc),
                    TileLock.is_active == False
                )
            )
            result = await db.execute(expired_stmt)
            expired_locks = result.scalars().all()
            expired_count = len(expired_locks)
            
            if expired_count > 0:
                # Delete expired locks
                for lock in expired_locks:
                    await db.delete(lock)
                await db.commit()
                print(f"🧹 Cleaned up {expired_count} expired/inactive locks")
            
            return expired_count
        except Exception as e:
            print(f"❌ Error cleaning up locks: {type(e).__name__}: {str(e)}")
            await db.rollback()
            return 0
    
    async def force_release_lock(self, db: AsyncSession, tile_id: int) -> bool:
        """Force release any lock on a tile (admin function)"""
        try:
            stmt = select(TileLock).where(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.is_active == True
                )
            )
            result = await db.execute(stmt)
            lock = result.scalar_one_or_none()
            
            if lock:
                lock.is_active = False
                lock.expires_at = datetime.now(timezone.utc)
                await db.commit()
                print(f"🔓 Force released lock for tile {tile_id}")
                return True
            return False
        except Exception as e:
            print(f"❌ Error force releasing lock: {type(e).__name__}: {str(e)}")
            await db.rollback()
            return False
    
    async def get_active_locks(self, db: AsyncSession) -> List[TileLock]:
        """Get all active locks (admin function)"""
        stmt = select(TileLock).where(
            and_(
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_user_locks(self, db: AsyncSession, user_id: int) -> List[TileLock]:
        """Get all active locks for a specific user"""
        stmt = select(TileLock).where(
            and_(
                TileLock.user_id == user_id,
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    
    async def get_lock_statistics(self, db: AsyncSession) -> dict:
        """Get lock statistics for admin dashboard"""
        # Total locks
        total_stmt = select(TileLock)
        result = await db.execute(total_stmt)
        total_locks = len(result.scalars().all())
        
        # Active locks
        active_stmt = select(TileLock).where(
            and_(
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        )
        result = await db.execute(active_stmt)
        active_locks = len(result.scalars().all())
        
        # Expired locks
        expired_stmt = select(TileLock).where(
            TileLock.expires_at <= datetime.now(timezone.utc)
        )
        result = await db.execute(expired_stmt)
        expired_locks = len(result.scalars().all())
        
        return {
            'total_locks': total_locks,
            'active_locks': active_locks,
            'expired_locks': expired_locks,
            'cleanup_needed': expired_locks > 0
        }


# Create repository instance
tile_lock_repository = TileLockRepository() 