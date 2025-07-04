#!/usr/bin/env python3
"""
Test script for WebSocket functionality
Run this after starting the server to test real-time features
"""
import asyncio
import websockets
import json
import requests
from typing import Dict, Any


class WebSocketTester:
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http", "ws")
        self.auth_token = None
        self.user_id = None
        
    async def register_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        """Register a new user"""
        response = requests.post(f"{self.base_url}/api/v1/auth/register", json={
            "username": username,
            "email": email,
            "password": password
        })
        return response.json()
    
    async def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """Login user and get JWT token"""
        response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
            "username": username,
            "password": password
        })
        result = response.json()
        if "access_token" in result:
            self.auth_token = result["access_token"]
            self.user_id = result["user"]["id"]
        return result
    
    async def create_canvas(self, title: str, description: str = "Test canvas") -> Dict[str, Any]:
        """Create a test canvas"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = requests.post(f"{self.base_url}/api/v1/canvas/", json={
            "title": title,
            "description": description,
            "width": 1024,
            "height": 1024,
            "tile_size": 32,
            "max_tiles_per_user": 10,
            "is_public": True
        }, headers=headers)
        return response.json()
    
    async def connect_to_canvas(self, canvas_id: int) -> websockets.WebSocketServerProtocol:
        """Connect to a canvas WebSocket"""
        uri = f"{self.ws_url}/api/v1/ws/canvas/{canvas_id}?token={self.auth_token}"
        websocket = await websockets.connect(uri)
        return websocket
    
    async def test_websocket_basic(self):
        """Test basic WebSocket functionality"""
        print("🔧 Testing WebSocket Basic Functionality...")
        
        # Register and login user
        print("1. Registering test user...")
        await self.register_user("test_ws_user", "test@example.com", "password123")
        
        print("2. Logging in...")
        login_result = await self.login_user("test_ws_user", "password123")
        if "access_token" not in login_result:
            print("❌ Login failed!")
            return False
        
        print("3. Creating test canvas...")
        canvas_result = await self.create_canvas("WebSocket Test Canvas")
        if "canvas" not in canvas_result:
            print("❌ Canvas creation failed!")
            return False
        
        canvas_id = canvas_result["canvas"]["id"]
        print(f"✅ Canvas created with ID: {canvas_id}")
        
        print("4. Connecting to WebSocket...")
        try:
            websocket = await self.connect_to_canvas(canvas_id)
            print("✅ WebSocket connected successfully!")
            
            # Wait for initial canvas state message
            initial_message = await websocket.recv()
            initial_data = json.loads(initial_message)
            print(f"📨 Received initial message: {initial_data['type']}")
            
            # Send ping message
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Wait for pong response
            response = await websocket.recv()
            response_data = json.loads(response)
            
            if response_data["type"] == "pong":
                print("✅ Ping/Pong test successful!")
            else:
                print(f"❌ Expected pong, got: {response_data['type']}")
                return False
            
            # Send canvas state request
            await websocket.send(json.dumps({"type": "request_canvas_state"}))
            
            # Wait for canvas state response
            state_response = await websocket.recv()
            state_data = json.loads(state_response)
            
            if state_data["type"] == "canvas_state":
                print(f"✅ Canvas state received: {state_data['user_count']} users")
            else:
                print(f"❌ Expected canvas_state, got: {state_data['type']}")
                return False
            
            await websocket.close()
            print("✅ WebSocket connection closed gracefully")
            
            return True
            
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
            return False
    
    async def test_websocket_stats(self):
        """Test WebSocket statistics endpoint"""
        print("\n🔧 Testing WebSocket Statistics...")
        
        try:
            response = requests.get(f"{self.base_url}/api/v1/ws/stats")
            stats = response.json()
            
            print(f"📊 WebSocket Statistics:")
            print(f"   Total Connections: {stats['total_connections']}")
            print(f"   Active Canvases: {stats['active_canvases']}")
            print(f"   Canvas Details: {stats['canvas_details']}")
            
            return True
            
        except Exception as e:
            print(f"❌ Stats test failed: {e}")
            return False


async def main():
    """Run WebSocket tests"""
    print("🚀 Starting WebSocket Tests...")
    print("=" * 50)
    
    tester = WebSocketTester()
    
    # Test basic WebSocket functionality
    basic_test = await tester.test_websocket_basic()
    
    # Test statistics endpoint
    stats_test = await tester.test_websocket_stats()
    
    print("\n" + "=" * 50)
    print("🎯 Test Results:")
    print(f"   Basic WebSocket: {'✅ PASSED' if basic_test else '❌ FAILED'}")
    print(f"   Statistics: {'✅ PASSED' if stats_test else '❌ FAILED'}")
    
    if basic_test and stats_test:
        print("\n🎉 All WebSocket tests passed! Real-time features are working.")
    else:
        print("\n⚠️  Some tests failed. Check the server logs for details.")


if __name__ == "__main__":
    print("WebSocket Test Script")
    print("Make sure the server is running on http://127.0.0.1:8000")
    print("Press Ctrl+C to stop the test")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Test stopped by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}") 