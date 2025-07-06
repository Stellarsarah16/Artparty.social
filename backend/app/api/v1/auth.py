"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError
import logging

from ...core.database import get_db
from ...schemas.user import UserCreate, UserLogin, UserResponse
from ...services.authentication import authentication_service
from ...models.user import User

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        logger.info(f"Registration attempt for username: {user_create.username}")
        
        # Use the new authentication service
        token_response = authentication_service.register_user(db, user_create)
        
        logger.info(f"User registered successfully: {user_create.username}")
        return token_response
        
    except HTTPException as e:
        logger.warning(f"Registration failed for {user_create.username}: {e.detail}")
        raise e
    except ValidationError as e:
        logger.error(f"Validation error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Validation error: " + str(e)
        )
    except IntegrityError as e:
        logger.error(f"Database integrity error during registration: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )


@router.post("/login", response_model=dict)
async def login(
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    try:
        logger.info(f"Login attempt for username: {user_login.username}")
        
        # Use the new authentication service
        token_response = authentication_service.login_user(
            db, user_login.username, user_login.password
        )
        
        logger.info(f"User logged in successfully: {user_login.username}")
        return token_response
        
    except HTTPException as e:
        logger.warning(f"Login failed for {user_login.username}: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    return authentication_service.get_current_user(db, token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        total_points=current_user.total_points,
        tiles_created=current_user.tiles_created,
        likes_received=current_user.likes_received,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}


@router.get("/health")
async def auth_health():
    """Health check for authentication service"""
    return {"status": "healthy", "service": "authentication"} 