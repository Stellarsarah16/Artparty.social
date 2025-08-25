"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from pydantic import ValidationError, BaseModel
import logging

from ...core.database import get_db
from ...schemas.user import UserCreate, UserLogin, UserResponse
from ...services.auth import auth_service
from ...services.verification import verification_service
from ...models.user import User

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


# Pydantic models for email verification and password reset
class EmailVerificationRequest(BaseModel):
    email: str

class EmailVerificationConfirm(BaseModel):
    token: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.options("/register")
async def register_options():
    """Handle CORS preflight requests for registration"""
    return {"message": "OK"}


@router.options("/login")
async def login_options():
    """Handle CORS preflight requests for login"""
    return {"message": "OK"}


@router.options("/me")
async def me_options():
    """Handle CORS preflight requests for user info"""
    return {"message": "OK"}


@router.options("/verify-email")
async def verify_email_options():
    """Handle CORS preflight requests for email verification"""
    return {"message": "OK"}


@router.options("/confirm-email")
async def confirm_email_options():
    """Handle CORS preflight requests for email confirmation"""
    return {"message": "OK"}


@router.options("/reset-password")
async def reset_password_options():
    """Handle CORS preflight requests for password reset"""
    return {"message": "OK"}


@router.options("/confirm-password-reset")
async def confirm_password_reset_options():
    """Handle CORS preflight requests for password reset confirmation"""
    return {"message": "OK"}


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    try:
        logger.info(f"Registration attempt for username: {user_create.username}")
        
        # Use the async auth service
        user = await auth_service.create_user(db, user_create)
        token_response = auth_service.create_token_response(user)
        
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
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to server error"
        )


@router.post("/login", response_model=dict)
async def login(
    user_login: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token"""
    try:
        logger.info(f"Login attempt for username: {user_login.username}")
        
        # Use the async auth service
        user = await auth_service.authenticate_user(db, user_login.username, user_login.password)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        token_response = auth_service.create_token_response(user)
        
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


@router.post("/verify-email", response_model=dict)
async def send_verification_email(
    request: EmailVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send email verification to user"""
    try:
        logger.info(f"Email verification request for: {request.email}")
        
        # Find user by email - use async syntax
        from sqlalchemy import select
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if email exists or not for security
            logger.info(f"Email verification requested for non-existent email: {request.email}")
            return {
                "message": "If the email exists, a verification link has been sent",
                "success": True
            }
        
        if user.is_verified:
            logger.info(f"Email already verified for user: {user.username}")
            return {
                "message": "Email is already verified",
                "success": True
            }
        
        # For local development, skip actual email sending
        # In production, this would send a real email
        try:
            success = await verification_service.send_verification_email(db, user)
            if success:
                logger.info(f"Verification email sent to user: {user.username}")
                return {
                    "message": "Verification email sent successfully",
                    "success": True
                }
        except Exception as e:
            logger.warning(f"Email sending failed (development mode): {e}")
            # In development, we'll still return success since we have the token
            # The user can use the token we generated manually
        
        # Return success even if email fails (for development)
        logger.info(f"Verification email would be sent to user: {user.username} (development mode)")
        return {
            "message": "If the email exists, a verification link has been sent",
            "success": True
        }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during email verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed due to server error"
        )


@router.post("/confirm-email", response_model=dict)
async def confirm_email_verification(
    request: EmailVerificationConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm email verification with token"""
    try:
        logger.info("Email verification confirmation attempt")
        
        # Verify the token
        user = await verification_service.verify_token(db, request.token, "email_verification")
        
        if not user:
            logger.warning("Invalid email verification token")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        # Mark user as verified
        user.is_verified = True
        await db.commit()
        
        logger.info(f"Email verified successfully for user: {user.username}")
        return {
            "message": "Email verified successfully",
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_verified": user.is_verified
            }
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during email confirmation: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email confirmation failed due to server error"
        )


@router.post("/reset-password", response_model=dict)
async def send_password_reset_email(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send password reset email to user"""
    try:
        logger.info(f"Password reset request for: {request.email}")
        
        # Find user by email - use async syntax
        from sqlalchemy import select
        stmt = select(User).where(User.email == request.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if email exists or not for security
            logger.info(f"Password reset requested for non-existent email: {request.email}")
            return {
                "message": "If the email exists, a password reset link has been sent",
                "success": True
            }
        
        # For local development, skip actual email sending
        # In production, this would send a real email
        try:
            success = await verification_service.send_password_reset_email(db, request.email)
            if success:
                logger.info(f"Password reset email sent to user: {user.username}")
                return {
                    "message": "Password reset email sent successfully",
                    "success": True
                }
        except Exception as e:
            logger.warning(f"Email sending failed (development mode): {e}")
            # In development, we'll still return success since we have the token
            # The user can use the token we generated manually
        
        # Return success even if email fails (for development)
        logger.info(f"Password reset email would be sent to user: {user.username} (development mode)")
        return {
            "message": "If the email exists, a password reset link has been sent",
            "success": True
        }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during password reset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed due to server error"
        )


@router.post("/confirm-password-reset", response_model=dict)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset with token"""
    try:
        logger.info("Password reset confirmation attempt")
        
        # Reset password using token
        success = await verification_service.reset_password(db, request.token, request.new_password)
        
        if not success:
            logger.warning("Invalid password reset token")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        logger.info("Password reset successfully")
        return {
            "message": "Password reset successfully",
            "success": True
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error during password reset confirmation: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset confirmation failed due to server error"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    try:
        user = await auth_service.get_current_user(db, credentials.credentials)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        return user
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    try:
        return UserResponse.from_orm(current_user)
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}


@router.get("/health")
async def auth_health():
    """Health check for auth service"""
    return {"status": "healthy", "service": "auth"} 