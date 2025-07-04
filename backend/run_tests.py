#!/usr/bin/env python3
"""
Simple test runner for StellarCollabApp backend
Tests basic functionality without requiring pytest
"""

import sys
import asyncio
import tempfile
import os
from datetime import datetime
import random
import string

# Add app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from fastapi.testclient import TestClient
from app.core.database import get_db
from app.models.user import User
from app.models.canvas import Canvas
from app.models.tile import Tile
from app.models.like import Like


class TestRunner:
    def __init__(self):
        self.client = TestClient(app)
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []
        self.test_counter = 0
    
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def generate_unique_username(self):
        """Generate a unique username for testing"""
        self.test_counter += 1
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        return f"test_{self.test_counter}_{random_suffix}"
    
    def cleanup_database(self):
        """Clean up test data from database"""
        try:
            # Get database session
            db = next(get_db())
            
            # Delete in reverse order of foreign key dependencies
            db.query(Like).delete()
            db.query(Tile).delete()
            db.query(Canvas).delete()
            db.query(User).delete()
            
            db.commit()
            db.close()
            
            self.log("Database cleaned up", "DEBUG")
        except Exception as e:
            self.log(f"Warning: Could not clean database: {e}", "WARNING")
    
    def assert_equal(self, actual, expected, message=""):
        if actual == expected:
            self.tests_passed += 1
            self.log(f"✅ PASS: {message if message else f'{actual} == {expected}'}")
            return True
        else:
            self.tests_failed += 1
            self.log(f"❌ FAIL: {message if message else f'{actual} != {expected}'}", "ERROR")
            return False
    
    def assert_true(self, condition, message=""):
        return self.assert_equal(condition, True, message)
    
    def assert_in(self, item, container, message=""):
        if item in container:
            self.tests_passed += 1
            self.log(f"✅ PASS: {message if message else f'{item} in {container}'}")
            return True
        else:
            self.tests_failed += 1
            self.log(f"❌ FAIL: {message if message else f'{item} not in {container}'}", "ERROR")
            return False
    
    def run_test(self, test_func):
        """Run a single test function"""
        test_name = test_func.__name__
        self.log(f"Running {test_name}...")
        
        try:
            # Clean database before each test
            self.cleanup_database()
            
            test_func()
            self.log(f"✅ {test_name} completed")
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ {test_name} failed: {str(e)}", "ERROR")
    
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = self.client.get("/health")
        self.assert_equal(response.status_code, 200, "Health endpoint should return 200")
        
        data = response.json()
        self.assert_equal(data["status"], "healthy", "Health endpoint should return healthy status")
    
    def test_user_registration(self):
        """Test user registration"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123",
            "display_name": "Test User"
        }
        
        response = self.client.post("/api/v1/auth/register", json=user_data)
        self.assert_equal(response.status_code, 201, "Registration should return 201")
        
        data = response.json()
        self.assert_in("access_token", data, "Registration should return access token")
        self.assert_in("user", data, "Registration should return user data")
        self.assert_equal(data["user"]["username"], "testuser", "Username should match")
    
    def test_user_login(self):
        """Test user login"""
        # First register a user
        user_data = {
            "username": "logintest",
            "email": "logintest@example.com",
            "password": "testpassword123"
        }
        
        register_response = self.client.post("/api/v1/auth/register", json=user_data)
        self.assert_equal(register_response.status_code, 201, "Registration should succeed")
        
        # Then login
        login_data = {
            "username": "logintest",
            "password": "testpassword123"
        }
        
        login_response = self.client.post("/api/v1/auth/login", json=login_data)
        self.assert_equal(login_response.status_code, 200, "Login should return 200")
        
        login_result = login_response.json()
        self.assert_in("access_token", login_result, "Login should return access token")
    
    def test_authenticated_endpoint(self):
        """Test an authenticated endpoint"""
        # Register and login to get token
        user_data = {
            "username": "authtest",
            "email": "authtest@example.com",
            "password": "testpassword123"
        }
        
        register_response = self.client.post("/api/v1/auth/register", json=user_data)
        token = register_response.json()["access_token"]
        
        # Test authenticated endpoint
        response = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        self.assert_equal(response.status_code, 200, "Authenticated endpoint should return 200")
        
        data = response.json()
        self.assert_equal(data["username"], "authtest", "Should return correct user data")
    
    def test_canvas_endpoints(self):
        """Test canvas-related endpoints"""
        # Register and login to get token
        user_data = {
            "username": "canvastest",
            "email": "canvastest@example.com",
            "password": "testpassword123"
        }
        
        register_response = self.client.post("/api/v1/auth/register", json=user_data)
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test getting canvas list
        response = self.client.get("/api/v1/canvas/", headers=headers)
        self.assert_equal(response.status_code, 200, "Canvas list should return 200")
        
        # Test creating a canvas
        canvas_data = {
            "name": "Test Canvas",
            "description": "A test canvas",
            "width": 1024,
            "height": 1024,
            "max_tiles_per_user": 10
        }
        
        create_response = self.client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
        self.assert_equal(create_response.status_code, 201, "Canvas creation should return 201")
        
        canvas_result = create_response.json()
        self.assert_in("canvas", canvas_result, "Canvas creation should return canvas data")
        canvas_id = canvas_result["canvas"]["id"]
        
        # Test getting specific canvas
        get_response = self.client.get(f"/api/v1/canvas/{canvas_id}", headers=headers)
        self.assert_equal(get_response.status_code, 200, "Getting canvas should return 200")
    
    def test_tile_endpoints(self):
        """Test tile-related endpoints"""
        import json
        
        # Register and login to get token
        user_data = {
            "username": "tiletest",
            "email": "tiletest@example.com",
            "password": "testpassword123"
        }
        
        register_response = self.client.post("/api/v1/auth/register", json=user_data)
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a canvas first
        canvas_data = {
            "name": "Tile Test Canvas",
            "description": "A canvas for testing tiles",
            "width": 1024,
            "height": 1024,
            "max_tiles_per_user": 10
        }
        
        canvas_response = self.client.post("/api/v1/canvas/", json=canvas_data, headers=headers)
        canvas_id = canvas_response.json()["canvas"]["id"]
        
        # Create sample pixel data (32x32 grid)
        pixel_data = [["transparent" for _ in range(32)] for _ in range(32)]
        # Add some colored pixels
        pixel_data[0][0] = "#ff0000"
        pixel_data[1][1] = "#00ff00"
        pixel_data[2][2] = "#0000ff"
        
        # Test creating a tile
        tile_data = {
            "canvas_id": canvas_id,
            "x": 0,
            "y": 0,
            "pixel_data": json.dumps(pixel_data),  # Convert to JSON string
            "title": "Test Tile",
            "description": "A test tile"
        }
        
        create_response = self.client.post("/api/v1/tiles/", json=tile_data, headers=headers)
        self.assert_equal(create_response.status_code, 201, "Tile creation should return 201")
        
        tile_result = create_response.json()
        self.assert_in("tile", tile_result, "Tile creation should return tile data")
        tile_id = tile_result["tile"]["id"]
        
        # Test getting tile
        get_response = self.client.get(f"/api/v1/tiles/{tile_id}", headers=headers)
        self.assert_equal(get_response.status_code, 200, "Getting tile should return 200")
    
    def test_websocket_stats(self):
        """Test WebSocket stats endpoint"""
        # Register and login to get token
        user_data = {
            "username": "wstest",
            "email": "wstest@example.com",
            "password": "testpassword123"
        }
        
        register_response = self.client.post("/api/v1/auth/register", json=user_data)
        token = register_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test WebSocket stats
        response = self.client.get("/api/v1/ws/stats", headers=headers)
        self.assert_equal(response.status_code, 200, "WebSocket stats should return 200")
        
        data = response.json()
        self.assert_in("total_connections", data, "Stats should include total connections")
    
    def test_error_handling(self):
        """Test error handling"""
        # Test 404 endpoint
        response = self.client.get("/nonexistent-endpoint")
        self.assert_equal(response.status_code, 404, "Nonexistent endpoint should return 404")
        
        # Test unauthorized access
        response = self.client.get("/api/v1/auth/me")
        self.assert_equal(response.status_code, 403, "Unauthorized access should return 403")
        
        # Test invalid JSON
        response = self.client.post("/api/v1/auth/login", data="invalid json")
        self.assert_equal(response.status_code, 422, "Invalid JSON should return 422")
    
    def run_all_tests(self):
        """Run all tests"""
        self.log("🚀 Starting StellarCollabApp Backend Tests")
        self.log("=" * 50)
        
        # List of test methods to run
        test_methods = [
            self.test_health_endpoint,
            self.test_user_registration,
            self.test_user_login,
            self.test_authenticated_endpoint,
            self.test_canvas_endpoints,
            self.test_tile_endpoints,
            self.test_websocket_stats,
            self.test_error_handling
        ]
        
        # Run each test
        for test_method in test_methods:
            self.run_test(test_method)
            self.log("-" * 30)
        
        # Print summary
        total_tests = self.tests_passed + self.tests_failed
        self.log("=" * 50)
        self.log(f"🏁 Test Summary:")
        self.log(f"   Total tests: {total_tests}")
        self.log(f"   ✅ Passed: {self.tests_passed}")
        self.log(f"   ❌ Failed: {self.tests_failed}")
        
        if self.tests_failed == 0:
            self.log("🎉 All tests passed!")
            return True
        else:
            self.log(f"💥 {self.tests_failed} tests failed")
            return False


def main():
    """Main test execution"""
    runner = TestRunner()
    success = runner.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 