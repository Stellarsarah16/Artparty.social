# 🔌 Artparty.social API Documentation

## Overview

The Artparty.social API is built with FastAPI and provides RESTful endpoints for user authentication, canvas management, tile operations, and real-time collaboration. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  }
}
```

## 🔐 Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_verified": false,
      "created_at": "2023-01-01T00:00:00Z"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
  }
}
```

**Status Codes:**
- `201` - User created successfully
- `400` - Validation error or username/email already exists
- `422` - Invalid request body

### Login User
**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "is_verified": true
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `422` - Invalid request body

### Logout User
**POST** `/auth/logout`

Logout user and invalidate token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

**Status Codes:**
- `200` - Logout successful
- `401` - Invalid or missing token

### Refresh Token
**POST** `/auth/refresh`

Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer"
  }
}
```

**Status Codes:**
- `200` - Token refreshed successfully
- `401` - Invalid refresh token

### Verify Email
**POST** `/auth/verify-email`

Verify user email address.

**Request Body:**
```json
{
  "token": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Status Codes:**
- `200` - Email verified successfully
- `400` - Invalid or expired token
- `422` - Invalid request body

### Forgot Password
**POST** `/auth/forgot-password`

Request password reset email.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Status Codes:**
- `200` - Reset email sent (if email exists)
- `422` - Invalid request body

### Reset Password
**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "string",
  "new_password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Status Codes:**
- `200` - Password reset successfully
- `400` - Invalid or expired token
- `422` - Invalid request body

## 👤 User Endpoints

### Get Current User
**GET** `/users/me`

Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "is_verified": true,
    "created_at": "2023-01-01T00:00:00Z",
    "tile_count": 15,
    "canvas_count": 3
  }
}
```

**Status Codes:**
- `200` - User profile retrieved
- `401` - Invalid or missing token

### Update Current User
**PUT** `/users/me`

Update current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "newusername",
    "email": "newemail@example.com",
    "is_verified": true,
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200` - User updated successfully
- `400` - Username/email already exists
- `401` - Invalid or missing token
- `422` - Invalid request body

### Delete Current User
**DELETE** `/users/me`

Delete current user account.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User account deleted successfully"
}
```

**Status Codes:**
- `200` - User deleted successfully
- `401` - Invalid or missing token

### Get User Profile
**GET** `/users/{user_id}`

Get public user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "created_at": "2023-01-01T00:00:00Z",
    "tile_count": 15,
    "canvas_count": 3,
    "public_canvases": [
      {
        "id": 1,
        "name": "Public Canvas",
        "width": 100,
        "height": 100
      }
    ]
  }
}
```

**Status Codes:**
- `200` - User profile retrieved
- `404` - User not found

## 🎨 Canvas Endpoints

### List Canvases
**GET** `/canvas`

Get list of canvases with optional filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 20)
- `public` (bool, optional): Filter by public status
- `creator_id` (int, optional): Filter by creator
- `search` (string, optional): Search by canvas name

**Response:**
```json
{
  "success": true,
  "data": {
    "canvases": [
      {
        "id": 1,
        "name": "My Canvas",
        "width": 100,
        "height": 100,
        "public": true,
        "creator_id": 1,
        "creator_username": "testuser",
        "tile_count": 15,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Canvases retrieved successfully
- `401` - Invalid or missing token

### Create Canvas
**POST** `/canvas`

Create a new canvas.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "width": 100,
  "height": 100,
  "public": true,
  "max_tiles": 1000,
  "palette_type": "default"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "New Canvas",
    "width": 100,
    "height": 100,
    "public": true,
    "creator_id": 1,
    "max_tiles": 1000,
    "palette_type": "default",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `201` - Canvas created successfully
- `400` - Validation error
- `401` - Invalid or missing token
- `422` - Invalid request body

### Get Canvas Details
**GET** `/canvas/{canvas_id}`

Get detailed canvas information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "My Canvas",
    "width": 100,
    "height": 100,
    "public": true,
    "creator_id": 1,
    "creator_username": "testuser",
    "max_tiles": 1000,
    "palette_type": "default",
    "tile_count": 15,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "stats": {
      "total_tiles": 15,
      "unique_users": 5,
      "last_activity": "2023-01-01T00:00:00Z"
    }
  }
}
```

**Status Codes:**
- `200` - Canvas details retrieved
- `401` - Invalid or missing token
- `404` - Canvas not found

### Update Canvas
**PUT** `/canvas/{canvas_id}`

Update canvas settings (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "public": true,
  "max_tiles": 1000,
  "palette_type": "default"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Canvas",
    "width": 100,
    "height": 100,
    "public": true,
    "max_tiles": 1000,
    "palette_type": "default",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200` - Canvas updated successfully
- `400` - Validation error
- `401` - Invalid or missing token
- `403` - Not canvas creator
- `404` - Canvas not found
- `422` - Invalid request body

### Delete Canvas
**DELETE** `/canvas/{canvas_id}`

Delete canvas (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Canvas deleted successfully"
}
```

**Status Codes:**
- `200` - Canvas deleted successfully
- `401` - Invalid or missing token
- `403` - Not canvas creator
- `404` - Canvas not found

### Get Canvas Tiles
**GET** `/canvas/{canvas_id}/tiles`

Get all tiles for a canvas.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "tiles": [
      {
        "id": 1,
        "canvas_id": 1,
        "x": 0,
        "y": 0,
        "color": "#FF0000",
        "creator_id": 1,
        "creator_username": "testuser",
        "created_at": "2023-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 100,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Tiles retrieved successfully
- `401` - Invalid or missing token
- `404` - Canvas not found

## 🧩 Tile Endpoints

### List Tiles
**GET** `/tiles`

Get list of tiles with optional filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `canvas_id` (int, optional): Filter by canvas
- `creator_id` (int, optional): Filter by creator
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "tiles": [
      {
        "id": 1,
        "canvas_id": 1,
        "x": 0,
        "y": 0,
        "color": "#FF0000",
        "creator_id": 1,
        "creator_username": "testuser",
        "created_at": "2023-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 100,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Tiles retrieved successfully
- `401` - Invalid or missing token

### Create Tile
**POST** `/tiles`

Create a new tile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "canvas_id": 1,
  "x": 0,
  "y": 0,
  "color": "#FF0000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "color": "#FF0000",
    "creator_id": 1,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `201` - Tile created successfully
- `400` - Validation error or tile limit reached
- `401` - Invalid or missing token
- `404` - Canvas not found
- `422` - Invalid request body

### Get Tile Details
**GET** `/tiles/{tile_id}`

Get detailed tile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "color": "#FF0000",
    "creator_id": 1,
    "creator_username": "testuser",
    "created_at": "2023-01-01T00:00:00Z",
    "canvas": {
      "id": 1,
      "name": "My Canvas",
      "width": 100,
      "height": 100
    }
  }
}
```

**Status Codes:**
- `200` - Tile details retrieved
- `401` - Invalid or missing token
- `404` - Tile not found

### Update Tile
**PUT** `/tiles/{tile_id}`

Update tile color (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "color": "#00FF00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "color": "#00FF00",
    "creator_id": 1,
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200` - Tile updated successfully
- `400` - Validation error
- `401` - Invalid or missing token
- `403` - Not tile creator
- `404` - Tile not found
- `422` - Invalid request body

### Delete Tile
**DELETE** `/tiles/{tile_id}`

Delete tile (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Tile deleted successfully"
}
```

**Status Codes:**
- `200` - Tile deleted successfully
- `401` - Invalid or missing token
- `403` - Not tile creator
- `404` - Tile not found

## 🔒 Tile Lock Endpoints

### Acquire Tile Lock
**POST** `/tiles/locks/acquire`

Acquire a lock on a tile for editing.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "canvas_id": 1,
  "x": 0,
  "y": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lock_id": "uuid-string",
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "user_id": 1,
    "acquired_at": "2023-01-01T00:00:00Z",
    "expires_at": "2023-01-01T00:05:00Z"
  }
}
```

**Status Codes:**
- `200` - Lock acquired successfully
- `400` - Tile already locked
- `401` - Invalid or missing token
- `404` - Canvas not found
- `422` - Invalid request body

### Release Tile Lock
**DELETE** `/tiles/locks/release`

Release a tile lock.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "lock_id": "uuid-string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lock released successfully"
}
```

**Status Codes:**
- `200` - Lock released successfully
- `400` - Lock not found or expired
- `401` - Invalid or missing token
- `422` - Invalid request body

### Get Lock Status
**GET** `/tiles/locks/status`

Get lock status for tiles in a canvas.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `canvas_id` (int, required): Canvas ID

**Response:**
```json
{
  "success": true,
  "data": {
    "locks": [
      {
        "lock_id": "uuid-string",
        "canvas_id": 1,
        "x": 0,
        "y": 0,
        "user_id": 1,
        "username": "testuser",
        "acquired_at": "2023-01-01T00:00:00Z",
        "expires_at": "2023-01-01T00:05:00Z"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Lock status retrieved
- `401` - Invalid or missing token
- `422` - Invalid request parameters

## 🔌 WebSocket Endpoints

### WebSocket Connection
**GET** `/ws/{canvas_id}`

Establish WebSocket connection for real-time updates.

**Headers:**
```
Authorization: Bearer <token>
```

**WebSocket Events:**

#### Tile Created
```json
{
  "event": "tile:created",
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "color": "#FF0000",
    "creator_id": 1,
    "creator_username": "testuser",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Tile Updated
```json
{
  "event": "tile:updated",
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "color": "#00FF00",
    "creator_id": 1,
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Tile Deleted
```json
{
  "event": "tile:deleted",
  "data": {
    "id": 1,
    "canvas_id": 1,
    "x": 0,
    "y": 0
  }
}
```

#### User Joined
```json
{
  "event": "user:joined",
  "data": {
    "user_id": 1,
    "username": "testuser"
  }
}
```

#### User Left
```json
{
  "event": "user:left",
  "data": {
    "user_id": 1,
    "username": "testuser"
  }
}
```

#### Lock Acquired
```json
{
  "event": "lock:acquired",
  "data": {
    "lock_id": "uuid-string",
    "canvas_id": 1,
    "x": 0,
    "y": 0,
    "user_id": 1,
    "username": "testuser",
    "acquired_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Lock Released
```json
{
  "event": "lock:released",
  "data": {
    "lock_id": "uuid-string",
    "canvas_id": 1,
    "x": 0,
    "y": 0
  }
}
```

## 👑 Admin Endpoints

### List All Users
**GET** `/admin/users`

Get list of all users (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 20)
- `search` (string, optional): Search by username or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "is_verified": true,
        "is_admin": false,
        "created_at": "2023-01-01T00:00:00Z",
        "tile_count": 15,
        "canvas_count": 3
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Users retrieved successfully
- `401` - Invalid or missing token
- `403` - Not admin user

### Update User
**PUT** `/admin/users/{user_id}`

Update user (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "is_verified": true,
  "is_admin": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "updateduser",
    "email": "updated@example.com",
    "is_verified": true,
    "is_admin": false,
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

**Status Codes:**
- `200` - User updated successfully
- `400` - Validation error
- `401` - Invalid or missing token
- `403` - Not admin user
- `404` - User not found
- `422` - Invalid request body

### Delete User
**DELETE** `/admin/users/{user_id}`

Delete user (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Status Codes:**
- `200` - User deleted successfully
- `401` - Invalid or missing token
- `403` - Not admin user
- `404` - User not found

### List All Canvases
**GET** `/admin/canvases`

Get list of all canvases (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "canvases": [
      {
        "id": 1,
        "name": "My Canvas",
        "width": 100,
        "height": 100,
        "public": true,
        "creator_id": 1,
        "creator_username": "testuser",
        "tile_count": 15,
        "created_at": "2023-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Status Codes:**
- `200` - Canvases retrieved successfully
- `401` - Invalid or missing token
- `403` - Not admin user

### Delete Canvas
**DELETE** `/admin/canvases/{canvas_id}`

Delete canvas (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Canvas deleted successfully"
}
```

**Status Codes:**
- `200` - Canvas deleted successfully
- `401` - Invalid or missing token
- `403` - Not admin user
- `404` - Canvas not found

## 📊 Error Codes

### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing authentication
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND_ERROR` - Resource not found
- `CONFLICT_ERROR` - Resource conflict (e.g., duplicate username)
- `RATE_LIMIT_ERROR` - Too many requests
- `INTERNAL_ERROR` - Server internal error

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔧 Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **WebSocket connections**: 10 connections per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Pagination

List endpoints support pagination with the following parameters:

- `page` (int): Page number (starts from 1)
- `limit` (int): Items per page (max 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "pages": 5
}
```

## 🔍 Filtering and Search

Many endpoints support filtering and search:

- **Search**: Use `search` parameter for text-based search
- **Filtering**: Use specific filter parameters (e.g., `public`, `creator_id`)
- **Sorting**: Use `sort` parameter with field name and direction (e.g., `sort=created_at:desc`)

## 📚 SDK and Libraries

### JavaScript/TypeScript
```javascript
// Example API usage
const response = await fetch('/api/v1/canvas', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Canvas',
    width: 100,
    height: 100,
    public: true
  })
});

const data = await response.json();
```

### Python
```python
import requests

# Example API usage
response = requests.post(
    'http://localhost:8000/api/v1/canvas',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'name': 'My Canvas',
        'width': 100,
        'height': 100,
        'public': True
    }
)

data = response.json()
```

## 🤝 Support

For API support and questions:
1. Check this documentation first
2. Review the error responses for specific issues
3. Check the server logs for detailed error information
4. Create an issue for API-related problems

---

**Note**: This API documentation is automatically generated and updated with the codebase. For the most current information, always refer to the latest version. 