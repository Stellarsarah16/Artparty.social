"""
Test Authentication Endpoints
"""
import pytest
import httpx
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile

from app.main import app
from app.core.database import Base, get_db
# Import models to ensure they are registered with Base
from app.models import User, Canvas, Tile, Like, VerificationToken, TileLock

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"


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


class TestUserRegistration:
    """Test user registration functionality"""
    
    def test_register_new_user(self, client):
        """Test successful user registration"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }

        response = client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == "testuser"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["first_name"] == "Test"
        assert data["user"]["last_name"] == "User"
        assert "password" not in data["user"]
    
    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username"""
        user_data = {
            "username": "testuser",
            "email": "test1@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        # Create first user
        response1 = client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Try to create second user with same username
        user_data["email"] = "test2@example.com"
        response2 = client.post("/api/v1/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "username already exists" in response2.json()["detail"].lower()
    
    def test_register_duplicate_email(self, client):
        """Test registration with duplicate email"""
        user_data = {
            "username": "testuser1",
            "email": "test@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        # Create first user
        response1 = client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Try to create second user with same email
        user_data["username"] = "testuser2"
        response2 = client.post("/api/v1/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "email already exists" in response2.json()["detail"].lower()
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        user_data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_register_short_password(self, client):
        """Test registration with short password"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "123",
            "first_name": "Test",
            "last_name": "User"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        user_data = {
            "username": "testuser"
            # Missing email and password
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422


class TestUserLogin:
    """Test user login functionality"""
    
    def setup_method(self):
        """Setup test user for login tests"""
        self.test_user = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }
    
    def test_login_success(self, client):
        """Test successful login"""
        # Register user
        client.post("/api/v1/auth/register", json=self.test_user)
        
        # Login
        login_data = {
            "username": self.test_user["username"],
            "password": self.test_user["password"]
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == self.test_user["username"]
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password"""
        # Register user
        client.post("/api/v1/auth/register", json=self.test_user)
        
        # Login with wrong password
        login_data = {
            "username": self.test_user["username"],
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 400
        assert "invalid credentials" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent username"""
        login_data = {
            "username": "nonexistent",
            "password": "testpassword123"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 400
        assert "invalid credentials" in response.json()["detail"].lower()
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        login_data = {
            "username": "testuser"
            # Missing password
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 422


class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
    def setup_method(self):
        """Setup test user and get auth token"""
        self.test_user = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        }
    
    def get_auth_token(self, client):
        """Register user and get auth token"""
        # Register user
        register_response = client.post("/api/v1/auth/register", json=self.test_user)
        assert register_response.status_code == 201
        return register_response.json()["access_token"]
    
    def test_get_current_user(self, client):
        """Test getting current user info"""
        token = self.get_auth_token(client)
        
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == self.test_user["username"]
        assert data["email"] == self.test_user["email"]
        assert "password" not in data
    
    def test_get_current_user_without_token(self, client):
        """Test getting current user without auth token"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
    
    def test_refresh_token(self, client):
        """Test token refresh"""
        token = self.get_auth_token(client)
        
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["access_token"] != token  # Should be a new token
    
    def test_logout(self, client):
        """Test user logout"""
        token = self.get_auth_token(client)
        
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"


class TestUserProfile:
    """Test user profile management"""
    
    def setup_method(self):
        """Setup test user"""
        self.test_user = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        }
    
    def get_auth_token(self, client):
        """Register user and get auth token"""
        register_response = client.post("/api/v1/auth/register", json=self.test_user)
        return register_response.json()["access_token"]
    
    def test_get_user_profile(self, client):
        """Test getting user profile"""
        token = self.get_auth_token(client)
        
        response = client.get(
            "/api/v1/users/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == self.test_user["username"]
        assert data["email"] == self.test_user["email"]
        assert data["first_name"] == self.test_user["first_name"]
        assert data["last_name"] == self.test_user["last_name"]
    
    def test_update_user_profile(self, client):
        """Test updating user profile"""
        token = self.get_auth_token(client)
        
        update_data = {
            "first_name": "Updated",
            "last_name": "Display Name"
        }
        
        response = client.put(
            "/api/v1/users/profile",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == update_data["first_name"]
        assert data["last_name"] == update_data["last_name"]
    
    def test_update_password(self, client):
        """Test password update"""
        token = self.get_auth_token(client)
        
        password_data = {
            "current_password": self.test_user["password"],
            "new_password": "newpassword123"
        }
        
        response = client.put(
            "/api/v1/users/password",
            json=password_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Password updated successfully"
        
        # Test login with new password
        login_data = {
            "username": self.test_user["username"],
            "password": password_data["new_password"]
        }
        
        login_response = client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
    
    def test_update_password_wrong_current(self, client):
        """Test password update with wrong current password"""
        token = self.get_auth_token(client)
        
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        response = client.put(
            "/api/v1/users/password",
            json=password_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        assert "current password is incorrect" in response.json()["detail"].lower()
    
    def test_get_user_stats(self, client):
        """Test getting user statistics"""
        token = self.get_auth_token(client)
        
        response = client.get(
            "/api/v1/users/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "tiles_created" in data
        assert "likes_received" in data
        assert "canvases_created" in data
        assert data["tiles_created"] == 0  # New user should have 0 tiles


class TestJWTSecurity:
    """Test JWT token security"""
    
    def test_jwt_token_structure(self, client):
        """Test JWT token structure"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        token = response.json()["access_token"]
        
        # JWT should have 3 parts separated by dots
        parts = token.split('.')
        assert len(parts) == 3
        
        # Each part should be base64 encoded
        import base64
        for part in parts:
            try:
                # Add padding if needed
                padded = part + '=' * (4 - len(part) % 4)
                base64.b64decode(padded)
            except Exception:
                pytest.fail(f"JWT part {part} is not valid base64")
    
    def test_token_expiration(self, client):
        """Test token expiration (if implemented)"""
        # This would require mocking time or setting very short expiration
        # For now, we'll just test that tokens work when valid
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        register_response = client.post("/api/v1/auth/register", json=user_data)
        token = register_response.json()["access_token"]
        
        # Token should work immediately
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 