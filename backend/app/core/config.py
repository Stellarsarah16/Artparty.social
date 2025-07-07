"""
Application configuration settings
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os
import json


class Settings(BaseSettings):
    """Application settings"""
    
    # Project info
    PROJECT_NAME: str = "Collaborative Pixel Canvas Game"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "pixel_canvas"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: Optional[str] = None
    
    # Use SQLite for development if PostgreSQL is not available
    USE_SQLITE: bool = True
    SQLITE_DB_PATH: str = "./pixel_canvas.db"
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        
        # Check if we're in production environment
        environment = os.getenv("ENVIRONMENT", "development")
        debug = os.getenv("DEBUG", "true").lower() == "true"
        
        # If DATABASE_URL is provided as environment variable, use it
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            return database_url
        
        # For production, use PostgreSQL
        if environment == "production" or not debug:
            postgres_server = os.getenv("POSTGRES_SERVER", "localhost")
            postgres_user = os.getenv("POSTGRES_USER", "postgres")
            postgres_password = os.getenv("POSTGRES_PASSWORD", "password")
            postgres_db = os.getenv("POSTGRES_DB", "pixel_canvas")
            postgres_port = os.getenv("POSTGRES_PORT", "5432")
            return f"postgresql://{postgres_user}:{postgres_password}@{postgres_server}:{postgres_port}/{postgres_db}"
        
        # For development/demo - use SQLite
        return "sqlite:///./pixel_canvas.db"
    
    # Redis - Use in-memory fallback if Redis not available
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: Optional[str] = None
    USE_REDIS: bool = False  # Disable Redis for now
    
    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        return f"redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Dynamic based on environment
    BACKEND_CORS_ORIGINS: List[str] = []
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Optional[List[str]]) -> List[str]:
        if isinstance(v, list) and len(v) > 0:
            return v
        
        # Parse CORS_ORIGINS from environment variable if it exists
        cors_origins = os.getenv("CORS_ORIGINS")
        if cors_origins:
            try:
                # Try parsing as JSON array first
                return json.loads(cors_origins)
            except json.JSONDecodeError:
                # If not valid JSON, split by comma and clean up
                origins = [origin.strip() for origin in cors_origins.split(",")]
                # Filter out empty strings
                return [origin for origin in origins if origin]
        
        # Default CORS origins based on environment
        environment = os.getenv("ENVIRONMENT", "development")
        
        if environment == "production":
            # Production CORS origins - Replace with your actual domains
            production_origins = [
                "https://stellarcollab.com",
                "https://www.stellarcollab.com",
                "https://app.stellarcollab.com",
            ]
            
            # Allow additional production domains from env
            additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
            if additional_origins:
                try:
                    additional = json.loads(additional_origins)
                    production_origins.extend(additional)
                except json.JSONDecodeError:
                    additional = [origin.strip() for origin in additional_origins.split(",")]
                    production_origins.extend([origin for origin in additional if origin])
            
            return production_origins
            
        elif environment == "staging":
            # Staging environment
            return [
                "https://staging.stellarcollab.com",
                "https://staging-app.stellarcollab.com",
                "http://localhost:3000",  # For testing
                "http://localhost:8080",
            ]
        else:
            # Development CORS origins
            return [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
                "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
                "http://127.0.0.1",
                # Add common development ports
                "http://localhost:3001",
                "http://localhost:5000",
                "http://localhost:5173",  # Vite default
                "http://localhost:4200",  # Angular default
    ]
    
    # Canvas settings
    DEFAULT_CANVAS_WIDTH: int = 100
    DEFAULT_CANVAS_HEIGHT: int = 100
    TILE_SIZE: int = 32
    MAX_TILES_PER_USER: int = 10
    POINTS_PER_LIKE: int = 1
    POINTS_FOR_NEW_TILE: int = 5
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    PAINT_RATE_LIMIT_PER_MINUTE: int = 10
    LIKE_RATE_LIMIT_PER_MINUTE: int = 30
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings() 