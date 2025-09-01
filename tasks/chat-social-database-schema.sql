-- ========================================================================
-- CHAT & SOCIAL FEATURES DATABASE SCHEMA EXTENSION
-- Extends existing artparty.social database with chat and social functionality
-- ========================================================================

-- ========================================================================
-- PHASE 1: CHAT ROOMS AND MESSAGING
-- ========================================================================

-- Chat Rooms Table - Canvas-specific and direct message rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('canvas', 'direct', 'global')),
    canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE, -- NULL for direct/global rooms
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT canvas_room_has_canvas CHECK (
        (room_type = 'canvas' AND canvas_id IS NOT NULL) OR 
        (room_type != 'canvas' AND canvas_id IS NULL)
    )
);

-- Chat Room Participants - Who has access to each room
CREATE TABLE chat_room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    
    -- Constraints
    CONSTRAINT unique_room_participant UNIQUE (room_id, user_id)
);

-- Chat Messages Table - All chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'tile_mention', 'canvas_mention')),
    
    -- Context references for tile/canvas mentions
    mentioned_tile_id UUID REFERENCES tiles(id) ON DELETE SET NULL,
    mentioned_canvas_id UUID REFERENCES canvas(id) ON DELETE SET NULL,
    mentioned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT message_not_empty CHECK (LENGTH(TRIM(message_text)) > 0),
    CONSTRAINT message_length CHECK (LENGTH(message_text) <= 2000)
);

-- ========================================================================
-- PHASE 1: USER PRESENCE AND ACTIVITY
-- ========================================================================

-- User Presence - Track who's online and where
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
    current_tile_x INTEGER,
    current_tile_y INTEGER,
    is_editing_tile BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    
    -- Constraints
    CONSTRAINT unique_user_presence UNIQUE (user_id),
    CONSTRAINT tile_coords_together CHECK (
        (current_tile_x IS NULL AND current_tile_y IS NULL) OR
        (current_tile_x IS NOT NULL AND current_tile_y IS NOT NULL)
    )
);

-- Activity Feed - Real-time user activity tracking
CREATE TABLE activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL CHECK (activity_type IN (
        'tile_created', 'tile_updated', 'canvas_joined', 'canvas_left',
        'chat_message', 'tile_liked', 'canvas_liked', 'user_followed'
    )),
    canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
    tile_id UUID REFERENCES tiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_data JSONB, -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Auto-cleanup: Activities older than 30 days
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- ========================================================================
-- PHASE 2: USER PROFILES AND DIRECT MESSAGES
-- ========================================================================

-- User Profiles - Extended user information
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_pixel_data JSONB, -- 32x32 pixel avatar data
    location VARCHAR(100),
    website VARCHAR(255),
    social_links JSONB, -- Twitter, Discord, etc.
    preferences JSONB, -- User preferences and settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_profile UNIQUE (user_id),
    CONSTRAINT bio_length CHECK (LENGTH(bio) <= 500),
    CONSTRAINT display_name_length CHECK (LENGTH(display_name) <= 100)
);

-- User Relationships - Following/Friends system
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'follow' CHECK (relationship_type IN ('follow', 'friend', 'block')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_relationship UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- ========================================================================
-- PHASE 3: SOCIAL INTERACTIONS
-- ========================================================================

-- Canvas Likes - Users can like entire canvases
CREATE TABLE canvas_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_canvas_like UNIQUE (canvas_id, user_id)
);

-- Canvas Comments - Comments on entire canvases
CREATE TABLE canvas_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id UUID NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT comment_not_empty CHECK (LENGTH(TRIM(comment_text)) > 0),
    CONSTRAINT comment_length CHECK (LENGTH(comment_text) <= 1000)
);

-- Tile Comments - Comments on specific tiles
CREATE TABLE tile_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tile_id UUID NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES tile_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT tile_comment_not_empty CHECK (LENGTH(TRIM(comment_text)) > 0),
    CONSTRAINT tile_comment_length CHECK (LENGTH(comment_text) <= 500)
);

-- ========================================================================
-- PHASE 4: MODERATION AND NOTIFICATIONS
-- ========================================================================

-- User Reports - Report inappropriate content or behavior
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    reported_tile_id UUID REFERENCES tiles(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
        'inappropriate_message', 'inappropriate_tile', 'harassment', 
        'spam', 'inappropriate_username', 'other'
    )),
    report_reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT report_has_target CHECK (
        reported_user_id IS NOT NULL OR 
        reported_message_id IS NOT NULL OR 
        reported_tile_id IS NOT NULL
    )
);

-- User Notifications - System notifications
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN (
        'chat_mention', 'tile_comment', 'canvas_comment', 'canvas_like',
        'new_follower', 'tile_like', 'system_announcement'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Context references
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    related_canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
    related_tile_id UUID REFERENCES tiles(id) ON DELETE CASCADE,
    related_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Auto-cleanup: Notifications older than 90 days
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days')
);

-- ========================================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================================

-- Chat Rooms Indexes
CREATE INDEX idx_chat_rooms_type ON chat_rooms(room_type);
CREATE INDEX idx_chat_rooms_canvas ON chat_rooms(canvas_id) WHERE room_type = 'canvas';
CREATE INDEX idx_chat_rooms_active ON chat_rooms(is_active);

-- Chat Room Participants Indexes
CREATE INDEX idx_room_participants_room ON chat_room_participants(room_id);
CREATE INDEX idx_room_participants_user ON chat_room_participants(user_id);
CREATE INDEX idx_room_participants_active ON chat_room_participants(is_active);

-- Chat Messages Indexes
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type);
CREATE INDEX idx_chat_messages_mentions ON chat_messages(mentioned_user_id) WHERE mentioned_user_id IS NOT NULL;

-- User Presence Indexes
CREATE INDEX idx_user_presence_canvas ON user_presence(canvas_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_activity ON user_presence(last_activity DESC);
CREATE INDEX idx_user_presence_editing ON user_presence(is_editing_tile) WHERE is_editing_tile = TRUE;

-- Activity Feed Indexes
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX idx_activity_feed_canvas ON activity_feed(canvas_id);
CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_expires ON activity_feed(expires_at);

-- User Profiles Indexes
CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);

-- User Relationships Indexes
CREATE INDEX idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX idx_user_relationships_following ON user_relationships(following_id);
CREATE INDEX idx_user_relationships_type ON user_relationships(relationship_type);

-- Canvas Likes Indexes
CREATE INDEX idx_canvas_likes_canvas ON canvas_likes(canvas_id);
CREATE INDEX idx_canvas_likes_user ON canvas_likes(user_id);
CREATE INDEX idx_canvas_likes_created ON canvas_likes(created_at DESC);

-- Canvas Comments Indexes
CREATE INDEX idx_canvas_comments_canvas ON canvas_comments(canvas_id);
CREATE INDEX idx_canvas_comments_user ON canvas_comments(user_id);
CREATE INDEX idx_canvas_comments_parent ON canvas_comments(parent_comment_id);
CREATE INDEX idx_canvas_comments_created ON canvas_comments(created_at DESC);

-- Tile Comments Indexes
CREATE INDEX idx_tile_comments_tile ON tile_comments(tile_id);
CREATE INDEX idx_tile_comments_user ON tile_comments(user_id);
CREATE INDEX idx_tile_comments_parent ON tile_comments(parent_comment_id);
CREATE INDEX idx_tile_comments_created ON tile_comments(created_at DESC);

-- User Reports Indexes
CREATE INDEX idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_type ON user_reports(report_type);
CREATE INDEX idx_user_reports_created ON user_reports(created_at DESC);

-- User Notifications Indexes
CREATE INDEX idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_user_notifications_created ON user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_expires ON user_notifications(expires_at);

-- ========================================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- ========================================================================

-- Function: Auto-create canvas chat room when canvas is created
CREATE OR REPLACE FUNCTION create_canvas_chat_room()
RETURNS TRIGGER AS $$
BEGIN
    -- Create canvas-specific chat room
    INSERT INTO chat_rooms (room_type, canvas_id, created_by)
    VALUES ('canvas', NEW.id, NEW.created_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-create canvas chat room
CREATE TRIGGER trigger_create_canvas_chat_room
    AFTER INSERT ON canvas
    FOR EACH ROW
    EXECUTE FUNCTION create_canvas_chat_room();

-- Function: Update chat room activity timestamp
CREATE OR REPLACE FUNCTION update_chat_room_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update room's updated_at timestamp
    UPDATE chat_rooms 
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.room_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update chat room activity on new messages
CREATE TRIGGER trigger_update_chat_room_activity
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_room_activity();

-- Function: Update canvas like count
CREATE OR REPLACE FUNCTION update_canvas_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE canvas 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.canvas_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE canvas 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.canvas_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update canvas activity on likes
CREATE TRIGGER trigger_update_canvas_like_count
    AFTER INSERT OR DELETE ON canvas_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_canvas_like_count();

-- Function: Create activity feed entries
CREATE OR REPLACE FUNCTION create_activity_feed_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Create activity entry based on trigger source
    IF TG_TABLE_NAME = 'tiles' AND TG_OP = 'UPDATE' AND OLD.is_painted = FALSE AND NEW.is_painted = TRUE THEN
        INSERT INTO activity_feed (user_id, activity_type, canvas_id, tile_id, activity_data)
        VALUES (NEW.owner_id, 'tile_created', NEW.canvas_id, NEW.id, 
                json_build_object('x', NEW.x_coordinate, 'y', NEW.y_coordinate));
    END IF;
    
    IF TG_TABLE_NAME = 'canvas_likes' AND TG_OP = 'INSERT' THEN
        INSERT INTO activity_feed (user_id, activity_type, canvas_id, activity_data)
        VALUES (NEW.user_id, 'canvas_liked', NEW.canvas_id, 
                json_build_object('action', 'liked'));
    END IF;
    
    IF TG_TABLE_NAME = 'user_relationships' AND TG_OP = 'INSERT' AND NEW.relationship_type = 'follow' THEN
        INSERT INTO activity_feed (user_id, activity_type, target_user_id, activity_data)
        VALUES (NEW.follower_id, 'user_followed', NEW.following_id, 
                json_build_object('action', 'followed'));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers: Create activity feed entries
CREATE TRIGGER trigger_activity_tile_created
    AFTER UPDATE ON tiles
    FOR EACH ROW
    EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER trigger_activity_canvas_liked
    AFTER INSERT ON canvas_likes
    FOR EACH ROW
    EXECUTE FUNCTION create_activity_feed_entry();

CREATE TRIGGER trigger_activity_user_followed
    AFTER INSERT ON user_relationships
    FOR EACH ROW
    EXECUTE FUNCTION create_activity_feed_entry();

-- ========================================================================
-- CLEANUP FUNCTIONS
-- ========================================================================

-- Function: Clean up expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Clean up expired activity feed entries
    DELETE FROM activity_feed WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean up expired notifications
    DELETE FROM user_notifications WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS cleaned_count = cleaned_count + ROW_COUNT;
    
    -- Clean up old user presence entries (offline for > 24 hours)
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_activity < (CURRENT_TIMESTAMP - INTERVAL '24 hours');
    GET DIAGNOSTICS cleaned_count = cleaned_count + ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- INITIAL DATA SETUP
-- ========================================================================

-- Create global chat room
INSERT INTO chat_rooms (room_type, created_by)
SELECT 'global', id FROM users WHERE username = 'admin' LIMIT 1;

-- Add all existing users to global chat room
INSERT INTO chat_room_participants (room_id, user_id)
SELECT gr.id, u.id
FROM chat_rooms gr, users u
WHERE gr.room_type = 'global';

-- Create canvas chat rooms for existing canvases
INSERT INTO chat_rooms (room_type, canvas_id, created_by)
SELECT 'canvas', c.id, u.id
FROM canvas c, users u
WHERE u.username = 'admin'
LIMIT (SELECT COUNT(*) FROM canvas);

-- ========================================================================
-- COMMON QUERIES FOR CHAT & SOCIAL FEATURES
-- ========================================================================

-- Get canvas chat room with recent messages
/*
SELECT 
    cr.id as room_id,
    cm.id as message_id,
    cm.message_text,
    cm.message_type,
    cm.created_at,
    u.username as sender_username,
    up.display_name as sender_display_name
FROM chat_rooms cr
JOIN chat_messages cm ON cr.id = cm.room_id
JOIN users u ON cm.sender_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE cr.canvas_id = $1 
    AND cr.room_type = 'canvas'
    AND cm.is_deleted = FALSE
ORDER BY cm.created_at DESC
LIMIT 50;
*/

-- Get user's unread message count
/*
SELECT COUNT(*) as unread_count
FROM chat_messages cm
JOIN chat_room_participants crp ON cm.room_id = crp.room_id
WHERE crp.user_id = $1 
    AND cm.created_at > crp.last_read_at
    AND cm.sender_id != $1
    AND cm.is_deleted = FALSE;
*/

-- Get canvas activity with user presence
/*
SELECT 
    up.user_id,
    u.username,
    prof.display_name,
    up.status,
    up.current_tile_x,
    up.current_tile_y,
    up.is_editing_tile,
    up.last_activity
FROM user_presence up
JOIN users u ON up.user_id = u.id
LEFT JOIN user_profiles prof ON u.id = prof.user_id
WHERE up.canvas_id = $1 
    AND up.status IN ('online', 'away')
ORDER BY up.last_activity DESC;
*/
