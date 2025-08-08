"""
Test Concurrent Editing and Tile Locking
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
from datetime import datetime, timedelta
import time

# Set test environment variables BEFORE importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app
from app.core.database import Base, get_db
# Import models to ensure they are registered with Base
from app.models import User, Canvas, Tile, Like, VerificationToken, TileLock


# Test database setup
@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    # Force SQLite for tests
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    print(f"Creating test engine: {engine.url}")
    
    # Import models to ensure they are registered
    from app.models import User, Canvas, Tile, Like, VerificationToken, TileLock
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"Tables created: {[table.name for table in Base.metadata.sorted_tables]}")
    return engine


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create test database session"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    print(f"Tables in test_db fixture: {[table.name for table in Base.metadata.sorted_tables]}")
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Clean up tables
        Base.metadata.drop_all(bind=test_engine)
        Base.metadata.create_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with SQLite database override"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clear the override
    app.dependency_overrides.clear()


class TestTileLocking:
    """Test tile locking functionality"""
    
    def setup_method(self):
        """Setup test data"""
        self.user1_data = {
            "username": "user1",
            "email": "user1@example.com",
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "One"
        }
        self.user2_data = {
            "username": "user2",
            "email": "user2@example.com",
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "Two"
        }
        self.user3_data = {
            "username": "user3",
            "email": "user3@example.com",
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "Three"
        }
    
    def create_users_and_canvas(self, client):
        """Helper to create test users and canvas"""
        # Create users
        user1_response = client.post("/api/v1/auth/register", json=self.user1_data)
        user2_response = client.post("/api/v1/auth/register", json=self.user2_data)
        user3_response = client.post("/api/v1/auth/register", json=self.user3_data)
        
        assert user1_response.status_code == 201
        assert user2_response.status_code == 201
        assert user3_response.status_code == 201
        
        user1_token = user1_response.json()["access_token"]
        user2_token = user2_response.json()["access_token"]
        user3_token = user3_response.json()["access_token"]
        
        # Create canvas with user1
        canvas_data = {
            "name": "Test Canvas",
            "width": 1000,
            "height": 1000,
            "tile_size": 32,
            "max_tiles_per_user": 10,
            "collaboration_mode": "tile-lock"
        }
        
        canvas_response = client.post(
            "/api/v1/canvas/",
            json=canvas_data,
            headers={"Authorization": f"Bearer {user1_token}"}
        )
        assert canvas_response.status_code == 201
        canvas = canvas_response.json()
        
        # Create a tile with user1
        tile_data = {
            "canvas_id": canvas["id"],
            "x": 0,
            "y": 0,
            "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        }
        
        tile_response = client.post(
            "/api/v1/tiles/",
            json=tile_data,
            headers={"Authorization": f"Bearer {user1_token}"}
        )
        assert tile_response.status_code == 201
        tile = tile_response.json()
        
        return {
            "user1_token": user1_token,
            "user2_token": user2_token,
            "user3_token": user3_token,
            "canvas": canvas,
            "tile": tile
        }
    
    def test_acquire_tile_lock_success(self, client):
        """Test successful tile lock acquisition"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "lock_id" in result
        assert result["tile_id"] == data["tile"]["id"]
        assert "expires_at" in result
        assert "Tile lock acquired successfully" in result["message"]
    
    def test_acquire_tile_lock_conflict(self, client):
        """Test that second user cannot acquire lock when tile is already locked"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        response1 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert response1.status_code == 200
        
        # User2 tries to acquire same lock
        response2 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        
        assert response2.status_code == 409
        assert "Tile is currently being edited by another user" in response2.json()["detail"]
    
    def test_release_tile_lock_success(self, client):
        """Test successful tile lock release"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # User1 releases lock
        release_response = client.delete(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert release_response.status_code == 200
        assert "Tile lock released successfully" in release_response.json()["message"]
    
    def test_release_tile_lock_unauthorized(self, client):
        """Test that user cannot release lock they don't own"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # User2 tries to release lock they don't own
        release_response = client.delete(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        
        assert release_response.status_code == 404
        assert "No active lock found for this tile" in release_response.json()["detail"]
    
    def test_extend_tile_lock_success(self, client):
        """Test successful tile lock extension"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # User1 extends lock
        extend_response = client.put(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert extend_response.status_code == 200
        assert "Tile lock extended successfully" in extend_response.json()["message"]
    
    def test_extend_tile_lock_unauthorized(self, client):
        """Test that user cannot extend lock they don't own"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # User2 tries to extend lock they don't own
        extend_response = client.put(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        
        assert extend_response.status_code == 404
        assert "No active lock found for this tile" in extend_response.json()["detail"]
    
    def test_get_tile_lock_status_unlocked(self, client):
        """Test getting lock status for unlocked tile"""
        data = self.create_users_and_canvas(client)
        
        # Check status of unlocked tile
        response = client.get(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["is_locked"] == False
        assert result["can_acquire"] == True
        assert "Tile is available for editing" in result["message"]
    
    def test_get_tile_lock_status_locked_by_self(self, client):
        """Test getting lock status when user owns the lock"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # Check status
        response = client.get(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["is_locked"] == True
        assert result["can_acquire"] == False
        assert "You have the lock for this tile" in result["message"]
        assert "locked_by_user_id" in result
        assert "expires_at" in result
    
    def test_get_tile_lock_status_locked_by_other(self, client):
        """Test getting lock status when tile is locked by another user"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire_response.status_code == 200
        
        # User2 checks status
        response = client.get(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["is_locked"] == True
        assert result["can_acquire"] == False
        assert "Tile is being edited by another user" in result["message"]
        assert "locked_by_user_id" in result
        assert "expires_at" in result
    
    def test_acquire_lock_after_release(self, client):
        """Test that lock can be acquired after being released"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        acquire1_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert acquire1_response.status_code == 200
        
        # User1 releases lock
        release_response = client.delete(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert release_response.status_code == 200
        
        # User2 can now acquire lock
        acquire2_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        assert acquire2_response.status_code == 200
    
    def test_concurrent_lock_requests(self, client):
        """Test multiple users trying to acquire lock simultaneously"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock
        response1 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert response1.status_code == 200
        
        # User2 and User3 try to acquire same lock
        response2 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        response3 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user3_token']}"}
        )
        
        # Both should fail
        assert response2.status_code == 409
        assert response3.status_code == 409
        assert "Tile is currently being edited by another user" in response2.json()["detail"]
        assert "Tile is currently being edited by another user" in response3.json()["detail"]
    
    def test_lock_expiration_cleanup(self, client):
        """Test that expired locks are cleaned up automatically"""
        data = self.create_users_and_canvas(client)
        
        # User1 acquires lock with very short expiration (1 second)
        response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert response.status_code == 200
        
        # Wait for lock to expire
        time.sleep(2)
        
        # User2 should now be able to acquire lock
        response2 = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        assert response2.status_code == 200
    
    def test_tile_not_found(self, client):
        """Test lock operations on non-existent tile"""
        data = self.create_users_and_canvas(client)
        
        # Try to acquire lock for non-existent tile
        response = client.post(
            "/api/v1/tile-locks/99999/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        
        assert response.status_code == 404
        assert "Tile not found" in response.json()["detail"]
    
    def test_unauthorized_access(self, client):
        """Test lock operations without authentication"""
        data = self.create_users_and_canvas(client)
        
        # Try to acquire lock without token
        response = client.post(f"/api/v1/tile-locks/{data['tile']['id']}/lock")
        
        assert response.status_code == 401
    
    def test_multiple_tiles_same_user(self, client):
        """Test that user can lock multiple tiles"""
        data = self.create_users_and_canvas(client)
        
        # Create second tile
        tile2_data = {
            "canvas_id": data["canvas"]["id"],
            "x": 1,
            "y": 0,
            "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        }
        
        tile2_response = client.post(
            "/api/v1/tiles/",
            json=tile2_data,
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert tile2_response.status_code == 201
        tile2 = tile2_response.json()
        
        # User1 locks first tile
        lock1_response = client.post(
            f"/api/v1/tile-locks/{data['tile']['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert lock1_response.status_code == 200
        
        # User1 locks second tile
        lock2_response = client.post(
            f"/api/v1/tile-locks/{tile2['id']}/lock",
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert lock2_response.status_code == 200
    
    def test_collaboration_mode_restrictions(self, client):
        """Test that tile locking respects collaboration mode restrictions"""
        data = self.create_users_and_canvas(client)
        
        # Create canvas with free collaboration mode
        free_canvas_data = {
            "name": "Free Canvas",
            "width": 1000,
            "height": 1000,
            "tile_size": 32,
            "max_tiles_per_user": 10,
            "collaboration_mode": "free"
        }
        
        free_canvas_response = client.post(
            "/api/v1/canvas/",
            json=free_canvas_data,
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert free_canvas_response.status_code == 201
        free_canvas = free_canvas_response.json()
        
        # Create tile on free canvas
        free_tile_data = {
            "canvas_id": free_canvas["id"],
            "x": 0,
            "y": 0,
            "pixel_data": [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
        }
        
        free_tile_response = client.post(
            "/api/v1/tiles/",
            json=free_tile_data,
            headers={"Authorization": f"Bearer {data['user1_token']}"}
        )
        assert free_tile_response.status_code == 201
        free_tile = free_tile_response.json()
        
        # In free mode, any user should be able to acquire lock
        lock_response = client.post(
            f"/api/v1/tile-locks/{free_tile['id']}/lock",
            headers={"Authorization": f"Bearer {data['user2_token']}"}
        )
        assert lock_response.status_code == 200


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 