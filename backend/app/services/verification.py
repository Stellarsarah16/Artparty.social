"""
Verification service for email verification and password reset
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from ..models.verification import VerificationToken
from ..models.user import User
from ..core.config import settings
from .email import email_service
from .password import password_service

logger = logging.getLogger(__name__)

class VerificationService:
    """Service for handling email verification and password reset tokens"""
    
    def generate_token(self) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    async def create_verification_token(
        self, 
        db: AsyncSession, 
        user_id: int, 
        token_type: str,
        expires_in_minutes: Optional[int] = None
    ) -> VerificationToken:
        """Create a verification token for a user"""
        # Invalidate any existing tokens of the same type for this user
        stmt = select(VerificationToken).where(
            VerificationToken.user_id == user_id,
            VerificationToken.token_type == token_type,
            VerificationToken.is_used == False
        )
        result = await db.execute(stmt)
        existing_tokens = result.scalars().all()
        
        for token in existing_tokens:
            token.is_used = True
        
        # Set expiration time
        if expires_in_minutes is None:
            if token_type == "email_verification":
                expires_in_minutes = settings.VERIFICATION_TOKEN_EXPIRE_MINUTES
            else:
                expires_in_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        # Create new token
        token = VerificationToken(
            token=self.generate_token(),
            user_id=user_id,
            token_type=token_type,
            expires_at=expires_at
        )
        
        db.add(token)
        await db.commit()
        await db.refresh(token)
        
        return token
    
    async def verify_token(self, db: AsyncSession, token: str, token_type: str) -> Optional[User]:
        """Verify a token and return the associated user - ASYNC VERSION"""
        stmt = select(VerificationToken).where(
            VerificationToken.token == token,
            VerificationToken.token_type == token_type
        )
        result = await db.execute(stmt)
        verification_token = result.scalar_one_or_none()
        
        if not verification_token:
            return None
        
        if not verification_token.is_valid():
            return None
        
        # Mark token as used
        verification_token.is_used = True
        await db.commit()
        
        # Return the user
        stmt = select(User).where(User.id == verification_token.user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def reset_password(self, db: AsyncSession, token: str, new_password: str) -> bool:
        """Reset user password using a valid token - ASYNC VERSION"""
        try:
            # Verify the token
            user = await self.verify_token(db, token, "password_reset")
            
            if not user:
                logger.warning(f"Invalid password reset token: {token}")
                return False
            
            # Hash the new password
            hashed_password = password_service.hash_password(new_password)
            
            # Update user's password
            user.hashed_password = hashed_password
            await db.commit()
            
            logger.info(f"Password reset successfully for user: {user.username}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting password: {e}")
            await db.rollback()
            return False
    
    async def send_verification_email(self, db: AsyncSession, user: User) -> bool:
        """Send verification email to user - ASYNC VERSION"""
        try:
            # Create verification token
            token = await self.create_verification_token(db, user.id, "email_verification")
            
            # Send email (this would be async in production)
            # For now, just log the token for development
            logger.info(f"Verification token created for user {user.username}: {token.token}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending verification email: {e}")
            return False
    
    async def send_password_reset_email(self, db: AsyncSession, email: str) -> bool:
        """Send password reset email to user - ASYNC VERSION"""
        try:
            # Find user by email
            stmt = select(User).where(User.email == email)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user:
                logger.warning(f"Password reset requested for non-existent email: {email}")
                return False
            
            # Create password reset token
            token = await self.create_verification_token(db, user.id, "password_reset")
            
            # Send email (this would be async in production)
            # For now, just log the token for development
            logger.info(f"Password reset token created for user {user.username}: {token.token}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return False

# Create singleton instance
verification_service = VerificationService() 