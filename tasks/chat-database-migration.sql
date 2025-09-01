-- ========================================================================
-- CHAT & SOCIAL FEATURES DATABASE MIGRATION
-- Migration script to add chat and social features to existing database
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================================
-- PHASE 1: CHAT ROOMS AND MESSAGING
-- ========================================================================

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('canvas', 'direct', 'global')),
    canvas_id INTEGER REFERENCES canvases(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Chat Room Participants Table
CREATE TABLE IF NOT EXISTS chat_room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'member'
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    mentioned_tile_id INTEGER REFERENCES tiles(id) ON DELETE SET NULL,
    mentioned_canvas_id INTEGER REFERENCES canvases(id) ON DELETE SET NULL,
    mentioned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- User Presence Table
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    canvas_id INTEGER REFERENCES canvases(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'online',
    current_tile_x INTEGER,
    current_tile_y INTEGER,
    is_editing_tile BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255)
);

-- Activity Feed Table
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(30) NOT NULL,
    canvas_id INTEGER REFERENCES canvases(id) ON DELETE CASCADE,
    tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- ========================================================================
-- PHASE 2: USER PROFILES AND RELATIONSHIPS
-- ========================================================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_pixel_data JSONB,
    location VARCHAR(100),
    website VARCHAR(255),
    social_links JSONB,
    preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Relationships Table
CREATE TABLE IF NOT EXISTS user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'follow',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- ========================================================================
-- PHASE 3: SOCIAL INTERACTIONS
-- ========================================================================

-- Canvas Likes Table
CREATE TABLE IF NOT EXISTS canvas_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(canvas_id, user_id)
);

-- Canvas Comments Table
CREATE TABLE IF NOT EXISTS canvas_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canvas_id INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES canvas_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0
);

-- Tile Comments Table
CREATE TABLE IF NOT EXISTS tile_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tile_id INTEGER NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    parent_comment_id UUID REFERENCES tile_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0
);

-- ========================================================================
-- PHASE 4: MODERATION AND NOTIFICATIONS
-- ========================================================================

-- User Reports Table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    reported_tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    report_type VARCHAR(30) NOT NULL,
    report_reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    related_canvas_id INTEGER REFERENCES canvases(id) ON DELETE CASCADE,
    related_tile_id INTEGER REFERENCES tiles(id) ON DELETE CASCADE,
    related_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days')
);

-- ========================================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================================

-- Chat room indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_canvas_id ON chat_rooms(canvas_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(is_active);

-- Chat room participants indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_active ON chat_room_participants(is_active);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_deleted ON chat_messages(is_deleted);
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentioned_user ON chat_messages(mentioned_user_id);

-- User presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_canvas_id ON user_presence(canvas_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_editing ON user_presence(is_editing_tile);
CREATE INDEX IF NOT EXISTS idx_user_presence_activity ON user_presence(last_activity);

-- Activity feed indexes
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_canvas_id ON activity_feed(canvas_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_feed_expires_at ON activity_feed(expires_at);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- User relationships indexes
CREATE INDEX IF NOT EXISTS idx_user_relationships_follower ON user_relationships(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_following ON user_relationships(following_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_type ON user_relationships(relationship_type);

-- Canvas likes indexes
CREATE INDEX IF NOT EXISTS idx_canvas_likes_canvas_id ON canvas_likes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_likes_user_id ON canvas_likes(user_id);

-- Canvas comments indexes
CREATE INDEX IF NOT EXISTS idx_canvas_comments_canvas_id ON canvas_comments(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_user_id ON canvas_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_created_at ON canvas_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_canvas_comments_parent ON canvas_comments(parent_comment_id);

-- Tile comments indexes
CREATE INDEX IF NOT EXISTS idx_tile_comments_tile_id ON tile_comments(tile_id);
CREATE INDEX IF NOT EXISTS idx_tile_comments_user_id ON tile_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tile_comments_created_at ON tile_comments(created_at);

-- User reports indexes
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);

-- User notifications indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires_at ON user_notifications(expires_at);

-- ========================================================================
-- FUNCTIONS AND TRIGGERS
-- ========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_comments_updated_at BEFORE UPDATE ON canvas_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tile_comments_updated_at BEFORE UPDATE ON tile_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired activity feed entries
CREATE OR REPLACE FUNCTION cleanup_expired_activity_feed()
RETURNS void AS $$
BEGIN
    DELETE FROM activity_feed WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM user_notifications WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create canvas chat room when canvas is created
CREATE OR REPLACE FUNCTION create_canvas_chat_room()
RETURNS TRIGGER AS $$
BEGIN
    -- Create chat room for new canvas
    INSERT INTO chat_rooms (room_type, canvas_id, created_by)
    VALUES ('canvas', NEW.id, COALESCE(NEW.creator_id, 1));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create canvas chat room
CREATE TRIGGER create_canvas_chat_room_trigger
    AFTER INSERT ON canvases
    FOR EACH ROW
    EXECUTE FUNCTION create_canvas_chat_room();

-- Function to update user tile counts when messages are sent
CREATE OR REPLACE FUNCTION update_user_activity_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Create activity feed entry for chat message
    IF NEW.message_type != 'system' THEN
        INSERT INTO activity_feed (user_id, activity_type, canvas_id, activity_data)
        SELECT 
            NEW.sender_id,
            'chat_message',
            cr.canvas_id,
            jsonb_build_object(
                'message_preview', LEFT(NEW.message_text, 100),
                'message_type', NEW.message_type,
                'room_type', cr.room_type
            )
        FROM chat_rooms cr
        WHERE cr.id = NEW.room_id AND cr.canvas_id IS NOT NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity feed entries for chat messages
CREATE TRIGGER update_user_activity_on_message_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_activity_on_message();

-- ========================================================================
-- DATA CONSTRAINTS AND VALIDATION
-- ========================================================================

-- Ensure canvas rooms have canvas_id
ALTER TABLE chat_rooms 
ADD CONSTRAINT check_canvas_room_has_canvas 
CHECK (
    (room_type = 'canvas' AND canvas_id IS NOT NULL) OR 
    (room_type != 'canvas')
);

-- Ensure direct message rooms don't have canvas_id
ALTER TABLE chat_rooms 
ADD CONSTRAINT check_direct_room_no_canvas 
CHECK (
    (room_type = 'direct' AND canvas_id IS NULL) OR 
    (room_type != 'direct')
);

-- Ensure tile coordinates are valid
ALTER TABLE user_presence 
ADD CONSTRAINT check_tile_coordinates 
CHECK (
    (current_tile_x IS NULL AND current_tile_y IS NULL) OR
    (current_tile_x >= 0 AND current_tile_x < 1000 AND 
     current_tile_y >= 0 AND current_tile_y < 1000)
);

-- Ensure users can't follow themselves
ALTER TABLE user_relationships 
ADD CONSTRAINT check_no_self_follow 
CHECK (follower_id != following_id);

-- ========================================================================
-- INITIAL DATA SETUP
-- ========================================================================

-- Create global chat room if it doesn't exist
INSERT INTO chat_rooms (room_type, created_by)
SELECT 'global', 1
WHERE NOT EXISTS (
    SELECT 1 FROM chat_rooms WHERE room_type = 'global'
);

-- Create canvas chat rooms for existing canvases
INSERT INTO chat_rooms (room_type, canvas_id, created_by)
SELECT 'canvas', c.id, COALESCE(c.creator_id, 1)
FROM canvases c
WHERE c.is_active = TRUE
AND NOT EXISTS (
    SELECT 1 FROM chat_rooms cr 
    WHERE cr.canvas_id = c.id AND cr.room_type = 'canvas'
);

-- Create user profiles for existing users
INSERT INTO user_profiles (user_id, display_name)
SELECT u.id, CONCAT(u.first_name, ' ', u.last_name)
FROM users u
WHERE u.is_active = TRUE
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
);

-- ========================================================================
-- CLEANUP PROCEDURES
-- ========================================================================

-- Create cleanup procedure for old data
CREATE OR REPLACE FUNCTION perform_chat_maintenance()
RETURNS void AS $$
BEGIN
    -- Clean up expired activity feed entries
    PERFORM cleanup_expired_activity_feed();
    
    -- Clean up expired notifications
    PERFORM cleanup_expired_notifications();
    
    -- Clean up old offline user presence (older than 7 days)
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_activity < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Update statistics
    RAISE NOTICE 'Chat maintenance completed at %', CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PERMISSIONS AND SECURITY
-- ========================================================================

-- Grant necessary permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify tables were created
SELECT 
    table_name,
    column_count
FROM (
    SELECT 
        table_name,
        COUNT(*) as column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'chat_rooms', 'chat_room_participants', 'chat_messages',
        'user_presence', 'activity_feed', 'user_profiles',
        'user_relationships', 'canvas_likes', 'canvas_comments',
        'tile_comments', 'user_reports', 'user_notifications'
    )
    GROUP BY table_name
) t
ORDER BY table_name;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
    indexname LIKE 'idx_chat_%' OR
    indexname LIKE 'idx_user_presence_%' OR
    indexname LIKE 'idx_activity_%' OR
    indexname LIKE 'idx_user_profiles_%' OR
    indexname LIKE 'idx_user_relationships_%' OR
    indexname LIKE 'idx_canvas_likes_%' OR
    indexname LIKE 'idx_canvas_comments_%' OR
    indexname LIKE 'idx_tile_comments_%' OR
    indexname LIKE 'idx_user_reports_%' OR
    indexname LIKE 'idx_user_notifications_%'
)
ORDER BY tablename, indexname;

-- Test basic functionality
SELECT 'Migration completed successfully' as status;
