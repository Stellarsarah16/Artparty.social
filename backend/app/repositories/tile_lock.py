"""
Tile lock repository for managing tile editing locks
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text, or_
from datetime import datetime, timedelta, timezone

from .base import SQLAlchemyRepository
from ..models.tile_lock import TileLock
from ..utils.smart_logger import smart_logger, LogLevel


class TileLockRepository(SQLAlchemyRepository[TileLock, dict, dict]):
    """Tile lock repository with lock-specific operations"""
    
    def __init__(self):
        super().__init__(TileLock)
    
    def get_by_tile_id(self, db: Session, tile_id: int) -> Optional[TileLock]:
        """Get active lock for a tile"""
        return db.query(TileLock).filter(
            and_(
                TileLock.tile_id == tile_id,
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        ).first()
    
    def acquire_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> Optional[TileLock]:
        """Acquire a lock for a tile with proper race condition handling"""
        try:
            # First, clean up any expired OR inactive locks for this tile
            # This is crucial because the unique constraint on tile_id prevents
            # creating new locks even if old ones are expired or inactive
            stale_locks = db.query(TileLock).filter(
                and_(
                    TileLock.tile_id == tile_id,
                    or_(
                        TileLock.expires_at <= datetime.now(timezone.utc),  # Expired
                        TileLock.is_active == False  # Inactive
                    )
                )
            ).all()
            
            if stale_locks:
                print(f"🧹 Removing {len(stale_locks)} stale lock(s) for tile {tile_id}")
                for stale_lock in stale_locks:
                    db.delete(stale_lock)
                db.commit()
            
            # Check if there's already an active lock for this tile
            existing_lock = db.query(TileLock).filter(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.is_active == True,
                    TileLock.expires_at > datetime.now(timezone.utc)
                )
            ).first()
            
            if existing_lock:
                # If the existing lock is owned by the same user, extend it
                if existing_lock.user_id == user_id:
                    print(f"🔄 Extending existing lock for tile {tile_id} by user {user_id}")
                    existing_lock.extend_lock(minutes)
                    db.commit()
                    db.refresh(existing_lock)
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
                db.commit()
                db.refresh(lock)
                return lock
                
            except Exception as insert_error:
                # If insert fails due to unique constraint, check if another user got the lock
                if "UniqueViolation" in str(insert_error) or "duplicate key" in str(insert_error).lower():
                    print(f"🔄 Unique constraint violation during lock acquisition for tile {tile_id}")
                    db.rollback()
                    return None
                else:
                    # Some other error occurred
                    print(f"❌ Unexpected error during lock acquisition: {type(insert_error).__name__}: {str(insert_error)}")
                    db.rollback()
                    raise insert_error
                    
        except Exception as e:
            print(f"❌ Error in acquire_lock: {type(e).__name__}: {str(e)}")
            db.rollback()
            raise e
    
    def release_lock(self, db: Session, tile_id: int, user_id: int) -> bool:
        """Release a lock for a tile"""
        lock = db.query(TileLock).filter(
            and_(
                TileLock.tile_id == tile_id,
                TileLock.user_id == user_id,
                TileLock.is_active == True
            )
        ).first()
        
        if lock:
            lock.is_active = False
            db.commit()
            return True
        return False
    
    def extend_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> bool:
        """Extend a lock for a tile"""
        lock = db.query(TileLock).filter(
            and_(
                TileLock.tile_id == tile_id,
                TileLock.user_id == user_id,
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        ).first()
        
        if lock:
            lock.extend_lock(minutes)
            db.commit()
            return True
        return False
    
    def cleanup_expired_locks(self, db: Session) -> int:
        """Clean up expired locks with better performance"""
        try:
            # Count expired locks first
            expired_count = db.query(TileLock).filter(
                or_(
                    TileLock.expires_at <= datetime.now(timezone.utc),
                    TileLock.is_active == False
                )
            ).count()
            
            if expired_count > 0:
                # Delete expired locks
                db.query(TileLock).filter(
                    or_(
                        TileLock.expires_at <= datetime.now(timezone.utc),
                        TileLock.is_active == False
                    )
                ).delete()
                db.commit()
                print(f"🧹 Cleaned up {expired_count} expired/inactive locks")
            
            return expired_count
        except Exception as e:
            print(f"❌ Error cleaning up locks: {type(e).__name__}: {str(e)}")
            db.rollback()
            return 0
    
    def force_release_lock(self, db: Session, tile_id: int) -> bool:
        """Force release any lock on a tile (admin function)"""
        try:
            result = db.query(TileLock).filter(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.is_active == True
                )
            ).update({
                'is_active': False,
                'expires_at': datetime.now(timezone.utc)
            })
            db.commit()
            print(f"🔓 Force released lock for tile {tile_id}")
            return result > 0
        except Exception as e:
            print(f"❌ Error force releasing lock: {type(e).__name__}: {str(e)}")
            db.rollback()
            return False
    
    def get_active_locks(self, db: Session) -> List[TileLock]:
        """Get all active locks (admin function)"""
        return db.query(TileLock).filter(
            and_(
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        ).all()
    
    def get_user_locks(self, db: Session, user_id: int) -> List[TileLock]:
        """Get all active locks for a specific user"""
        return db.query(TileLock).filter(
            and_(
                TileLock.user_id == user_id,
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        ).all()
    
    def get_lock_statistics(self, db: Session) -> dict:
        """Get lock statistics for admin dashboard"""
        total_locks = db.query(TileLock).count()
        active_locks = db.query(TileLock).filter(
            and_(
                TileLock.is_active == True,
                TileLock.expires_at > datetime.now(timezone.utc)
            )
        ).count()
        expired_locks = db.query(TileLock).filter(
            TileLock.expires_at <= datetime.now(timezone.utc)
        ).count()
        
        return {
            'total_locks': total_locks,
            'active_locks': active_locks,
            'expired_locks': expired_locks,
            'cleanup_needed': expired_locks > 0
        }


# Create repository instance
tile_lock_repository = TileLockRepository() 