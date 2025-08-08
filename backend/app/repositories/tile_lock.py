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
        with smart_logger.lock_operation("acquire", tile_id, user_id) as transaction:
            transaction_id = transaction.id
            
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
                    smart_logger.add_to_transaction(transaction_id, LogLevel.INFO, 
                                                  f"Cleaning up {len(stale_locks)} stale locks")
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
                        smart_logger.add_to_transaction(transaction_id, LogLevel.SUCCESS, "Extending existing lock")
                        existing_lock.extend_lock(minutes)
                        db.commit()
                        db.refresh(existing_lock)
                        return existing_lock
                    else:
                        # Tile is locked by another user
                        smart_logger.add_to_transaction(transaction_id, LogLevel.WARN, 
                                                      f"Tile locked by user {existing_lock.user_id}")
                        return None
            
            # No active lock exists, try to create new one with conflict resolution
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutes)
            
            # Use database-level conflict resolution to handle race conditions
            # This approach uses a "upsert" pattern with ON CONFLICT handling
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
                    
                    # Check if there's now an active lock by another user
                    active_lock = db.query(TileLock).filter(
                        and_(
                            TileLock.tile_id == tile_id,
                            TileLock.is_active == True,
                            TileLock.expires_at > datetime.now(timezone.utc)
                        )
                    ).first()
                    
                    if active_lock:
                        if active_lock.user_id == user_id:
                            # We somehow got the lock, extend it
                            print(f"✅ Found our lock after conflict, extending it")
                            active_lock.extend_lock(minutes)
                            db.commit()
                            db.refresh(active_lock)
                            return active_lock
                        else:
                            # Another user got the lock
                            print(f"❌ Another user {active_lock.user_id} acquired lock for tile {tile_id}")
                            return None
                    else:
                        # More aggressive cleanup - remove ALL locks for this tile that aren't truly active
                        print(f"🔍 Performing aggressive cleanup for tile {tile_id}")
                        all_locks_for_tile = db.query(TileLock).filter(TileLock.tile_id == tile_id).all()
                        stale_locks_found = []
                        
                        for lock in all_locks_for_tile:
                            if (not lock.is_active or lock.expires_at <= datetime.now(timezone.utc)):
                                stale_locks_found.append(lock)
                        
                        if stale_locks_found:
                            print(f"🧹 Aggressive cleanup: removing {len(stale_locks_found)} stale lock(s) for tile {tile_id}")
                            for stale_lock in stale_locks_found:
                                db.delete(stale_lock)
                            db.commit()
                            
                            # Try to create lock again after cleanup
                            try:
                                lock = TileLock(
                                    tile_id=tile_id,
                                    user_id=user_id,
                                    expires_at=expires_at,
                                    is_active=True
                                )
                                print(f"🔒 Retry: Creating new lock for tile {tile_id} by user {user_id}")
                                db.add(lock)
                                db.commit()
                                db.refresh(lock)
                                return lock
                            except Exception as retry_error:
                                print(f"❌ Retry failed: {type(retry_error).__name__}: {str(retry_error)}")
                                db.rollback()
                                return None
                        
                        # No active lock found, something went wrong
                        print(f"⚠️ No active lock found after conflict resolution for tile {tile_id}")
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