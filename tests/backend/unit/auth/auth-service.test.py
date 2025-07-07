"""
Unit Tests for Backend Authentication Service
Testing JWT token handling, password hashing, and user management
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from backend.app.services.auth import AuthService
from backend.app.models.user import User
from backend.app.schemas.auth import UserCreate, UserLogin
from backend.app.core.config import settings


class TestAuthService:
    """Test suite for AuthService"""
    
    @pytest.fixture
    def auth_service(self):
        """Create AuthService instance with mocked dependencies"""
        return AuthService()
    
    @pytest.fixture
    def mock_user_repo(self):
        """Mock user repository"""
        return Mock()
    
    @pytest.fixture
    def mock_user(self):
        """Mock user instance"""
        return User(
            id=1,
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password_123",
            is_active=True,
            created_at=datetime.utcnow()
        )
    
    @pytest.fixture
    def user_create_data(self):
        """User creation data"""
        return UserCreate(
            username="newuser",
            email="newuser@example.com",
            password="password123"
        )
    
    @pytest.fixture
    def user_login_data(self):
        """User login data"""
        return UserLogin(
            username="testuser",
            password="password123"
        )

    def test_hash_password(self, auth_service):
        """Test password hashing"""
        password = "testpassword"
        hashed = auth_service.hash_password(password)
        
        assert hashed != password
        assert auth_service.verify_password(password, hashed)
    
    def test_verify_password_success(self, auth_service):
        """Test successful password verification"""
        password = "testpassword"
        hashed = auth_service.hash_password(password)
        
        assert auth_service.verify_password(password, hashed) is True
    
    def test_verify_password_failure(self, auth_service):
        """Test failed password verification"""
        password = "testpassword"
        wrong_password = "wrongpassword"
        hashed = auth_service.hash_password(password)
        
        assert auth_service.verify_password(wrong_password, hashed) is False
    
    def test_create_access_token(self, auth_service):
        """Test JWT access token creation"""
        user_data = {"user_id": 1, "username": "testuser"}
        
        token = auth_service.create_access_token(user_data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify contents
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert decoded["user_id"] == 1
        assert decoded["username"] == "testuser"
        assert "exp" in decoded
        assert "iat" in decoded
    
    def test_create_access_token_with_custom_expiry(self, auth_service):
        """Test JWT token creation with custom expiry"""
        user_data = {"user_id": 1, "username": "testuser"}
        expires_delta = timedelta(minutes=30)
        
        token = auth_service.create_access_token(user_data, expires_delta)
        
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Check that expiry is approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_exp = datetime.utcnow() + expires_delta
        assert abs((exp_time - expected_exp).total_seconds()) < 60  # Within 1 minute
    
    def test_verify_token_valid(self, auth_service):
        """Test verification of valid token"""
        user_data = {"user_id": 1, "username": "testuser"}
        token = auth_service.create_access_token(user_data)
        
        payload = auth_service.verify_token(token)
        
        assert payload is not None
        assert payload["user_id"] == 1
        assert payload["username"] == "testuser"
    
    def test_verify_token_invalid(self, auth_service):
        """Test verification of invalid token"""
        invalid_token = "invalid.token.here"
        
        payload = auth_service.verify_token(invalid_token)
        
        assert payload is None
    
    def test_verify_token_expired(self, auth_service):
        """Test verification of expired token"""
        user_data = {"user_id": 1, "username": "testuser"}
        # Create token that expires immediately
        expires_delta = timedelta(seconds=-1)
        token = auth_service.create_access_token(user_data, expires_delta)
        
        payload = auth_service.verify_token(token)
        
        assert payload is None
    
    @patch('backend.app.services.auth.AuthService.hash_password')
    def test_create_user_success(self, mock_hash_password, auth_service, mock_user_repo, user_create_data):
        """Test successful user creation"""
        mock_hash_password.return_value = "hashed_password_123"
        mock_user_repo.create_user.return_value = User(
            id=1,
            username="newuser",
            email="newuser@example.com",
            hashed_password="hashed_password_123",
            is_active=True
        )
        
        auth_service.user_repository = mock_user_repo
        
        user = auth_service.create_user(user_create_data)
        
        assert user.username == "newuser"
        assert user.email == "newuser@example.com"
        assert user.is_active is True
        mock_hash_password.assert_called_once_with("password123")
        mock_user_repo.create_user.assert_called_once()
    
    def test_authenticate_user_success(self, auth_service, mock_user_repo, mock_user, user_login_data):
        """Test successful user authentication"""
        mock_user_repo.get_user_by_username.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        with patch.object(auth_service, 'verify_password', return_value=True):
            user = auth_service.authenticate_user(user_login_data)
        
        assert user is not None
        assert user.username == "testuser"
        mock_user_repo.get_user_by_username.assert_called_once_with("testuser")
    
    def test_authenticate_user_invalid_username(self, auth_service, mock_user_repo, user_login_data):
        """Test authentication with invalid username"""
        mock_user_repo.get_user_by_username.return_value = None
        auth_service.user_repository = mock_user_repo
        
        user = auth_service.authenticate_user(user_login_data)
        
        assert user is None
        mock_user_repo.get_user_by_username.assert_called_once_with("testuser")
    
    def test_authenticate_user_invalid_password(self, auth_service, mock_user_repo, mock_user, user_login_data):
        """Test authentication with invalid password"""
        mock_user_repo.get_user_by_username.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        with patch.object(auth_service, 'verify_password', return_value=False):
            user = auth_service.authenticate_user(user_login_data)
        
        assert user is None
    
    def test_authenticate_user_inactive_user(self, auth_service, mock_user_repo, user_login_data):
        """Test authentication with inactive user"""
        inactive_user = User(
            id=1,
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password_123",
            is_active=False
        )
        mock_user_repo.get_user_by_username.return_value = inactive_user
        auth_service.user_repository = mock_user_repo
        
        with patch.object(auth_service, 'verify_password', return_value=True):
            user = auth_service.authenticate_user(user_login_data)
        
        assert user is None
    
    def test_get_current_user_success(self, auth_service, mock_user_repo, mock_user):
        """Test getting current user from valid token"""
        user_data = {"user_id": 1, "username": "testuser"}
        token = auth_service.create_access_token(user_data)
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        user = auth_service.get_current_user(token)
        
        assert user is not None
        assert user.username == "testuser"
        mock_user_repo.get_user_by_id.assert_called_once_with(1)
    
    def test_get_current_user_invalid_token(self, auth_service, mock_user_repo):
        """Test getting current user with invalid token"""
        invalid_token = "invalid.token.here"
        auth_service.user_repository = mock_user_repo
        
        user = auth_service.get_current_user(invalid_token)
        
        assert user is None
        mock_user_repo.get_user_by_id.assert_not_called()
    
    def test_get_current_user_user_not_found(self, auth_service, mock_user_repo):
        """Test getting current user when user doesn't exist"""
        user_data = {"user_id": 999, "username": "nonexistent"}
        token = auth_service.create_access_token(user_data)
        
        mock_user_repo.get_user_by_id.return_value = None
        auth_service.user_repository = mock_user_repo
        
        user = auth_service.get_current_user(token)
        
        assert user is None
        mock_user_repo.get_user_by_id.assert_called_once_with(999)
    
    def test_refresh_token_success(self, auth_service, mock_user_repo, mock_user):
        """Test successful token refresh"""
        user_data = {"user_id": 1, "username": "testuser"}
        old_token = auth_service.create_access_token(user_data)
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        new_token = auth_service.refresh_token(old_token)
        
        assert new_token is not None
        assert new_token != old_token
        
        # Verify new token is valid
        payload = auth_service.verify_token(new_token)
        assert payload["user_id"] == 1
        assert payload["username"] == "testuser"
    
    def test_refresh_token_invalid_token(self, auth_service):
        """Test token refresh with invalid token"""
        invalid_token = "invalid.token.here"
        
        new_token = auth_service.refresh_token(invalid_token)
        
        assert new_token is None
    
    def test_change_password_success(self, auth_service, mock_user_repo, mock_user):
        """Test successful password change"""
        old_password = "oldpassword"
        new_password = "newpassword"
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        with patch.object(auth_service, 'verify_password', return_value=True):
            with patch.object(auth_service, 'hash_password', return_value="new_hashed_password"):
                result = auth_service.change_password(1, old_password, new_password)
        
        assert result is True
        mock_user_repo.update_user_password.assert_called_once_with(1, "new_hashed_password")
    
    def test_change_password_invalid_old_password(self, auth_service, mock_user_repo, mock_user):
        """Test password change with invalid old password"""
        old_password = "wrongpassword"
        new_password = "newpassword"
        
        mock_user_repo.get_user_by_id.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        with patch.object(auth_service, 'verify_password', return_value=False):
            result = auth_service.change_password(1, old_password, new_password)
        
        assert result is False
        mock_user_repo.update_user_password.assert_not_called()
    
    def test_change_password_user_not_found(self, auth_service, mock_user_repo):
        """Test password change for non-existent user"""
        mock_user_repo.get_user_by_id.return_value = None
        auth_service.user_repository = mock_user_repo
        
        result = auth_service.change_password(999, "oldpass", "newpass")
        
        assert result is False
        mock_user_repo.update_user_password.assert_not_called()
    
    def test_deactivate_user_success(self, auth_service, mock_user_repo, mock_user):
        """Test successful user deactivation"""
        mock_user_repo.get_user_by_id.return_value = mock_user
        auth_service.user_repository = mock_user_repo
        
        result = auth_service.deactivate_user(1)
        
        assert result is True
        mock_user_repo.update_user_status.assert_called_once_with(1, False)
    
    def test_deactivate_user_not_found(self, auth_service, mock_user_repo):
        """Test deactivation of non-existent user"""
        mock_user_repo.get_user_by_id.return_value = None
        auth_service.user_repository = mock_user_repo
        
        result = auth_service.deactivate_user(999)
        
        assert result is False
        mock_user_repo.update_user_status.assert_not_called()
    
    def test_validate_password_strength(self, auth_service):
        """Test password strength validation"""
        # Strong password
        assert auth_service.validate_password_strength("StrongPass123!") is True
        
        # Weak passwords
        assert auth_service.validate_password_strength("weak") is False
        assert auth_service.validate_password_strength("12345678") is False
        assert auth_service.validate_password_strength("password") is False
        assert auth_service.validate_password_strength("PASSWORD") is False
    
    def test_validate_email_format(self, auth_service):
        """Test email format validation"""
        # Valid emails
        assert auth_service.validate_email_format("test@example.com") is True
        assert auth_service.validate_email_format("user.name@domain.co.uk") is True
        
        # Invalid emails
        assert auth_service.validate_email_format("invalid-email") is False
        assert auth_service.validate_email_format("@domain.com") is False
        assert auth_service.validate_email_format("user@") is False
        assert auth_service.validate_email_format("user@domain") is False
    
    def test_check_username_availability(self, auth_service, mock_user_repo):
        """Test username availability check"""
        # Available username
        mock_user_repo.get_user_by_username.return_value = None
        auth_service.user_repository = mock_user_repo
        
        assert auth_service.check_username_availability("newuser") is True
        
        # Unavailable username
        mock_user_repo.get_user_by_username.return_value = Mock()
        
        assert auth_service.check_username_availability("existinguser") is False
    
    def test_check_email_availability(self, auth_service, mock_user_repo):
        """Test email availability check"""
        # Available email
        mock_user_repo.get_user_by_email.return_value = None
        auth_service.user_repository = mock_user_repo
        
        assert auth_service.check_email_availability("new@example.com") is True
        
        # Unavailable email
        mock_user_repo.get_user_by_email.return_value = Mock()
        
        assert auth_service.check_email_availability("existing@example.com") is False 