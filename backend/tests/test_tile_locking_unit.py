"""
Unit Tests for Tile Locking Functionality
"""
import pytest
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock

from app.models import User, Canvas, Tile, TileLock
from app.repositories.tile_lock import TileLockRepository
from app.services.tile import TileService
from app.core.database import Base


class TestTileLockingUnit:
    """Unit tests for tile locking functionality"""
    
    def setup_method(self):
        """Setup test database and services"""
        # Create in-memory SQLite database
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        
        # Create all tables
        Base.metadata.create_all(bind=self.engine)
        
        # Create session
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = TestingSessionLocal()
        
        # Create services
        self.tile_service = TileService()
        self.tile_lock_repository = TileLockRepository()
        
        # Create test data
        self.create_test_data()
    
    def teardown_method(self):
        """Clean up after tests"""
        self.db.close()
    
    def create_test_data(self):
        """Create test users, canvas, and tile"""
        # Create test users
        self.user1 = User(
            username="user1",
            email="user1@example.com",
            hashed_password="hashed_password",
            first_name="User",
            last_name="One"
        )
        self.user2 = User(
            username="user2",
            email="user2@example.com",
            hashed_password="hashed_password",
            first_name="User",
            last_name="Two"
        )
        
        self.db.add(self.user1)
        self.db.add(self.user2)
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)
        
        # Create test canvas
        self.canvas = Canvas(
            name="Test Canvas",
            width=1000,
            height=1000,
            tile_size=32,
            max_tiles_per_user=10,
            collaboration_mode="tile-lock",
            creator_id=self.user1.id
        )
        
        self.db.add(self.canvas)
        self.db.commit()
        self.db.refresh(self.canvas)
        
        # Create test tile with JSON string pixel data
        pixel_data = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        self.tile = Tile(
            canvas_id=self.canvas.id,
            creator_id=self.user1.id,
            x=0,
            y=0,
            pixel_data=json.dumps(pixel_data)
        )
        
        self.db.add(self.tile)
        self.db.commit()
        self.db.refresh(self.tile)
    
    def test_acquire_lock_success(self):
        """Test successful lock acquisition"""
        # Acquire lock
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        
        assert lock is not None
        assert lock.tile_id == self.tile.id
        assert lock.user_id == self.user1.id
        assert lock.is_active == True
        assert lock.expires_at > datetime.utcnow()
    
    def test_acquire_lock_conflict(self):
        """Test that second user cannot acquire lock when tile is already locked"""
        # User1 acquires lock
        lock1 = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock1 is not None
        
        # User2 tries to acquire same lock
        lock2 = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user2.id, 30)
        assert lock2 is None
    
    def test_release_lock_success(self):
        """Test successful lock release"""
        # Acquire lock
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock is not None
        
        # Release lock
        success = self.tile_lock_repository.release_lock(self.db, self.tile.id, self.user1.id)
        assert success == True
        
        # Verify lock is inactive
        active_lock = self.tile_lock_repository.get_by_tile_id(self.db, self.tile.id)
        assert active_lock is None
    
    def test_release_lock_unauthorized(self):
        """Test that user cannot release lock they don't own"""
        # User1 acquires lock
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock is not None
        
        # User2 tries to release lock they don't own
        success = self.tile_lock_repository.release_lock(self.db, self.tile.id, self.user2.id)
        assert success == False
        
        # Verify lock is still active
        active_lock = self.tile_lock_repository.get_by_tile_id(self.db, self.tile.id)
        assert active_lock is not None
        assert active_lock.user_id == self.user1.id
    
    def test_extend_lock_success(self):
        """Test successful lock extension"""
        # Acquire lock
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock is not None
        
        original_expires_at = lock.expires_at
        
        # Extend lock
        success = self.tile_lock_repository.extend_lock(self.db, self.tile.id, self.user1.id, 60)
        assert success == True
        
        # Verify lock expiration was extended
        self.db.refresh(lock)
        assert lock.expires_at > original_expires_at
    
    def test_extend_lock_unauthorized(self):
        """Test that user cannot extend lock they don't own"""
        # User1 acquires lock
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock is not None
        
        # User2 tries to extend lock they don't own
        success = self.tile_lock_repository.extend_lock(self.db, self.tile.id, self.user2.id, 60)
        assert success == False
    
    def test_lock_expiration_cleanup(self):
        """Test that expired locks are cleaned up"""
        # Create an expired lock manually
        expired_lock = TileLock(
            tile_id=self.tile.id,
            user_id=self.user1.id,
            expires_at=datetime.utcnow() - timedelta(minutes=1),
            is_active=True
        )
        self.db.add(expired_lock)
        self.db.commit()
        
        # Verify expired lock exists
        active_lock = self.tile_lock_repository.get_by_tile_id(self.db, self.tile.id)
        assert active_lock is not None
        assert active_lock.is_expired() == True
        
        # Cleanup expired locks
        count = self.tile_lock_repository.cleanup_expired_locks(self.db)
        assert count == 1
        
        # Verify expired lock was removed
        active_lock = self.tile_lock_repository.get_by_tile_id(self.db, self.tile.id)
        assert active_lock is None
    
    def test_acquire_lock_after_expired(self):
        """Test that lock can be acquired after expired lock is cleaned up"""
        # Create an expired lock
        expired_lock = TileLock(
            tile_id=self.tile.id,
            user_id=self.user1.id,
            expires_at=datetime.utcnow() - timedelta(minutes=1),
            is_active=True
        )
        self.db.add(expired_lock)
        self.db.commit()
        
        # User2 should be able to acquire lock (expired lock will be cleaned up)
        lock = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user2.id, 30)
        assert lock is not None
        assert lock.user_id == self.user2.id
    
    def test_multiple_tiles_same_user(self):
        """Test that user can lock multiple tiles"""
        # Create second tile
        pixel_data2 = [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        tile2 = Tile(
            canvas_id=self.canvas.id,
            creator_id=self.user1.id,
            x=1,
            y=0,
            pixel_data=json.dumps(pixel_data2)
        )
        self.db.add(tile2)
        self.db.commit()
        self.db.refresh(tile2)
        
        # User1 locks first tile
        lock1 = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        assert lock1 is not None
        
        # User1 locks second tile
        lock2 = self.tile_lock_repository.acquire_lock(self.db, tile2.id, self.user1.id, 30)
        assert lock2 is not None
    
    def test_get_active_locks_by_user(self):
        """Test getting all active locks for a user"""
        # User1 locks multiple tiles
        lock1 = self.tile_lock_repository.acquire_lock(self.db, self.tile.id, self.user1.id, 30)
        
        # Create second tile and lock it
        pixel_data2 = [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        tile2 = Tile(
            canvas_id=self.canvas.id,
            creator_id=self.user1.id,
            x=1,
            y=0,
            pixel_data=json.dumps(pixel_data2)
        )
        self.db.add(tile2)
        self.db.commit()
        self.db.refresh(tile2)
        
        lock2 = self.tile_lock_repository.acquire_lock(self.db, tile2.id, self.user1.id, 30)
        
        # Get all active locks for user1
        active_locks = self.tile_lock_repository.get_active_locks_by_user(self.db, self.user1.id)
        assert len(active_locks) == 2
        assert any(lock.tile_id == self.tile.id for lock in active_locks)
        assert any(lock.tile_id == tile2.id for lock in active_locks)
    
    def test_lock_is_expired_method(self):
        """Test the is_expired method on TileLock model"""
        # Create an expired lock
        expired_lock = TileLock(
            tile_id=self.tile.id,
            user_id=self.user1.id,
            expires_at=datetime.utcnow() - timedelta(minutes=1),
            is_active=True
        )
        assert expired_lock.is_expired() == True
        
        # Create a valid lock
        valid_lock = TileLock(
            tile_id=self.tile.id,
            user_id=self.user1.id,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
            is_active=True
        )
        assert valid_lock.is_expired() == False
    
    def test_extend_lock_method(self):
        """Test the extend_lock method on TileLock model"""
        # Create a lock
        lock = TileLock(
            tile_id=self.tile.id,
            user_id=self.user1.id,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
            is_active=True
        )
        
        original_expires_at = lock.expires_at
        
        # Extend the lock
        lock.extend_lock(60)
        
        assert lock.expires_at > original_expires_at


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 