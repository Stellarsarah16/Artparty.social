"""
Artparty.social Backend - Main FastAPI Application
Copyright (c) 2025 Artparty.social. All rights reserved.

This file is part of Artparty.social's backend services.
Unauthorized copying, modification, or distribution is prohibited.
"""
import uvicorn
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_router, auth, users, canvas, tiles, websockets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Middleware to ensure HTTPS redirects in production"""
    
    async def dispatch(self, request: Request, call_next):
        # Check if we're behind a proxy and already using HTTPS
        forwarded_proto = request.headers.get('x-forwarded-proto')
        forwarded_ssl = request.headers.get('x-forwarded-ssl')
        forwarded_host = request.headers.get('x-forwarded-host')
        
        # Determine if we're in HTTPS mode
        is_https = (
            forwarded_proto == 'https' or 
            forwarded_ssl == 'on' or
            request.url.scheme == 'https'
        )
        
        # Get the response
        response = await call_next(request)
        
        # Only modify redirects (status codes 301, 302, 307, 308)
        if response.status_code in [301, 302, 307, 308] and hasattr(response, 'headers'):
            # Get the Location header (the redirect URL)
            location = response.headers.get('location')
            if location:
                # Convert HTTP to HTTPS if we're in HTTPS mode
                if location.startswith('http://') and is_https:
                    https_location = location.replace('http://', 'https://')
                    response.headers['location'] = https_location
                    logger.info(f"HTTPS Redirect: {location} -> {https_location}")
                # Also handle relative URLs that might be missing the protocol
                elif location.startswith('/') and is_https and forwarded_host:
                    https_location = f"https://{forwarded_host}{location}"
                    response.headers['location'] = https_location
                    logger.info(f"HTTPS Redirect: {location} -> {https_location}")
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    logger.info("Starting up StellarArtCollab backend...")
    
    # Simple startup without complex database checking
    try:
        # Just create tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Don't crash, just log the error
    
    logger.info("Service is ready to accept requests")
    
    yield
    
    # Shutdown
    logger.info("Shutting down StellarArtCollab backend...")


# Create FastAPI app
app = FastAPI(
    title="StellarArtCollab API",
    description="Collaborative pixel art canvas platform",
    version="1.0.0",
    lifespan=lifespan,
    # Trust proxy headers for proper HTTPS detection
    root_path="",
    root_path_in_servers=False,
    # Disable automatic redirects for trailing slashes
    redirect_slashes=False
)

# Add HTTPS redirect middleware first
app.add_middleware(HTTPSRedirectMiddleware)

# CORS middleware - Use settings-based configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include the main API router (includes all v1 endpoints including admin)
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Welcome message"""
    return {"message": "Welcome to StellarArtCollab API"}


@app.get("/health")
async def health_check():
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.get("/ready")
async def readiness_check():
    """Readiness check - more comprehensive than health"""
    try:
        # Test database
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        # Test Redis if using it
        # Test other critical services
        
        return {"status": "ready"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "error": str(e)}
        )


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