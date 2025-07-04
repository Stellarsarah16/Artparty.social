#!/usr/bin/env python3
"""
Simple script to run the FastAPI server
"""
import os
import sys
import subprocess
from multiprocessing import freeze_support

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Change to backend directory
os.chdir(backend_dir)

if __name__ == "__main__":
    freeze_support()  # Fix for Windows multiprocessing
    
    try:
        import uvicorn
        
        print("🚀 Starting Collaborative Pixel Canvas Game API...")
        print("📍 Server will be available at: http://localhost:8000")
        print("📖 API docs will be available at: http://localhost:8000/docs")
        print("🔄 Auto-reload enabled for development")
        
        # Use the import string to enable reload
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            reload_dirs=["app"]
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the virtual environment and dependencies are installed")
    except Exception as e:
        print(f"❌ Error starting server: {e}") 