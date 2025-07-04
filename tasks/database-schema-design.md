# Database Schema Design: Collaborative Pixel Canvas Game

## Overview

This document defines the database schema for the Collaborative Pixel Canvas Game, including all tables, relationships, indexes, and data types required to support user management, canvas operations, tile storage, and the points system.

## Database Technology

**Primary Database**: PostgreSQL 13+
- **Rationale**: ACID compliance, excellent performance, JSONB support for pixel data, strong indexing capabilities
- **Extensions**: uuid-ossp for UUID generation, btree_gin for composite indexes

## Schema Design Principles

1. **Normalization**: Properly normalized to reduce data redundancy
2. **Performance**: Optimized indexes for common query patterns
3. **Scalability**: Designed for horizontal partitioning when needed
4. **Consistency**: Foreign key constraints to maintain data integrity
5. **Flexibility**: JSONB for semi-structured data like pixel information

## Core Tables

### 1. Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    total_points INTEGER DEFAULT 0,
    tiles_owned INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_total_points ON users(total_points DESC);
```

### 2. Canvas Table

```sql
CREATE TABLE canvas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    width INTEGER NOT NULL DEFAULT 100,
    height INTEGER NOT NULL DEFAULT 100,
    tile_size INTEGER NOT NULL DEFAULT 32,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    total_tiles INTEGER GENERATED ALWAYS AS (width * height) STORED,
    
    -- Constraints
    CONSTRAINT canvas_dimensions CHECK (width > 0 AND height > 0),
    CONSTRAINT tile_size_valid CHECK (tile_size IN (16, 32, 64))
);

-- Indexes for canvas table
CREATE INDEX idx_canvas_active ON canvas(is_active);
CREATE INDEX idx_canvas_created_at ON canvas(created_at);
```

### 3. Tiles Table

```sql
CREATE TABLE tiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    x_coordinate INTEGER NOT NULL,
    y_coordinate INTEGER NOT NULL,
    pixel_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_painted_at TIMESTAMP WITH TIME ZONE,
    like_count INTEGER DEFAULT 0,
    is_painted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT tile_coordinates_positive CHECK (x_coordinate >= 0 AND y_coordinate >= 0),
    CONSTRAINT unique_tile_position UNIQUE (canvas_id, x_coordinate, y_coordinate)
);

-- Indexes for tiles table
CREATE INDEX idx_tiles_canvas_id ON tiles(canvas_id);
CREATE INDEX idx_tiles_owner_id ON tiles(owner_id);
CREATE INDEX idx_tiles_coordinates ON tiles(canvas_id, x_coordinate, y_coordinate);
CREATE INDEX idx_tiles_painted ON tiles(is_painted);
CREATE INDEX idx_tiles_like_count ON tiles(like_count DESC);
CREATE INDEX idx_tiles_updated_at ON tiles(updated_at);

-- Composite index for neighbor queries
CREATE INDEX idx_tiles_neighbors ON tiles(canvas_id, x_coordinate, y_coordinate) 
WHERE is_painted = TRUE;
```

### 4. Tile Likes Table

```sql
CREATE TABLE tile_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_tile_like UNIQUE (tile_id, user_id)
);

-- Indexes for tile_likes table
CREATE INDEX idx_tile_likes_tile_id ON tile_likes(tile_id);
CREATE INDEX idx_tile_likes_user_id ON tile_likes(user_id);
CREATE INDEX idx_tile_likes_created_at ON tile_likes(created_at);
```

### 5. User Points History Table

```sql
CREATE TABLE user_points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'tile_like', 'bonus', 'achievement'
    source_id UUID, -- Reference to the source (tile_id for likes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    
    -- Constraints
    CONSTRAINT points_earned_positive CHECK (points_earned > 0),
    CONSTRAINT valid_source_type CHECK (source_type IN ('tile_like', 'bonus', 'achievement'))
);

-- Indexes for user_points_history table
CREATE INDEX idx_points_history_user_id ON user_points_history(user_id);
CREATE INDEX idx_points_history_created_at ON user_points_history(created_at);
CREATE INDEX idx_points_history_source ON user_points_history(source_type, source_id);
```

### 6. User Sessions Table

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT session_token_length CHECK (LENGTH(session_token) >= 20)
);

-- Indexes for user_sessions table
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
```

### 7. Canvas Configuration Table

```sql
CREATE TABLE canvas_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_canvas_config UNIQUE (canvas_id, config_key)
);

-- Indexes for canvas_config table
CREATE INDEX idx_canvas_config_canvas_id ON canvas_config(canvas_id);
CREATE INDEX idx_canvas_config_key ON canvas_config(config_key);
```

## Pixel Data Storage Format

### JSONB Structure for Pixel Data

```json
{
  "version": "1.0",
  "size": 32,
  "pixels": [
    [255, 0, 0, 255],     // RGBA format: Red pixel
    [0, 255, 0, 255],     // Green pixel
    [0, 0, 255, 255],     // Blue pixel
    [0, 0, 0, 0]          // Transparent pixel
  ],
  "compressed": false,
  "created_at": "2025-01-01T12:00:00Z",
  "tools_used": ["brush", "eraser"]
}
```

### Alternative Compressed Format

```json
{
  "version": "1.1",
  "size": 32,
  "format": "rle",          // Run-length encoding
  "pixels": "R255,0,0,255x5;G0,255,0,255x3;...",
  "compressed": true,
  "compression_ratio": 0.3
}
```

## Relationships and Constraints

### Foreign Key Relationships

```sql
-- Tiles to Canvas (Many-to-One)
ALTER TABLE tiles ADD CONSTRAINT fk_tiles_canvas 
    FOREIGN KEY (canvas_id) REFERENCES canvas(id) ON DELETE CASCADE;

-- Tiles to Users (Many-to-One)
ALTER TABLE tiles ADD CONSTRAINT fk_tiles_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Tile Likes to Tiles (Many-to-One)
ALTER TABLE tile_likes ADD CONSTRAINT fk_likes_tile 
    FOREIGN KEY (tile_id) REFERENCES tiles(id) ON DELETE CASCADE;

-- Tile Likes to Users (Many-to-One)
ALTER TABLE tile_likes ADD CONSTRAINT fk_likes_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User Points History to Users (Many-to-One)
ALTER TABLE user_points_history ADD CONSTRAINT fk_points_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User Sessions to Users (Many-to-One)
ALTER TABLE user_sessions ADD CONSTRAINT fk_sessions_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Canvas Config to Canvas (Many-to-One)
ALTER TABLE canvas_config ADD CONSTRAINT fk_config_canvas 
    FOREIGN KEY (canvas_id) REFERENCES canvas(id) ON DELETE CASCADE;
```

## Database Functions and Triggers

### 1. Update User Points Function

```sql
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's total points when a new like is added
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET total_points = total_points + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT owner_id FROM tiles WHERE id = NEW.tile_id);
        
        -- Insert into points history
        INSERT INTO user_points_history (user_id, points_earned, source_type, source_id, description)
        SELECT owner_id, 1, 'tile_like', NEW.tile_id, 'Received like on tile'
        FROM tiles WHERE id = NEW.tile_id;
        
        RETURN NEW;
    END IF;
    
    -- Handle like removal
    IF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET total_points = total_points - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT owner_id FROM tiles WHERE id = OLD.tile_id);
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tile likes
CREATE TRIGGER trigger_update_user_points
    AFTER INSERT OR DELETE ON tile_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_points();
```

### 2. Update Tile Like Count Function

```sql
CREATE OR REPLACE FUNCTION update_tile_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tiles 
        SET like_count = like_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.tile_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE tiles 
        SET like_count = like_count - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.tile_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tile like count
CREATE TRIGGER trigger_update_tile_like_count
    AFTER INSERT OR DELETE ON tile_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_tile_like_count();
```

### 3. Update User Tiles Owned Function

```sql
CREATE OR REPLACE FUNCTION update_user_tiles_owned()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.owner_id IS NOT NULL THEN
        UPDATE users 
        SET tiles_owned = tiles_owned + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.owner_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Handle ownership changes
        IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
            -- Remove from old owner
            IF OLD.owner_id IS NOT NULL THEN
                UPDATE users 
                SET tiles_owned = tiles_owned - 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = OLD.owner_id;
            END IF;
            
            -- Add to new owner
            IF NEW.owner_id IS NOT NULL THEN
                UPDATE users 
                SET tiles_owned = tiles_owned + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.owner_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' AND OLD.owner_id IS NOT NULL THEN
        UPDATE users 
        SET tiles_owned = tiles_owned - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.owner_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user tiles owned
CREATE TRIGGER trigger_update_user_tiles_owned
    AFTER INSERT OR UPDATE OR DELETE ON tiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tiles_owned();
```

## Common Query Patterns

### 1. Get User Dashboard Data

```sql
SELECT 
    u.id,
    u.username,
    u.total_points,
    u.tiles_owned,
    u.created_at,
    u.last_login,
    COUNT(t.id) as painted_tiles,
    SUM(t.like_count) as total_likes_received
FROM users u
LEFT JOIN tiles t ON u.id = t.owner_id AND t.is_painted = TRUE
WHERE u.id = $1
GROUP BY u.id;
```

### 2. Get Canvas Region with Tiles

```sql
SELECT 
    t.id,
    t.x_coordinate,
    t.y_coordinate,
    t.pixel_data,
    t.is_painted,
    t.like_count,
    t.owner_id,
    u.username as owner_username
FROM tiles t
LEFT JOIN users u ON t.owner_id = u.id
WHERE t.canvas_id = $1 
    AND t.x_coordinate BETWEEN $2 AND $3
    AND t.y_coordinate BETWEEN $4 AND $5
ORDER BY t.x_coordinate, t.y_coordinate;
```

### 3. Get Neighboring Tiles

```sql
SELECT 
    t.id,
    t.x_coordinate,
    t.y_coordinate,
    t.pixel_data,
    t.is_painted,
    t.like_count,
    t.owner_id,
    u.username as owner_username
FROM tiles t
LEFT JOIN users u ON t.owner_id = u.id
WHERE t.canvas_id = $1 
    AND t.x_coordinate BETWEEN $2 - 1 AND $2 + 1
    AND t.y_coordinate BETWEEN $3 - 1 AND $3 + 1
    AND NOT (t.x_coordinate = $2 AND t.y_coordinate = $3)
    AND t.is_painted = TRUE
ORDER BY t.x_coordinate, t.y_coordinate;
```

### 4. Get User's Tiles

```sql
SELECT 
    t.id,
    t.canvas_id,
    t.x_coordinate,
    t.y_coordinate,
    t.pixel_data,
    t.is_painted,
    t.like_count,
    t.last_painted_at,
    c.name as canvas_name
FROM tiles t
JOIN canvas c ON t.canvas_id = c.id
WHERE t.owner_id = $1
ORDER BY t.last_painted_at DESC NULLS LAST;
```

### 5. Get Available Tiles for Assignment

```sql
SELECT 
    t.id,
    t.canvas_id,
    t.x_coordinate,
    t.y_coordinate
FROM tiles t
WHERE t.canvas_id = $1 
    AND t.owner_id IS NULL
    AND t.is_painted = FALSE
ORDER BY RANDOM()
LIMIT 1;
```

## Performance Optimization

### 1. Partitioning Strategy

```sql
-- Partition tiles table by canvas_id for large datasets
CREATE TABLE tiles_partitioned (
    LIKE tiles INCLUDING ALL
) PARTITION BY HASH (canvas_id);

-- Create partitions
CREATE TABLE tiles_partition_0 PARTITION OF tiles_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE tiles_partition_1 PARTITION OF tiles_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE tiles_partition_2 PARTITION OF tiles_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE tiles_partition_3 PARTITION OF tiles_partitioned
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### 2. Materialized Views

```sql
-- Materialized view for canvas statistics
CREATE MATERIALIZED VIEW canvas_stats AS
SELECT 
    c.id as canvas_id,
    c.name,
    COUNT(t.id) as total_tiles,
    COUNT(CASE WHEN t.is_painted THEN 1 END) as painted_tiles,
    COUNT(DISTINCT t.owner_id) as unique_artists,
    SUM(t.like_count) as total_likes,
    AVG(t.like_count) as avg_likes_per_tile,
    MAX(t.updated_at) as last_activity
FROM canvas c
LEFT JOIN tiles t ON c.id = t.canvas_id
GROUP BY c.id, c.name;

-- Refresh index
CREATE UNIQUE INDEX idx_canvas_stats_canvas_id ON canvas_stats(canvas_id);

-- Auto-refresh trigger (optional)
CREATE OR REPLACE FUNCTION refresh_canvas_stats()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY canvas_stats;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Database Migrations

### Initial Migration (001_initial_schema.sql)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables with indexes
-- (Include all CREATE TABLE statements from above)

-- Create all functions and triggers
-- (Include all function and trigger definitions from above)

-- Insert default canvas
INSERT INTO canvas (id, name, description, width, height, tile_size) 
VALUES (
    uuid_generate_v4(),
    'Main Canvas',
    'The primary collaborative canvas for all users',
    100,
    100,
    32
);

-- Create initial tiles for the canvas
INSERT INTO tiles (canvas_id, x_coordinate, y_coordinate)
SELECT 
    c.id,
    x.x_coord,
    y.y_coord
FROM canvas c
CROSS JOIN generate_series(0, 99) AS x(x_coord)
CROSS JOIN generate_series(0, 99) AS y(y_coord)
WHERE c.name = 'Main Canvas';
```

---

**Document Version**: 1.0  
**Created**: January 2025  
**Status**: Ready for API Design 