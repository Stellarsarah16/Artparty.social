"""
Email service for sending verification and password reset emails
"""
import logging
from typing import Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from ..core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.config = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            TEMPLATE_FOLDER=Path(__file__).parent.parent / 'templates' / 'email'
        )
        
        self.fastmail = FastMail(self.config)
        
        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent.parent / 'templates' / 'email'
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))
    
    async def send_verification_email(self, email: str, username: str, token: str) -> bool:
        """Send email verification email"""
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
            
            # Load and render email template
            template = self.jinja_env.get_template('verification.html')
            html_content = template.render(
                username=username,
                verification_url=verification_url,
                app_name=settings.APP_NAME
            )
            
            message = MessageSchema(
                subject=f"Verify your {settings.APP_NAME} account",
                recipients=[email],
                body=html_content,
                subtype="html"
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Verification email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {e}")
            return False
    
    async def send_password_reset_email(self, email: str, username: str, token: str) -> bool:
        """Send password reset email"""
        try:
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
            
            # Load and render email template
            template = self.jinja_env.get_template('password_reset.html')
            html_content = template.render(
                username=username,
                reset_url=reset_url,
                app_name=settings.APP_NAME
            )
            
            message = MessageSchema(
                subject=f"Reset your {settings.APP_NAME} password",
                recipients=[email],
                body=html_content,
                subtype="html"
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Password reset email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
            return False

# Create singleton instance
email_service = EmailService() 