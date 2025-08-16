#!/usr/bin/env python3
"""
Update Canvas Tile Sizes Script

This script updates all existing canvases in the database to have tile_size: 32
to match their actual tile data. This fixes the mismatch between database
tile_size values and the actual pixel data dimensions.

Usage:
    python update_canvas_tile_sizes.py

Requirements:
    - Database connection (uses environment variables)
    - SQLAlchemy models
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.canvas import Canvas
from app.models.tile import Tile

def get_database_url():
    """Get database URL from environment or config"""
    # Try environment variables first
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    
    # Fall back to config settings
    if hasattr(settings, 'DATABASE_URL'):
        return settings.DATABASE_URL
    
    # Default SQLite for local development
    return "sqlite:///./artparty.db"

def update_canvas_tile_sizes():
    """Update all existing canvases to have tile_size: 32"""
    
    # Create database engine
    db_url = get_database_url()
    print(f"🔗 Connecting to database: {db_url}")
    
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            # Get all canvases
            canvases = db.query(Canvas).all()
            print(f"📊 Found {len(canvases)} canvases in database")
            
            if not canvases:
                print("❌ No canvases found in database")
                return
            
            # Display current tile sizes
            print("\n📋 Current canvas tile sizes:")
            for canvas in canvases:
                print(f"  - Canvas {canvas.id} ({canvas.name}): {canvas.tile_size}×{canvas.tile_size}")
            
            # Update all canvases to tile_size: 32
            updated_count = 0
            for canvas in canvases:
                if canvas.tile_size != 32:
                    old_size = canvas.tile_size
                    canvas.tile_size = 32
                    updated_count += 1
                    print(f"  🔄 Updating Canvas {canvas.id} ({canvas.name}): {old_size}×{old_size} → 32×32")
                else:
                    print(f"  ✅ Canvas {canvas.id} ({canvas.name}): Already 32×32")
            
            if updated_count > 0:
                # Commit changes
                db.commit()
                print(f"\n✅ Successfully updated {updated_count} canvases to tile_size: 32")
                
                # Verify the update
                print("\n🔍 Verifying update...")
                canvases_after = db.query(Canvas).all()
                for canvas in canvases_after:
                    print(f"  - Canvas {canvas.id} ({canvas.name}): {canvas.tile_size}×{canvas.tile_size}")
                
                print(f"\n🎉 Database update completed successfully!")
                print(f"   - Total canvases: {len(canvases)}")
                print(f"   - Updated: {updated_count}")
                print(f"   - Already correct: {len(canvases) - updated_count}")
                
            else:
                print("\n✅ All canvases already have tile_size: 32, no updates needed")
                
        except Exception as e:
            db.rollback()
            print(f"❌ Error updating canvases: {e}")
            raise
        finally:
            db.close()

def verify_tile_data_consistency():
    """Verify that tile pixel data dimensions match canvas tile_size"""
    
    db_url = get_database_url()
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            # Get all canvases with their tiles
            canvases = db.query(Canvas).all()
            print(f"\n🔍 Verifying tile data consistency...")
            
            for canvas in canvases:
                tiles = db.query(Tile).filter(Tile.canvas_id == canvas.id).all()
                print(f"\n📊 Canvas {canvas.id} ({canvas.name}):")
                print(f"   - Database tile_size: {canvas.tile_size}×{canvas.tile_size}")
                print(f"   - Total tiles: {len(tiles)}")
                
                if tiles:
                    # Check first few tiles for pixel data dimensions
                    for i, tile in enumerate(tiles[:3]):  # Check first 3 tiles
                        if tile.pixel_data:
                            try:
                                # Parse pixel data to get dimensions
                                import json
                                pixel_data = json.loads(tile.pixel_data) if isinstance(tile.pixel_data, str) else tile.pixel_data
                                
                                if isinstance(pixel_data, list) and len(pixel_data) > 0:
                                    if isinstance(pixel_data[0], list):
                                        height = len(pixel_data)
                                        width = len(pixel_data[0]) if pixel_data[0] else 0
                                        print(f"   - Tile {tile.id} ({tile.x}, {tile.y}): {width}×{height} pixels")
                                        
                                        # Check if dimensions match expected tile_size
                                        if width == canvas.tile_size and height == canvas.tile_size:
                                            print(f"     ✅ Dimensions match canvas tile_size")
                                        else:
                                            print(f"     ⚠️  Dimensions don't match canvas tile_size (expected {canvas.tile_size}×{canvas.tile_size})")
                                    else:
                                        print(f"   - Tile {tile.id} ({tile.x}, {tile.y}): Invalid pixel data format")
                                else:
                                    print(f"   - Tile {tile.id} ({tile.x}, {tile.y}): Empty or invalid pixel data")
                            except Exception as e:
                                print(f"   - Tile {tile.id} ({tile.x}, {tile.y}): Error parsing pixel data: {e}")
                        else:
                            print(f"   - Tile {tile.id} ({tile.x}, {tile.y}): No pixel data")
                
                if len(tiles) > 3:
                    print(f"   - ... and {len(tiles) - 3} more tiles")
                    
        except Exception as e:
            print(f"❌ Error verifying tile data: {e}")
            raise
        finally:
            db.close()

def main():
    """Main function"""
    print("🎨 Canvas Tile Size Update Script")
    print("=" * 50)
    
    try:
        # Update canvas tile sizes
        update_canvas_tile_sizes()
        
        # Verify consistency
        verify_tile_data_consistency()
        
        print("\n🎯 Summary:")
        print("   - All canvases now have tile_size: 32")
        print("   - This should fix the 'Invalid pixel data' errors")
        print("   - Frontend will now correctly expect 32×32 tiles")
        print("\n💡 Next steps:")
        print("   - Restart your application")
        print("   - Test tile editing on different canvases")
        print("   - Verify no more 'Invalid pixel data' errors")
        
    except Exception as e:
        print(f"\n❌ Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
