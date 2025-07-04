"""
Simple test script to verify the API is working
"""
import requests
import json

try:
    # Test health endpoint
    response = requests.get('http://localhost:8000/health')
    print("Health endpoint response:")
    print(f"Status: {response.status_code}")
    print(f"Content: {response.json()}")
    
    # Test API docs endpoint
    response = requests.get('http://localhost:8000/docs')
    print(f"\nAPI docs endpoint status: {response.status_code}")
    
    print("\n✅ FastAPI application is running successfully!")
    
except Exception as e:
    print(f"❌ Error testing API: {e}")
    print("Make sure the FastAPI application is running on http://localhost:8000") 