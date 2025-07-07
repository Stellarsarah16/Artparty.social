"""
Main FastAPI application
"""
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.database import test_db_connection, test_redis_connection, engine, Base
from app.api.v1 import api_router, auth, users, canvas, tiles, websockets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("Starting up StellarArtCollab backend...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
    
    # Log CORS configuration for debugging
    logger.info(f"CORS origins configured: {settings.BACKEND_CORS_ORIGINS}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down StellarArtCollab backend...")


# Create FastAPI app
app = FastAPI(
    title="StellarArtCollab API",
    description="Collaborative pixel art canvas platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Use settings-based configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(canvas.router, prefix="/api/v1/canvas", tags=["canvas"])
app.include_router(tiles.router, prefix="/api/v1/tiles", tags=["tiles"])
app.include_router(websockets.router, prefix="/api/v1/ws", tags=["websockets"])


@app.get("/")
async def root():
    """Welcome message"""
    return {"message": "Welcome to StellarArtCollab API"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/cors-debug")
async def cors_debug():
    """Debug endpoint to check CORS configuration"""
    return {
        "cors_origins": settings.BACKEND_CORS_ORIGINS,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "cors_configuration": {
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": ["*"]
        }
    }


@app.get("/api/v1/cors-test")
async def cors_test():
    """Test endpoint for CORS functionality"""
    return {
        "message": "CORS test successful",
        "timestamp": "2024-01-01T00:00:00Z",
        "origin_info": "This endpoint can be used to test CORS configuration"
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    ) 