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
    
    def acquire_lock(self, db: Session, tile_id: int, user_id: int, minutes: int = 30) -> Optional[TileLock]:
        """Acquire a lock for a tile"""
        try:
            # First, clean up any expired locks for this tile
            expired_lock = db.query(TileLock).filter(
                and_(
                    TileLock.tile_id == tile_id,
                    TileLock.expires_at <= datetime.now(timezone.utc)
                )
            ).first()
            if expired_lock:
                print(f"🧹 Removing expired lock for tile {tile_id}")
                db.delete(expired_lock)
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
            
            # No active lock exists, create new one
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            lock = TileLock(
                tile_id=tile_id,
                user_id=user_id,
                expires_at=expires_at,
                is_active=True
            )
            
            print(f"🔒 Creating new lock for tile {tile_id} by user {user_id}")
            db.add(lock)
            db.commit()
            db.refresh(lock)
            return lock
            
        except Exception as e:
            print(f"❌ Error in acquire_lock: {type(e).__name__}: {str(e)}")
            db.rollback()
            
            # If it's a unique constraint violation, check if there's now an active lock
            if "UniqueViolation" in str(e) or "duplicate key" in str(e).lower():
                print(f"🔄 Unique constraint violation, checking for active lock on tile {tile_id}")
                active_lock = db.query(TileLock).filter(
                    and_(
                        TileLock.tile_id == tile_id,
                        TileLock.is_active == True,
                        TileLock.expires_at > datetime.now(timezone.utc)
                    )
                ).first()
                
                if active_lock:
                    if active_lock.user_id == user_id:
                        print(f"✅ Found our lock after conflict, extending it")
                        active_lock.extend_lock(minutes)
                        db.commit()
                        db.refresh(active_lock)
                        return active_lock
                    else:
                        print(f"❌ Tile {tile_id} is locked by user {active_lock.user_id}")
                        return None
            
            # Re-raise the exception if it's not a unique constraint issue
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
        """Clean up expired locks"""
        expired_count = db.query(TileLock).filter(
            TileLock.expires_at <= datetime.now(timezone.utc)
        ).count()
        
        db.query(TileLock).filter(
            TileLock.expires_at <= datetime.now(timezone.utc)
        ).delete()
        
        db.commit()
        return expired_count


# Create repository instance
tile_lock_repository = TileLockRepository() 