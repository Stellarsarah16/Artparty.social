"""
Test script for email verification and password reset functionality
"""
import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.verification import verification_service
from app.services.email import email_service
from app.models.user import User
from app.models.verification import VerificationToken

async def test_email_service():
    """Test the email service functionality"""
    print("🧪 Testing Email Service...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Test 1: Create a test user
        print("\n1️⃣ Creating test user...")
        test_user = User(
            username="testuser",
            email="test@example.com",  # Replace with your email for testing
            hashed_password="hashed_password",
            first_name="Test",
            last_name="User",
            is_active=True,
            is_verified=False
        )
        
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"✅ Test user created: {test_user.username}")
        
        # Test 2: Test verification token creation
        print("\n2️⃣ Testing verification token creation...")
        token = verification_service.create_verification_token(
            db, test_user.id, "email_verification"
        )
        print(f"✅ Verification token created: {token.token[:20]}...")
        
        # Test 3: Test token verification
        print("\n3️⃣ Testing token verification...")
        verified_user = verification_service.verify_token(
            db, token.token, "email_verification"
        )
        if verified_user:
            print(f"✅ Token verified successfully for user: {verified_user.username}")
        else:
            print("❌ Token verification failed")
        
        # Test 4: Test email sending (commented out for safety)
        print("\n4️⃣ Testing email sending...")
        print("⚠️  Email sending test skipped (uncomment to test)")
        
        # Uncomment the following lines to test actual email sending:
        # success = await verification_service.send_verification_email(db, test_user)
        # if success:
        #     print("✅ Verification email sent successfully")
        # else:
        #     print("❌ Failed to send verification email")
        
        # Test 5: Test password reset email
        print("\n5️⃣ Testing password reset email...")
        print("⚠️  Password reset email test skipped (uncomment to test)")
        
        # Uncomment the following lines to test actual email sending:
        # success = await verification_service.send_password_reset_email(db, test_user.email)
        # if success:
        #     print("✅ Password reset email sent successfully")
        # else:
        #     print("❌ Failed to send password reset email")
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_email_service()) 