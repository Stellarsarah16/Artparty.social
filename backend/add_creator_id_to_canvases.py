#!/usr/bin/env python3
"""
Migration script to add creator_id to canvases table
This script will:
1. Add the creator_id column to the canvases table
2. Populate creator_id for existing canvases based on the first tile creator
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def migrate_canvases():
    """Add creator_id column and populate it for existing canvases"""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            print("🔧 Starting canvas migration...")
            
            # Check if creator_id column already exists
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'canvases' AND column_name = 'creator_id'
            """))
            
            if result.fetchone():
                print("✅ creator_id column already exists")
                return
            
            # Add creator_id column
            print("📝 Adding creator_id column to canvases table...")
            db.execute(text("ALTER TABLE canvases ADD COLUMN creator_id INTEGER"))
            
            # Update existing canvases with creator_id based on first tile
            print("🔄 Populating creator_id for existing canvases...")
            db.execute(text("""
                UPDATE canvases 
                SET creator_id = (
                    SELECT creator_id 
                    FROM tiles 
                    WHERE canvas_id = canvases.id 
                    ORDER BY created_at ASC 
                    LIMIT 1
                )
                WHERE creator_id IS NULL
            """))
            
            # Commit changes
            db.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate_canvases() 