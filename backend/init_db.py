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
    """Initialize the database with all tables"""
    logger.info("🚀 Starting database initialization...")
    
    # Test database connection
    logger.info("Testing database connection...")
    if not test_db_connection():
        logger.error("❌ Database connection failed. Exiting.")
        return False
    
    # Create tables
    logger.info("Creating database tables...")
    if not create_tables():
        logger.error("❌ Failed to create tables. Exiting.")
        return False
    
    logger.info("✅ Database initialization completed successfully!")
    logger.info(f"📊 Database URL: {settings.DATABASE_URL}")
    logger.info(f"🔧 SQLite Mode: {settings.USE_SQLITE}")
    
    return True


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