"""
Password service for password hashing and verification
"""
from passlib.context import CryptContext


class PasswordService:
    """Service for password hashing and verification operations"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def is_password_strong(self, password: str) -> bool:
        """Check if password meets strength requirements"""
        if len(password) < 8:
            return False
        
        has_lower = any(c.islower() for c in password)
        has_upper_or_digit = any(c.isupper() or c.isdigit() for c in password)
        
        return has_lower and has_upper_or_digit


# Create a singleton instance
password_service = PasswordService() 