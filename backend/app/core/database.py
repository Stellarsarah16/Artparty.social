"""
Database configuration and connection setup
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(
    settings.DATABASE_URL or "sqlite:///pixel_canvas.db",
    echo=settings.DEBUG,  # Log SQL statements in debug mode
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

# Redis connection (optional for now)
redis_client = None
if settings.USE_REDIS:
    try:
        import redis
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    except ImportError:
        logger.warning("Redis not available, using in-memory fallback")


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_redis():
    """
    Redis dependency for FastAPI
    """
    return redis_client


def test_db_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def create_tables():
    """Create all tables in the database"""
    try:
        # Import models to ensure they are registered with Base
        from ..models import User, Canvas, Tile, Like
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("All tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        return False


def drop_tables():
    """Drop all tables in the database"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("All tables dropped successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to drop tables: {e}")
        return False


# Test Redis connection
def test_redis_connection():
    """Test Redis connection"""
    if not redis_client:
        logger.info("Redis not configured, skipping connection test")
        return False
    try:
        redis_client.ping()
        logger.info("Redis connection successful")
        return True
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        return False 