#!/usr/bin/env python3
"""
Simple test script to verify the FastAPI server is working
"""
import time
import requests
from requests.exceptions import ConnectionError

def test_api():
    """Test the API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Collaborative Pixel Canvas Game API...")
    
    # Wait a moment for server to start
    time.sleep(2)
    
    try:
        # Test health endpoint
        print("\n📍 Testing health endpoint...")
        response = requests.get(f"{base_url}/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
            print("   ✅ Health endpoint working!")
        else:
            print(f"   ❌ Health endpoint failed: {response.status_code}")
            return False
            
        # Test API docs
        print("\n📖 Testing API docs...")
        response = requests.get(f"{base_url}/docs")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ API docs are accessible!")
        else:
            print(f"   ❌ API docs failed: {response.status_code}")
            
        # Test API endpoints
        print("\n🔗 Testing API endpoints...")
        api_endpoints = [
            "/api/v1/auth/test",
            "/api/v1/users/test", 
            "/api/v1/canvas/test",
            "/api/v1/tiles/test"
        ]
        
        for endpoint in api_endpoints:
            response = requests.get(f"{base_url}{endpoint}")
            print(f"   {endpoint}: {response.status_code}")
            
        print("\n🎉 FastAPI server is running successfully!")
        print(f"🌐 Access the API at: {base_url}")
        print(f"📚 View documentation at: {base_url}/docs")
        
        return True
        
    except ConnectionError:
        print("❌ Could not connect to server!")
        print("Make sure the server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

if __name__ == "__main__":
    test_api() 