"""
Test for tile lock race condition fix
"""
import pytest
import threading
import time
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.models.tile_lock import TileLock
from app.models.tile import Tile
from app.models.user import User
from app.models.canvas import Canvas
from app.repositories.tile_lock import TileLockRepository
from app.services.tile import TileService
from app.main import app


class TestTileLockRaceCondition:
    """Test tile lock race condition scenarios"""
    
    def test_concurrent_lock_acquisition(self, db: Session):
        """Test that only one user can acquire a lock when multiple try simultaneously"""
        # Create test data
        canvas = Canvas(
            name="Test Canvas",
            width=100,
            height=100,
            tile_size=10,
            max_tiles_per_user=5,
            collaboration_mode="free",
            is_active=True
        )
        db.add(canvas)
        db.commit()
        db.refresh(canvas)
        
        tile = Tile(
            canvas_id=canvas.id,
            x=0,
            y=0,
            pixel_data=[[0 for _ in range(10)] for _ in range(10)],
            creator_id=1
        )
        db.add(tile)
        db.commit()
        db.refresh(tile)
        
        user1 = User(username="user1", email="user1@test.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@test.com", hashed_password="hash")
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Test concurrent lock acquisition
        results = []
        errors = []
        
        def acquire_lock(user_id: int):
            """Helper function to acquire lock"""
            try:
                with Session(db.bind) as session:
                    tile_service = TileService()
                    user = session.query(User).filter(User.id == user_id).first()
                    result = tile_service.acquire_tile_lock(session, tile.id, user, minutes=30)
                    results.append((user_id, result))
            except Exception as e:
                errors.append((user_id, str(e)))
        
        # Start two threads trying to acquire the lock simultaneously
        thread1 = threading.Thread(target=acquire_lock, args=(user1.id,))
        thread2 = threading.Thread(target=acquire_lock, args=(user2.id,))
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Verify results
        assert len(results) == 1, f"Expected exactly one successful lock acquisition, got {len(results)}"
        assert len(errors) == 1, f"Expected exactly one failed lock acquisition, got {len(errors)}"
        
        # Check that the successful acquisition is valid
        successful_user_id, lock_result = results[0]
        assert "lock_id" in lock_result
        assert lock_result["tile_id"] == tile.id
        
        # Check that the error is a conflict
        failed_user_id, error_msg = errors[0]
        assert "Tile is currently being edited by another user" in error_msg
        
        print(f"✅ Race condition test passed: User {successful_user_id} got the lock, User {failed_user_id} got conflict error")
    
    def test_same_user_lock_extension(self, db: Session):
        """Test that the same user can extend their existing lock"""
        # Create test data
        canvas = Canvas(
            name="Test Canvas",
            width=100,
            height=100,
            tile_size=10,
            max_tiles_per_user=5,
            collaboration_mode="free",
            is_active=True
        )
        db.add(canvas)
        db.commit()
        db.refresh(canvas)
        
        tile = Tile(
            canvas_id=canvas.id,
            x=0,
            y=0,
            pixel_data=[[0 for _ in range(10)] for _ in range(10)],
            creator_id=1
        )
        db.add(tile)
        db.commit()
        db.refresh(tile)
        
        user = User(username="user1", email="user1@test.com", hashed_password="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        tile_service = TileService()
        
        # Acquire lock first time
        result1 = tile_service.acquire_tile_lock(db, tile.id, user, minutes=30)
        assert "lock_id" in result1
        
        # Try to acquire lock again (should extend existing lock)
        result2 = tile_service.acquire_tile_lock(db, tile.id, user, minutes=30)
        assert "lock_id" in result2
        assert result1["lock_id"] == result2["lock_id"]  # Same lock ID
        
        print("✅ Same user lock extension test passed")
    
    def test_expired_lock_cleanup(self, db: Session):
        """Test that expired locks are properly cleaned up"""
        # Create test data
        canvas = Canvas(
            name="Test Canvas",
            width=100,
            height=100,
            tile_size=10,
            max_tiles_per_user=5,
            collaboration_mode="free",
            is_active=True
        )
        db.add(canvas)
        db.commit()
        db.refresh(canvas)
        
        tile = Tile(
            canvas_id=canvas.id,
            x=0,
            y=0,
            pixel_data=[[0 for _ in range(10)] for _ in range(10)],
            creator_id=1
        )
        db.add(tile)
        db.commit()
        db.refresh(tile)
        
        user = User(username="user1", email="user1@test.com", hashed_password="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create an expired lock manually
        expired_lock = TileLock(
            tile_id=tile.id,
            user_id=user.id,
            expires_at=time.time() - 3600,  # 1 hour ago
            is_active=True
        )
        db.add(expired_lock)
        db.commit()
        
        # Try to acquire lock (should clean up expired lock and succeed)
        tile_service = TileService()
        result = tile_service.acquire_tile_lock(db, tile.id, user, minutes=30)
        assert "lock_id" in result
        
        # Verify expired lock was cleaned up
        expired_locks = db.query(TileLock).filter(
            TileLock.tile_id == tile.id,
            TileLock.expires_at <= time.time()
        ).all()
        assert len(expired_locks) == 0
        
        print("✅ Expired lock cleanup test passed")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
