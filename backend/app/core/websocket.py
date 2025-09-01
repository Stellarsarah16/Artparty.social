"""
WebSocket connection manager for real-time collaboration
"""
import json
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time collaboration"""
    
    def __init__(self):
        # Canvas-based connections: {canvas_id: {user_id: websocket}}
        self.canvas_connections: Dict[int, Dict[int, WebSocket]] = {}
        # User info cache: {user_id: {"username": str, "display_name": str}}
        self.user_info: Dict[int, Dict[str, str]] = {}
        # Active users per canvas: {canvas_id: set(user_ids)}
        self.canvas_users: Dict[int, Set[int]] = {}
    
    async def connect(self, websocket: WebSocket, canvas_id: int, user_id: int, user_info: Dict[str, str]):
        """Connect a user to a canvas"""
        # Note: websocket.accept() is called in the API endpoint, not here
        
        # Initialize canvas connections if not exists
        if canvas_id not in self.canvas_connections:
            self.canvas_connections[canvas_id] = {}
            self.canvas_users[canvas_id] = set()
        
        # Store connection
        self.canvas_connections[canvas_id][user_id] = websocket
        self.user_info[user_id] = user_info
        self.canvas_users[canvas_id].add(user_id)
        
        logger.info(f"User {user_id} ({user_info['username']}) connected to canvas {canvas_id}")
        
        # Notify other users that someone joined
        await self.broadcast_to_canvas(canvas_id, {
            "type": "user_joined",
            "user_id": user_id,
            "username": user_info["username"],
            "display_name": user_info.get("display_name"),
            "active_users": len(self.canvas_users[canvas_id]),
            "timestamp": self._get_timestamp()
        }, exclude_user=user_id)
        
        # Send current active users to the new connection
        active_users = []
        for uid in self.canvas_users[canvas_id]:
            if uid != user_id and uid in self.user_info:
                active_users.append({
                    "user_id": uid,
                    "username": self.user_info[uid]["username"],
                    "display_name": self.user_info[uid].get("display_name")
                })
        
        await websocket.send_text(json.dumps({
            "type": "canvas_state",
            "active_users": active_users,
            "user_count": len(self.canvas_users[canvas_id]),
            "message": f"Connected to canvas {canvas_id}",
            "timestamp": self._get_timestamp()
        }))
    
    async def disconnect(self, canvas_id: int, user_id: int):
        """Disconnect a user from a canvas"""
        if canvas_id in self.canvas_connections and user_id in self.canvas_connections[canvas_id]:
            # Remove connection
            del self.canvas_connections[canvas_id][user_id]
            self.canvas_users[canvas_id].discard(user_id)
            
            user_info = self.user_info.get(user_id, {})
            logger.info(f"User {user_id} ({user_info.get('username', 'unknown')}) disconnected from canvas {canvas_id}")
            
            # Clean up empty canvas
            if not self.canvas_connections[canvas_id]:
                del self.canvas_connections[canvas_id]
                del self.canvas_users[canvas_id]
            else:
                # Notify remaining users
                await self.broadcast_to_canvas(canvas_id, {
                    "type": "user_left",
                    "user_id": user_id,
                    "username": user_info.get("username"),
                    "active_users": len(self.canvas_users[canvas_id]),
                    "timestamp": self._get_timestamp()
                })
    
    async def broadcast_to_canvas(self, canvas_id: int, message: dict, exclude_user: int = None):
        """Broadcast a message to all users connected to a canvas"""
        if canvas_id not in self.canvas_connections:
            return
        
        message_str = json.dumps(message)
        disconnected_users = []
        
        for user_id, websocket in self.canvas_connections[canvas_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await websocket.send_text(message_str)
            except WebSocketDisconnect:
                disconnected_users.append(user_id)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(canvas_id, user_id)
    
    async def send_to_user(self, canvas_id: int, user_id: int, message: dict):
        """Send a message to a specific user"""
        if (canvas_id in self.canvas_connections and 
            user_id in self.canvas_connections[canvas_id]):
            
            try:
                await self.canvas_connections[canvas_id][user_id].send_text(json.dumps(message))
            except WebSocketDisconnect:
                await self.disconnect(canvas_id, user_id)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                await self.disconnect(canvas_id, user_id)
    
    async def broadcast_tile_created(self, canvas_id: int, tile_data: dict, creator_id: int):
        """Broadcast new tile creation to all canvas users"""
        message = {
            "type": "tile_created",
            "tile": tile_data,
            "creator_id": creator_id,
            "creator_username": self.user_info.get(creator_id, {}).get("username", "unknown"),
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message, exclude_user=creator_id)
    
    async def broadcast_tile_updated(self, canvas_id: int, tile_data: dict, updater_id: int):
        """Broadcast tile updates to all canvas users"""
        message = {
            "type": "tile_updated",
            "tile": tile_data,
            "updater_id": updater_id,
            "updater_username": self.user_info.get(updater_id, {}).get("username", "unknown"),
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message, exclude_user=updater_id)
    
    async def broadcast_tile_deleted(self, canvas_id: int, tile_id: int, position: dict, deleter_id: int):
        """Broadcast tile deletion to all canvas users"""
        message = {
            "type": "tile_deleted",
            "tile_id": tile_id,
            "position": position,  # {"x": int, "y": int}
            "deleter_id": deleter_id,
            "deleter_username": self.user_info.get(deleter_id, {}).get("username", "unknown"),
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message, exclude_user=deleter_id)
    
    async def broadcast_tile_liked(self, canvas_id: int, tile_id: int, like_data: dict, liker_id: int):
        """Broadcast tile likes to all canvas users"""
        message = {
            "type": "tile_liked",
            "tile_id": tile_id,
            "like": like_data,
            "liker_id": liker_id,
            "liker_username": self.user_info.get(liker_id, {}).get("username", "unknown"),
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message, exclude_user=liker_id)
    
    async def broadcast_tile_unliked(self, canvas_id: int, tile_id: int, unliker_id: int, new_like_count: int):
        """Broadcast tile unlikes to all canvas users"""
        message = {
            "type": "tile_unliked",
            "tile_id": tile_id,
            "new_like_count": new_like_count,
            "unliker_id": unliker_id,
            "unliker_username": self.user_info.get(unliker_id, {}).get("username", "unknown"),
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message, exclude_user=unliker_id)
    
    def get_canvas_user_count(self, canvas_id: int) -> int:
        """Get the number of users connected to a canvas"""
        return len(self.canvas_users.get(canvas_id, set()))
    
    def get_total_connections(self) -> int:
        """Get total number of WebSocket connections"""
        total = 0
        for canvas_connections in self.canvas_connections.values():
            total += len(canvas_connections)
        return total
    
    def get_canvas_list(self) -> List[dict]:
        """Get list of active canvases with user counts"""
        canvas_list = []
        for canvas_id, users in self.canvas_users.items():
            canvas_list.append({
                "canvas_id": canvas_id,
                "active_users": len(users),
                "user_ids": list(users)
            })
        return canvas_list
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    async def broadcast_chat_message(self, canvas_id: int, chat_data: dict):
        """Broadcast chat message to all canvas users"""
        message = {
            "type": "canvas_chat_message",
            **chat_data,
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, message)

    async def send_direct_message(self, sender_id: int, recipient_id: int, message_data: dict):
        """Send direct message between users (if they're online)"""
        # Find which canvas the recipient is connected to
        recipient_canvas = None
        for canvas_id, users in self.canvas_users.items():
            if recipient_id in users:
                recipient_canvas = canvas_id
                break
        
        if recipient_canvas:
            dm_message = {
                "type": "direct_message",
                **message_data,
                "timestamp": self._get_timestamp()
            }
            await self.send_to_user(recipient_canvas, recipient_id, dm_message)
            return True
        
        return False  # User is offline

    async def broadcast_user_activity(self, canvas_id: int, activity_data: dict):
        """Broadcast user activity to canvas users"""
        activity_message = {
            "type": "user_activity",
            **activity_data,
            "timestamp": self._get_timestamp()
        }
        await self.broadcast_to_canvas(canvas_id, activity_message)

    async def get_canvas_active_users(self, canvas_id: int) -> List[dict]:
        """Get detailed info about users currently active in a canvas"""
        active_users = []
        
        if canvas_id in self.canvas_users:
            for user_id in self.canvas_users[canvas_id]:
                user_info = self.user_info.get(user_id, {})
                active_users.append({
                    "user_id": user_id,
                    "username": user_info.get("username", "unknown"),
                    "display_name": user_info.get("display_name"),
                    "connected_at": user_info.get("connected_at"),
                    "is_active": True
                })
        
        return active_users


# Global connection manager instance
connection_manager = ConnectionManager() 