#!/usr/bin/env python3
"""
Database initialization script
Creates all tables and optionally seeds initial data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import create_tables, drop_tables, test_db_connection
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize the database with tables and sample data"""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if we need to add new columns to existing canvases table
        inspector = db.get_bind().dialect.inspector(db.get_bind())
        existing_columns = [col['name'] for col in inspector.get_columns('canvases')]
        
        # Add new columns if they don't exist
        if 'collaboration_mode' not in existing_columns:
            db.execute(text("ALTER TABLE canvases ADD COLUMN collaboration_mode VARCHAR(20) DEFAULT 'free'"))
            print("✅ Added collaboration_mode column")
            
        if 'auto_save_interval' not in existing_columns:
            db.execute(text("ALTER TABLE canvases ADD COLUMN auto_save_interval INTEGER DEFAULT 60"))
            print("✅ Added auto_save_interval column")
            
        if 'is_public' not in existing_columns:
            db.execute(text("ALTER TABLE canvases ADD COLUMN is_public BOOLEAN DEFAULT TRUE"))
            print("✅ Added is_public column")
            
        if 'is_moderated' not in existing_columns:
            db.execute(text("ALTER TABLE canvases ADD COLUMN is_moderated BOOLEAN DEFAULT FALSE"))
            print("✅ Added is_moderated column")
        
        # Update existing records with new defaults
        db.execute(text("UPDATE canvases SET tile_size = 64 WHERE tile_size = 32"))
        db.execute(text("UPDATE canvases SET max_tiles_per_user = 10 WHERE max_tiles_per_user = 5"))
        
        # Check if we have any existing users
        existing_users = db.query(User).count()
        
        if existing_users == 0:
            print("Creating sample users...")
            
            # Create sample users
            user1 = User(
                username="demo_user",
                email="demo@example.com",
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2e"  # password: demo123
            )
            user2 = User(
                username="artist",
                email="artist@example.com",
                hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2e"  # password: demo123
            )
            
            db.add(user1)
            db.add(user2)
            db.commit()
            
            print("✅ Created sample users")
            
            # Create sample canvases
            print("Creating sample canvases...")
            
            canvas1 = Canvas(
                name="Community Pixel Art",
                description="A collaborative pixel art canvas for everyone to contribute",
                width=1024,
                height=1024,
                tile_size=64,
                palette_type="classic",
                max_tiles_per_user=10,
                collaboration_mode="free",
                auto_save_interval=60,
                is_public=True,
                is_moderated=False,
                is_active=True
            )
            
            canvas2 = Canvas(
                name="Nature Scene",
                description="A beautiful nature scene with earth tones",
                width=2048,
                height=1024,
                tile_size=128,
                palette_type="forest",
                max_tiles_per_user=5,
                collaboration_mode="tile-lock",
                auto_save_interval=30,
                is_public=True,
                is_moderated=False,
                is_active=True
            )
            
            canvas3 = Canvas(
                name="Sunset Landscape",
                description="Warm sunset colors for a peaceful landscape",
                width=1024,
                height=1024,
                tile_size=64,
                palette_type="sunset",
                max_tiles_per_user=8,
                collaboration_mode="area-lock",
                auto_save_interval=60,
                is_public=True,
                is_moderated=False,
                is_active=True
            )
            
            db.add(canvas1)
            db.add(canvas2)
            db.add(canvas3)
            db.commit()
            
            print("✅ Created sample canvases")
            
        else:
            print(f"Database already has {existing_users} users, skipping sample data creation")
        
        db.commit()
        print("✅ Database initialization completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during database initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def reset_database():
    """Reset the database by dropping and recreating all tables"""
    logger.info("🔄 Resetting database...")
    
    # Drop tables
    logger.info("Dropping existing tables...")
    drop_tables()
    
    # Create tables
    logger.info("Creating fresh tables...")
    if not create_tables():
        logger.error("❌ Failed to create tables. Exiting.")
        return False
    
    logger.info("✅ Database reset completed successfully!")
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize the database")
    parser.add_argument("--reset", action="store_true", help="Reset the database")
    args = parser.parse_args()
    
    if args.reset:
        reset_database()
    else:
        init_database() 