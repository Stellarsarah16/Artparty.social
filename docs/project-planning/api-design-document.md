# API Design Document: Collaborative Pixel Canvas Game

## Overview

This document defines the RESTful API endpoints for the Collaborative Pixel Canvas Game, including authentication, user management, canvas operations, tile management, and the points system. The API follows REST principles with JSON request/response formats.

## API Design Principles

1. **RESTful Design**: Standard HTTP methods and status codes
2. **Consistent Naming**: Clear, consistent endpoint naming conventions
3. **Versioning**: API versioning for future compatibility
4. **Authentication**: JWT-based authentication for protected endpoints
5. **Error Handling**: Standardized error response format
6. **Rate Limiting**: Prevent abuse and ensure fair usage
7. **Data Validation**: Comprehensive input validation

## Base URL and Versioning

**Base URL**: `https://api.pixelcanvas.com/v1`

**Version Strategy**: URL path versioning (e.g., `/v1/`, `/v2/`)

## Authentication

### JWT Token Format

```json
{
  "user_id": "uuid",
  "username": "string",
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "access"
}
```

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00Z",
    "version": "1.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "username",
      "issue": "Username must be at least 3 characters"
    }
  },
  "meta": {
    "timestamp": "2025-01-01T12:00:00Z",
    "version": "1.0"
  }
}
```

## Authentication Endpoints

### 1. User Registration

**POST** `/auth/register`

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "created_at": "2025-01-01T12:00:00Z",
      "total_points": 0,
      "tiles_owned": 0
    },
    "token": "jwt_token",
    "expires_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Username or email already exists

### 2. User Login

**POST** `/auth/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "last_login": "2025-01-01T12:00:00Z",
      "total_points": 150,
      "tiles_owned": 3
    },
    "token": "jwt_token",
    "expires_at": "2025-01-01T12:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid credentials
- `401 Unauthorized`: Invalid username/password

### 3. Token Refresh

**POST** `/auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "jwt_refresh_token"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expires_at": "2025-01-01T12:00:00Z"
  }
}
```

### 4. Logout

**POST** `/auth/logout`

**Headers:** `Authorization: Bearer <jwt_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

## User Management Endpoints

### 1. Get User Profile

**GET** `/users/profile`

**Headers:** `Authorization: Bearer <jwt_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "created_at": "2025-01-01T12:00:00Z",
      "total_points": 150,
      "tiles_owned": 3,
      "painted_tiles": 2,
      "total_likes_received": 25
    }
  }
}
```

### 2. Update User Profile

**PUT** `/users/profile`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  }
}
```

### 3. Get User's Tiles

**GET** `/users/tiles`

**Headers:** `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 20, max: 100)
- `painted_only`: boolean (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tiles": [
      {
        "id": "uuid",
        "canvas_id": "uuid",
        "canvas_name": "Main Canvas",
        "x_coordinate": 10,
        "y_coordinate": 15,
        "is_painted": true,
        "like_count": 5,
        "last_painted_at": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "total_pages": 1
    }
  }
}
```

### 4. Get User Points History

**GET** `/users/points/history`

**Headers:** `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "points_history": [
      {
        "id": "uuid",
        "points_earned": 1,
        "source_type": "tile_like",
        "source_id": "uuid",
        "created_at": "2025-01-01T12:00:00Z",
        "description": "Received like on tile"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "total_pages": 2
    }
  }
}
```

## Canvas Management Endpoints

### 1. Get Canvas List

**GET** `/canvas`

**Query Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 10, max: 50)
- `active_only`: boolean (default: true)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "canvases": [
      {
        "id": "uuid",
        "name": "Main Canvas",
        "description": "The primary collaborative canvas",
        "width": 100,
        "height": 100,
        "tile_size": 32,
        "total_tiles": 10000,
        "painted_tiles": 1500,
        "unique_artists": 45,
        "total_likes": 2500,
        "last_activity": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

### 2. Get Canvas Details

**GET** `/canvas/{canvas_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "canvas": {
      "id": "uuid",
      "name": "Main Canvas",
      "description": "The primary collaborative canvas",
      "width": 100,
      "height": 100,
      "tile_size": 32,
      "created_at": "2025-01-01T12:00:00Z",
      "total_tiles": 10000,
      "painted_tiles": 1500,
      "unique_artists": 45,
      "total_likes": 2500
    }
  }
}
```

### 3. Get Canvas Region

**GET** `/canvas/{canvas_id}/region`

**Query Parameters:**
- `x_start`: integer (required)
- `y_start`: integer (required)
- `x_end`: integer (required)
- `y_end`: integer (required)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "region": {
      "x_start": 0,
      "y_start": 0,
      "x_end": 9,
      "y_end": 9,
      "tiles": [
        {
          "id": "uuid",
          "x_coordinate": 0,
          "y_coordinate": 0,
          "pixel_data": {
            "version": "1.0",
            "size": 32,
            "pixels": [[255, 0, 0, 255], "..."]
          },
          "is_painted": true,
          "like_count": 3,
          "owner_id": "uuid",
          "owner_username": "artist123"
        }
      ]
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid region coordinates
- `413 Payload Too Large`: Region too large (max 20x20 tiles)

## Tile Management Endpoints

### 1. Get Tile Details

**GET** `/tiles/{tile_id}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tile": {
      "id": "uuid",
      "canvas_id": "uuid",
      "x_coordinate": 10,
      "y_coordinate": 15,
      "pixel_data": {
        "version": "1.0",
        "size": 32,
        "pixels": [[255, 0, 0, 255], "..."]
      },
      "is_painted": true,
      "like_count": 5,
      "owner_id": "uuid",
      "owner_username": "artist123",
      "created_at": "2025-01-01T12:00:00Z",
      "last_painted_at": "2025-01-01T12:00:00Z"
    }
  }
}
```

### 2. Get Tile Neighbors

**GET** `/tiles/{tile_id}/neighbors`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "neighbors": [
      {
        "id": "uuid",
        "x_coordinate": 9,
        "y_coordinate": 14,
        "pixel_data": {
          "version": "1.0",
          "size": 32,
          "pixels": [[255, 0, 0, 255], "..."]
        },
        "is_painted": true,
        "like_count": 2,
        "owner_id": "uuid",
        "owner_username": "neighbor1"
      }
    ]
  }
}
```

### 3. Update Tile (Paint)

**PUT** `/tiles/{tile_id}/paint`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "pixel_data": {
    "version": "1.0",
    "size": 32,
    "pixels": [[255, 0, 0, 255], "..."],
    "tools_used": ["brush", "eraser"]
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tile": {
      "id": "uuid",
      "canvas_id": "uuid",
      "x_coordinate": 10,
      "y_coordinate": 15,
      "pixel_data": {
        "version": "1.0",
        "size": 32,
        "pixels": [[255, 0, 0, 255], "..."]
      },
      "is_painted": true,
      "like_count": 5,
      "last_painted_at": "2025-01-01T12:00:00Z"
    }
  }
}
```

**Error Responses:**
- `403 Forbidden`: User doesn't own this tile
- `400 Bad Request`: Invalid pixel data format
- `422 Unprocessable Entity`: Pixel data validation failed

### 4. Request New Tile

**POST** `/tiles/request`

**Headers:** `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "canvas_id": "uuid",
  "preferred_region": {
    "x_min": 0,
    "y_min": 0,
    "x_max": 50,
    "y_max": 50
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tile": {
      "id": "uuid",
      "canvas_id": "uuid",
      "x_coordinate": 25,
      "y_coordinate": 30,
      "is_painted": false,
      "assigned_at": "2025-01-01T12:00:00Z"
    }
  }
}
```

**Error Responses:**
- `402 Payment Required`: Insufficient points for new tile
- `404 Not Found`: No available tiles in preferred region

## Like System Endpoints

### 1. Like a Tile

**POST** `/tiles/{tile_id}/like`

**Headers:** `Authorization: Bearer <jwt_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "like": {
      "id": "uuid",
      "tile_id": "uuid",
      "user_id": "uuid",
      "created_at": "2025-01-01T12:00:00Z"
    },
    "tile": {
      "id": "uuid",
      "like_count": 6
    }
  }
}
```

**Error Responses:**
- `403 Forbidden`: Cannot like own tile
- `409 Conflict`: Already liked this tile
- `422 Unprocessable Entity`: Can only like neighboring tiles

### 2. Unlike a Tile

**DELETE** `/tiles/{tile_id}/like`

**Headers:** `Authorization: Bearer <jwt_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Like removed successfully",
    "tile": {
      "id": "uuid",
      "like_count": 5
    }
  }
}
```

### 3. Get Tile Likes

**GET** `/tiles/{tile_id}/likes`

**Query Parameters:**
- `page`: integer (default: 1)
- `limit`: integer (default: 20, max: 100)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "likes": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "username": "liker123",
        "created_at": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

## WebSocket API

### Connection

**URL**: `wss://api.pixelcanvas.com/v1/ws`

**Authentication**: JWT token in query parameter
```
wss://api.pixelcanvas.com/v1/ws?token=<jwt_token>
```

### Message Format

**Client to Server:**
```json
{
  "type": "subscribe",
  "payload": {
    "canvas_id": "uuid",
    "region": {
      "x_start": 0,
      "y_start": 0,
      "x_end": 50,
      "y_end": 50
    }
  }
}
```

**Server to Client:**
```json
{
  "type": "tile_updated",
  "payload": {
    "tile": {
      "id": "uuid",
      "canvas_id": "uuid",
      "x_coordinate": 25,
      "y_coordinate": 30,
      "pixel_data": {
        "version": "1.0",
        "size": 32,
        "pixels": [[255, 0, 0, 255], "..."]
      },
      "is_painted": true,
      "like_count": 3,
      "owner_username": "artist123"
    }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### WebSocket Events

#### Client Events

1. **subscribe**: Subscribe to canvas region updates
2. **unsubscribe**: Unsubscribe from canvas region updates
3. **ping**: Keep connection alive

#### Server Events

1. **tile_updated**: Tile was painted or modified
2. **tile_liked**: Tile received a new like
3. **user_joined**: New user joined canvas region
4. **user_left**: User left canvas region
5. **pong**: Response to ping

## Error Codes

### Authentication Errors
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Validation Errors
- `VALIDATION_ERROR`: Input validation failed
- `INVALID_FORMAT`: Invalid data format
- `MISSING_REQUIRED_FIELD`: Required field missing

### Business Logic Errors
- `INSUFFICIENT_POINTS`: Not enough points for action
- `TILE_NOT_OWNED`: User doesn't own the tile
- `ALREADY_LIKED`: Tile already liked by user
- `INVALID_NEIGHBOR`: Not a valid neighboring tile

### System Errors
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_SERVER_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

## Rate Limiting

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limits by Endpoint Category

- **Authentication**: 5 requests per minute
- **Canvas reading**: 100 requests per minute
- **Tile painting**: 10 requests per minute
- **Like actions**: 30 requests per minute
- **General API**: 60 requests per minute

## API Examples

### Complete User Flow Example

```bash
# 1. Register new user
curl -X POST https://api.pixelcanvas.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "artist123",
    "email": "artist@example.com",
    "password": "securepassword"
  }'

# 2. Get user profile
curl -X GET https://api.pixelcanvas.com/v1/users/profile \
  -H "Authorization: Bearer <jwt_token>"

# 3. Request a new tile
curl -X POST https://api.pixelcanvas.com/v1/tiles/request \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "canvas_id": "canvas-uuid",
    "preferred_region": {
      "x_min": 0,
      "y_min": 0,
      "x_max": 50,
      "y_max": 50
    }
  }'

# 4. Paint the tile
curl -X PUT https://api.pixelcanvas.com/v1/tiles/tile-uuid/paint \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pixel_data": {
      "version": "1.0",
      "size": 32,
      "pixels": [[255, 0, 0, 255], "..."]
    }
  }'

# 5. Like a neighboring tile
curl -X POST https://api.pixelcanvas.com/v1/tiles/neighbor-tile-uuid/like \
  -H "Authorization: Bearer <jwt_token>"
```

---

**Document Version**: 1.0  
**Created**: January 2025  
**Status**: Ready for UI/UX Design 