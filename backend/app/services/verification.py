"""
Verification service for email verification and password reset tokens
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.verification import VerificationToken
from ..models.user import User
from ..core.config import settings
from .email import email_service

logger = logging.getLogger(__name__)

class VerificationService:
    """Service for handling email verification and password reset"""
    
    def generate_token(self) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    def create_verification_token(
        self, 
        db: Session, 
        user_id: int, 
        token_type: str,
        expires_in_minutes: Optional[int] = None
    ) -> VerificationToken:
        """Create a verification token"""
        # Invalidate any existing tokens of the same type for this user
        existing_tokens = db.query(VerificationToken).filter(
            VerificationToken.user_id == user_id,
            VerificationToken.token_type == token_type,
            VerificationToken.is_used == False
        ).all()
        
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
        db.commit()
        db.refresh(token)
        
        return token
    
    def verify_token(self, db: Session, token: str, token_type: str) -> Optional[User]:
        """Verify a token and return the associated user"""
        verification_token = db.query(VerificationToken).filter(
            VerificationToken.token == token,
            VerificationToken.token_type == token_type
        ).first()
        
        if not verification_token:
            return None
        
        if not verification_token.is_valid():
            return None
        
        # Mark token as used
        verification_token.is_used = True
        db.commit()
        
        # Return the user
        return db.query(User).filter(User.id == verification_token.user_id).first()
    
    async def send_verification_email(self, db: Session, user: User) -> bool:
        """Send verification email to user"""
        try:
            # Create verification token
            token = self.create_verification_token(db, user.id, "email_verification")
            
            # Send email
            success = await email_service.send_verification_email(
                user.email, 
                user.username, 
                token.token
            )
            
            if success:
                logger.info(f"Verification email sent to user {user.id}")
            else:
                # Delete the token if email failed
                db.delete(token)
                db.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return False
    
    async def send_password_reset_email(self, db: Session, email: str) -> bool:
        """Send password reset email"""
        try:
            # Find user by email
            user = db.query(User).filter(User.email == email).first()
            if not user:
                # Don't reveal if email exists or not
                return True
            
            # Create password reset token
            token = self.create_verification_token(db, user.id, "password_reset")
            
            # Send email
            success = await email_service.send_password_reset_email(
                user.email, 
                user.username, 
                token.token
            )
            
            if not success:
                # Delete the token if email failed
                db.delete(token)
                db.commit()
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False

# Create singleton instance
verification_service = VerificationService() 