"""
Database configuration and connection setup
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import text
import logging

from .config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create ASYNC database engine for PostgreSQL
# Convert psycopg2:// to postgresql+asyncpg://
if settings.DATABASE_URL and 'psycopg2://' in settings.DATABASE_URL:
    # Convert to async PostgreSQL driver
    async_database_url = settings.DATABASE_URL.replace('psycopg2://', 'postgresql+asyncpg://')
elif settings.DATABASE_URL and 'postgresql://' in settings.DATABASE_URL:
    # Convert to async PostgreSQL driver
    async_database_url = settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')
else:
    # Fallback to SQLite for development
    async_database_url = "sqlite+aiosqlite:///artparty_social.db"

# Create ASYNC database engine with more conservative settings
engine = create_async_engine(
    async_database_url,
    echo=settings.DEBUG,  # Log SQL statements in debug mode
    pool_pre_ping=True,
    pool_size=5,  # Reduce pool size to prevent exhaustion
    max_overflow=10,  # Reduce max overflow
    pool_timeout=30,  # Add timeout for getting connections
    pool_recycle=3600,  # Recycle connections every hour
)

# Create async sessionmaker
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

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


async def get_db():
    """Async dependency for getting database session"""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_redis():
    """
    Redis dependency for FastAPI
    """
    return redis_client


async def test_db_connection():
    """Test database connection - async version"""
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            await result.fetchone()
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


async def create_tables():
    """Create all tables in the database - async version"""
    try:
        # Import models to ensure they are registered with Base
        from ..models import User, Canvas, Tile, Like
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("All tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        return False


async def drop_tables():
    """Drop all tables in the database - async version"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
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