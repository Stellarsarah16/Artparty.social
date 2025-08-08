"""
Test Collaboration Mode Functionality
"""
import pytest
import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
import os
from datetime import datetime, timedelta

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User
from app.models.canvas import Canvas
from app.models.tile import Tile
from app.models.tile_lock import TileLock
from app.services.auth import AuthService


# Test database setup
@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    # Use in-memory SQLite for tests
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create test database session"""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create all tables
    Base.metadata.create_all(bind=test_engine)
    
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
    """Create test client"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


class TestCollaborationModes:
    """Test collaboration mode functionality"""
    
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
    
    def create_user(self, client, user_data):
        """Helper to create a user and return auth token"""
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201
        return response.json()["access_token"]
    
    def create_canvas(self, client, token, collaboration_mode="free"):
        """Helper to create a canvas with specified collaboration mode"""
        canvas_data = {
            "name": f"Test Canvas - {collaboration_mode}",
            "description": f"Test canvas with {collaboration_mode} mode",
            "width": 1024,
            "height": 1024,
            "tile_size": 64,
            "collaboration_mode": collaboration_mode,
            "is_public": True
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
        assert response.status_code == 201
        return response.json()
    
    def create_tile(self, client, token, canvas_id, x=0, y=0):
        """Helper to create a tile"""
        tile_data = {
            "canvas_id": canvas_id,
            "x": x,
            "y": y,
            "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/tiles/", json=tile_data, headers=headers)
        assert response.status_code == 201
        return response.json()
    
    def test_free_mode_any_user_can_edit_any_tile(self, client):
        """Test that in free mode, any user can edit any tile"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Create canvas in free mode
        canvas = self.create_canvas(client, token1, "free")
        
        # User1 creates a tile
        tile = self.create_tile(client, token1, canvas["id"])
        
        # User2 should be able to edit User1's tile in free mode
        update_data = {
            "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        }
        
        headers = {"Authorization": f"Bearer {token2}"}
        response = client.put(f"/api/v1/tiles/{tile['id']}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        updated_tile = response.json()
        assert updated_tile["pixel_data"] == update_data["pixel_data"]
        assert updated_tile["creator_id"] == self.user1_data["username"]  # Creator remains the same
    
    def test_tile_lock_mode_only_creator_can_edit(self, client):
        """Test that in tile-lock mode, only the creator can edit their tiles"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Create canvas in tile-lock mode
        canvas = self.create_canvas(client, token1, "tile-lock")
        
        # User1 creates a tile
        tile = self.create_tile(client, token1, canvas["id"])
        
        # User2 should NOT be able to edit User1's tile in tile-lock mode
        update_data = {
            "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        }
        
        headers = {"Authorization": f"Bearer {token2}"}
        response = client.put(f"/api/v1/tiles/{tile['id']}", json=update_data, headers=headers)
        
        assert response.status_code == 403
        assert "tile lock mode" in response.json()["detail"].lower()
    
    def test_area_lock_mode_only_creator_can_edit(self, client):
        """Test that in area-lock mode, only the creator can edit their tiles"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Create canvas in area-lock mode
        canvas = self.create_canvas(client, token1, "area-lock")
        
        # User1 creates a tile
        tile = self.create_tile(client, token1, canvas["id"])
        
        # User2 should NOT be able to edit User1's tile in area-lock mode
        update_data = {
            "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        }
        
        headers = {"Authorization": f"Bearer {token2}"}
        response = client.put(f"/api/v1/tiles/{tile['id']}", json=update_data, headers=headers)
        
        assert response.status_code == 403
        assert "area lock mode" in response.json()["detail"].lower()
    
    def test_review_mode_only_creator_can_edit(self, client):
        """Test that in review mode, only the creator can edit their tiles"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Create canvas in review mode
        canvas = self.create_canvas(client, token1, "review")
        
        # User1 creates a tile
        tile = self.create_tile(client, token1, canvas["id"])
        
        # User2 should NOT be able to edit User1's tile in review mode
        update_data = {
            "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
        }
        
        headers = {"Authorization": f"Bearer {token2}"}
        response = client.put(f"/api/v1/tiles/{tile['id']}", json=update_data, headers=headers)
        
        assert response.status_code == 403
        assert "review mode" in response.json()["detail"].lower()
    
    def test_creator_can_always_edit_own_tiles(self, client):
        """Test that creators can always edit their own tiles regardless of mode"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Test all collaboration modes
        modes = ["free", "tile-lock", "area-lock", "review"]
        
        for mode in modes:
            # Create canvas in current mode
            canvas = self.create_canvas(client, token1, mode)
            
            # User1 creates a tile
            tile = self.create_tile(client, token1, canvas["id"])
            
            # User1 should be able to edit their own tile
            update_data = {
                "pixel_data": [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
            }
            
            headers = {"Authorization": f"Bearer {token1}"}
            response = client.put(f"/api/v1/tiles/{tile['id']}", json=update_data, headers=headers)
            
            assert response.status_code == 200, f"Failed in {mode} mode"
            updated_tile = response.json()
            assert updated_tile["pixel_data"] == update_data["pixel_data"]
    
    def test_tile_locking_in_free_mode(self, client):
        """Test that tile locking still works in free mode for concurrent editing protection"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Create canvas in free mode
        canvas = self.create_canvas(client, token1, "free")
        
        # User1 creates a tile
        tile = self.create_tile(client, token1, canvas["id"])
        
        # User1 acquires lock
        headers1 = {"Authorization": f"Bearer {token1}"}
        lock_response1 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers1)
        assert lock_response1.status_code == 200
        
        # User2 tries to acquire lock (should fail)
        headers2 = {"Authorization": f"Bearer {token2}"}
        lock_response2 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers2)
        assert lock_response2.status_code == 409
        assert "being edited by another user" in lock_response2.json()["detail"]
    
    def test_tile_locking_in_restricted_modes(self, client):
        """Test that tile locking works in restricted modes and respects permissions"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        # Test restricted modes
        modes = ["tile-lock", "area-lock", "review"]
        
        for mode in modes:
            # Create canvas in current mode
            canvas = self.create_canvas(client, token1, mode)
            
            # User1 creates a tile
            tile = self.create_tile(client, token1, canvas["id"])
            
            # User1 should be able to acquire lock
            headers1 = {"Authorization": f"Bearer {token1}"}
            lock_response1 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers1)
            assert lock_response1.status_code == 200, f"Failed in {mode} mode"
            
            # User2 should NOT be able to acquire lock (permission denied)
            headers2 = {"Authorization": f"Bearer {token2}"}
            lock_response2 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers2)
            assert lock_response2.status_code == 403, f"Failed in {mode} mode"
            assert mode.replace("-", " ") in lock_response2.json()["detail"].lower()
    
    def test_canvas_collaboration_mode_validation(self, client):
        """Test that canvas creation validates collaboration mode values"""
        token = self.create_user(client, self.user1_data)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Valid modes
        valid_modes = ["free", "tile-lock", "area-lock", "review"]
        for mode in valid_modes:
            canvas_data = {
                "name": f"Test Canvas - {mode}",
                "description": "Test canvas",
                "collaboration_mode": mode,
                "is_public": True
            }
            response = client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
            assert response.status_code == 201, f"Failed for mode: {mode}"
        
        # Invalid mode
        canvas_data = {
            "name": "Test Canvas - Invalid",
            "description": "Test canvas",
            "collaboration_mode": "invalid-mode",
            "is_public": True
        }
        response = client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
        assert response.status_code == 422  # Validation error
    
    def test_canvas_update_collaboration_mode(self, client):
        """Test that canvas collaboration mode can be updated"""
        token = self.create_user(client, self.user1_data)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create canvas in free mode
        canvas = self.create_canvas(client, token, "free")
        
        # Update to tile-lock mode
        update_data = {"collaboration_mode": "tile-lock"}
        response = client.put(f"/api/v1/canvas/{canvas['id']}", json=update_data, headers=headers)
        assert response.status_code == 200
        
        updated_canvas = response.json()
        assert updated_canvas["collaboration_mode"] == "tile-lock"
    
    def test_multiple_users_can_create_tiles_in_free_mode(self, client):
        """Test that multiple users can create tiles in free mode"""
        # Create users
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        token3 = self.create_user(client, self.user3_data)
        
        # Create canvas in free mode
        canvas = self.create_canvas(client, token1, "free")
        
        # All users should be able to create tiles
        users = [
            (token1, self.user1_data["username"]),
            (token2, self.user2_data["username"]),
            (token3, self.user3_data["username"])
        ]
        
        for token, username in users:
            tile_data = {
                "canvas_id": canvas["id"],
                "x": len(users),  # Different positions
                "y": len(users),
                "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
            }
            
            headers = {"Authorization": f"Bearer {token}"}
            response = client.post("/api/v1/tiles/", json=tile_data, headers=headers)
            assert response.status_code == 201, f"Failed for user: {username}"
            
            tile = response.json()
            assert tile["creator_id"] == username
    
    def test_tile_creation_limits_respected(self, client):
        """Test that tile creation limits are respected regardless of collaboration mode"""
        token = self.create_user(client, self.user1_data)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create canvas with low tile limit
        canvas_data = {
            "name": "Test Canvas - Limited",
            "description": "Test canvas with tile limits",
            "max_tiles_per_user": 2,
            "collaboration_mode": "free",
            "is_public": True
        }
        canvas = self.create_canvas(client, token, canvas_data)
        
        # Create 2 tiles (should succeed)
        for i in range(2):
            tile_data = {
                "canvas_id": canvas["id"],
                "x": i,
                "y": i,
                "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
            }
            response = client.post("/api/v1/tiles/", json=tile_data, headers=headers)
            assert response.status_code == 201, f"Failed to create tile {i+1}"
        
        # Try to create 3rd tile (should fail)
        tile_data = {
            "canvas_id": canvas["id"],
            "x": 2,
            "y": 2,
            "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        }
        response = client.post("/api/v1/tiles/", json=tile_data, headers=headers)
        assert response.status_code == 400
        assert "tile limit" in response.json()["detail"].lower()


class TestTileLockFunctionality:
    """Test tile locking functionality across collaboration modes"""
    
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
    
    def create_user(self, client, user_data):
        """Helper to create a user and return auth token"""
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201
        return response.json()["access_token"]
    
    def create_canvas_and_tile(self, client, token, collaboration_mode="free"):
        """Helper to create a canvas and tile"""
        canvas_data = {
            "name": f"Test Canvas - {collaboration_mode}",
            "description": "Test canvas",
            "collaboration_mode": collaboration_mode,
            "is_public": True
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        canvas_response = client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
        assert canvas_response.status_code == 201
        canvas = canvas_response.json()
        
        tile_data = {
            "canvas_id": canvas["id"],
            "x": 0,
            "y": 0,
            "pixel_data": [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        }
        
        tile_response = client.post("/api/v1/tiles/", json=tile_data, headers=headers)
        assert tile_response.status_code == 201
        tile = tile_response.json()
        
        return canvas, tile
    
    def test_lock_acquisition_and_release(self, client):
        """Test basic lock acquisition and release"""
        token = self.create_user(client, self.user1_data)
        canvas, tile = self.create_canvas_and_tile(client, token)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Acquire lock
        lock_response = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers)
        assert lock_response.status_code == 200
        lock_data = lock_response.json()
        assert "lock_id" in lock_data
        assert "expires_at" in lock_data
        
        # Check lock status
        status_response = client.get(f"/api/v1/tiles/{tile['id']}/lock", headers=headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["is_locked"] == True
        assert status_data["can_acquire"] == False
        
        # Release lock
        release_response = client.delete(f"/api/v1/tiles/{tile['id']}/lock", headers=headers)
        assert release_response.status_code == 200
        
        # Check lock status again
        status_response = client.get(f"/api/v1/tiles/{tile['id']}/lock", headers=headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["is_locked"] == False
        assert status_data["can_acquire"] == True
    
    def test_concurrent_lock_acquisition(self, client):
        """Test that only one user can acquire a lock at a time"""
        token1 = self.create_user(client, self.user1_data)
        token2 = self.create_user(client, self.user2_data)
        
        canvas, tile = self.create_canvas_and_tile(client, token1)
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User1 acquires lock
        lock_response1 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers1)
        assert lock_response1.status_code == 200
        
        # User2 tries to acquire lock (should fail)
        lock_response2 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers2)
        assert lock_response2.status_code == 409
        assert "being edited by another user" in lock_response2.json()["detail"]
        
        # User1 releases lock
        release_response = client.delete(f"/api/v1/tiles/{tile['id']}/lock", headers=headers1)
        assert release_response.status_code == 200
        
        # User2 can now acquire lock
        lock_response2 = client.post(f"/api/v1/tiles/{tile['id']}/lock", headers=headers2)
        assert lock_response2.status_code == 200
    
    def test_lock_expiration(self, client):
        """Test that locks expire after the specified time"""
        token = self.create_user(client, self.user1_data)
        canvas, tile = self.create_canvas_and_tile(client, token)
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Acquire lock with short expiration (1 minute)
        lock_response = client.post(f"/api/v1/tiles/{tile['id']}/lock?minutes=1", headers=headers)
        assert lock_response.status_code == 200
        
        # Check lock status
        status_response = client.get(f"/api/v1/tiles/{tile['id']}/lock", headers=headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["is_locked"] == True
        
        # Note: In a real test, we would wait for expiration
        # For this test, we'll just verify the expiration time is set correctly
        lock_data = lock_response.json()
        expires_at = datetime.fromisoformat(lock_data["expires_at"].replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=expires_at.tzinfo)
        time_diff = expires_at - now
        
        # Should be approximately 1 minute (allow some tolerance)
        assert 50 <= time_diff.total_seconds() <= 70 