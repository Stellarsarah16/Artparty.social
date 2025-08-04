"""
Repository for tile lock operations
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from ..models.tile_lock import TileLock
from ..repositories.base import BaseRepository


class TileLockRepository(BaseRepository[TileLock]):
    """Repository for tile lock operations"""
    
    def get_by_tile_id(self, db: Session, tile_id: int) -> Optional[TileLock]:
        """Get active lock for a tile"""
        return db.query(TileLock).filter(
            TileLock.tile_id == tile_id,
            TileLock.is_active == True
        ).first()
    
    def get_active_locks_by_user(self, db: Session, user_id: int) -> List[TileLock]:
        """Get all active locks for a user"""
        return db.query(TileLock).filter(
            TileLock.user_id == user_id,
            TileLock.is_active == True,
            TileLock.expires_at > datetime.utcnow()
        ).all()
    
    def acquire_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> Optional[TileLock]:
        """Acquire a lock for a tile"""
        # Check if tile is already locked
        existing_lock = self.get_by_tile_id(db, tile_id)
        if existing_lock:
            # If lock is expired, remove it
            if existing_lock.is_expired():
                db.delete(existing_lock)
                db.commit()
            else:
                # Tile is locked by someone else
                return None
        
        # Create new lock
        expires_at = datetime.utcnow() + timedelta(minutes=minutes)
        lock = TileLock(
            tile_id=tile_id,
            user_id=user_id,
            expires_at=expires_at
        )
        
        db.add(lock)
        db.commit()
        db.refresh(lock)
        
        return lock
    
    def release_lock(self, db: Session, tile_id: int, user_id: int) -> bool:
        """Release a lock for a tile"""
        lock = self.get_by_tile_id(db, tile_id)
        if lock and lock.user_id == user_id:
            lock.is_active = False
            db.commit()
            return True
        return False
    
    def extend_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> bool:
        """Extend a lock for a tile"""
        lock = self.get_by_tile_id(db, tile_id)
        if lock and lock.user_id == user_id:
            lock.extend_lock(minutes)
            db.commit()
            return True
        return False
    
    def cleanup_expired_locks(self, db: Session) -> int:
        """Remove all expired locks"""
        expired_locks = db.query(TileLock).filter(
            TileLock.expires_at <= datetime.utcnow()
        ).all()
        
        count = len(expired_locks)
        for lock in expired_locks:
            db.delete(lock)
        
        db.commit()
        return count


# Create repository instance
tile_lock_repository = TileLockRepository() 