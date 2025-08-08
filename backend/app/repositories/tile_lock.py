"""
Tile lock repository for managing tile editing locks
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta, timezone

from .base import SQLAlchemyRepository
from ..models.tile_lock import TileLock


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
    
    def acquire_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> TileLock:
        """Acquire a lock for a tile"""
        # Release any existing lock first
        self.release_lock(db, tile_id, user_id)
        
        # Create new lock
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        lock = TileLock(
            tile_id=tile_id,
            user_id=user_id,
            expires_at=expires_at,
            is_active=True
        )
        
        db.add(lock)
        db.commit()
        db.refresh(lock)
        return lock
    
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
        """Clean up expired locks"""
        expired_count = db.query(TileLock).filter(
            TileLock.expires_at <= datetime.now(timezone.utc)
        ).count()
        
        db.query(TileLock).filter(
            TileLock.expires_at <= datetime.now(timezone.utc)
        ).delete()
        
        db.commit()
        return expired_count 