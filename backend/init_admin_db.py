#!/usr/bin/env python3
"""
Database migration script to add admin functionality
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.models.user import User

def add_admin_columns():
    """Add admin columns to users table"""
    print("🔧 Adding admin columns to users table...")
    
    with engine.connect() as connection:
        try:
            # Add admin columns
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
            """))
            
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE
            """))
            
            connection.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS admin_permissions JSON DEFAULT '{}'
            """))
            
            connection.commit()
            print("✅ Admin columns added successfully")
            
        except Exception as e:
            print(f"❌ Error adding admin columns: {e}")
            connection.rollback()
            raise

def make_user_superuser(username):
    """Make a specific user a superuser"""
    print(f"👑 Making user '{username}' a superuser...")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.is_superuser = True
            user.is_admin = True
            user.admin_permissions = {
                "manage_users": True,
                "manage_canvases": True,
                "view_activity": True,
                "delete_content": True
            }
            db.commit()
            print(f"✅ User '{username}' is now a superuser")
        else:
            print(f"❌ User '{username}' not found")
            
    except Exception as e:
        print(f"❌ Error making user superuser: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def list_users():
    """List all users with their admin status"""
    print("👥 Current users and their admin status:")
    
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            admin_status = []
            if user.is_superuser:
                admin_status.append("SUPERUSER")
            if user.is_admin:
                admin_status.append("ADMIN")
            if not user.is_admin and not user.is_superuser:
                admin_status.append("USER")
                
            status_str = ", ".join(admin_status)
            print(f"  - {user.username} ({user.email}): {status_str}")
            
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()

def main():
    """Main migration function"""
    print("🚀 Starting admin database migration...")
    
    try:
        # Add admin columns
        add_admin_columns()
        
        # List current users
        list_users()
        
        # Ask for username to make superuser
        username = input("\nEnter username to make superuser (or press Enter to skip): ").strip()
        
        if username:
            make_user_superuser(username)
            print("\nUpdated user list:")
            list_users()
        else:
            print("⏭️ Skipping superuser creation")
        
        print("\n✅ Admin migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 