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

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

if __name__ == "__main__":
    freeze_support()  # Fix for Windows multiprocessing
    
    try:
        import uvicorn
        import fastapi
        
        print("🚀 Starting Collaborative Pixel Canvas Game API...")
        print("📍 Server will be available at: http://localhost:8080")
        print("📖 API docs will be available at: http://localhost:8080/docs")
        print("🔄 Auto-reload enabled for development")
        
        # Use the import string to enable reload
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0", 
            port=8080, 
            reload=True,
            reload_dirs=["app"]
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("🔧 Attempting to install missing dependencies...")
        
        if install_dependencies():
            print("🔄 Retrying server startup...")
            try:
                import uvicorn
                import fastapi
                
                print("🚀 Starting Collaborative Pixel Canvas Game API...")
                print("📍 Server will be available at: http://localhost:8080")
                print("📖 API docs will be available at: http://localhost:8080/docs")
                print("🔄 Auto-reload enabled for development")
                
                uvicorn.run(
                    "app.main:app",
                    host="0.0.0.0", 
                    port=8080, 
                    reload=True,
                    reload_dirs=["app"]
                )
            except ImportError as e2:
                print(f"❌ Still missing dependencies after installation: {e2}")
                print("💡 Try running: pip install -r backend/requirements.txt")
        else:
            print("💡 Try running: pip install -r backend/requirements.txt manually")
    except Exception as e:
        print(f"❌ Error starting server: {e}") 