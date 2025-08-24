#!/usr/bin/env python3
"""
Script to make an existing user an admin
Usage: python scripts/make_admin.py <username>
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, engine
from app.models.user import User


def make_user_admin(username: str):
    """Make a user an admin"""
    db = SessionLocal()
    try:
        # Find the user
        user = db.query(User).filter(User.username == username.lower()).first()
        
        if not user:
            print(f"❌ User '{username}' not found")
            return False
        
        print(f"🔍 Found user: {user.username} (ID: {user.id})")
        print(f"📊 Current admin status: is_admin={user.is_admin}, is_superuser={user.is_superuser}")
        
        # Update to admin
        user.is_admin = True
        user.is_superuser = True
        user.admin_permissions = {
            "can_manage_users": True,
            "can_manage_canvases": True,
            "can_manage_tiles": True,
            "can_view_reports": True,
            "can_cleanup_data": True
        }
        
        db.commit()
        db.refresh(user)
        
        print(f"✅ User '{username}' is now an admin!")
        print(f"📊 Updated admin status: is_admin={user.is_admin}, is_superuser={user.is_superuser}")
        print(f"🔐 Admin permissions: {user.admin_permissions}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error making user admin: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_users():
    """List all users with their admin status"""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        print("👥 All Users:")
        print("-" * 80)
        print(f"{'ID':<5} {'Username':<20} {'Email':<30} {'Admin':<8} {'Super':<8}")
        print("-" * 80)
        
        for user in users:
            admin_status = "✅" if user.is_admin else "❌"
            super_status = "✅" if user.is_superuser else "❌"
            print(f"{user.id:<5} {user.username:<20} {user.email:<30} {admin_status:<8} {super_status:<8}")
        
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/make_admin.py <username>")
        print("   or: python scripts/make_admin.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    else:
        username = sys.argv[1]
        success = make_user_admin(username)
        if not success:
            sys.exit(1)
