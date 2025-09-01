"""Add chat and social features tables

Revision ID: 25fd50d2f701
Revises: 20250809_backfill_canvas_defaults
Create Date: 2025-09-01 15:07:25.428180

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '25fd50d2f701'
down_revision = '20250809_backfill_canvas_defaults'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Chat Rooms Table
    op.create_table('chat_rooms',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('room_type', sa.VARCHAR(20), nullable=False),
        sa.Column('canvas_id', sa.INTEGER(), nullable=True),
        sa.Column('created_by', sa.INTEGER(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_active', sa.BOOLEAN(), nullable=True, server_default=sa.text('TRUE')),
        sa.CheckConstraint("room_type IN ('canvas', 'direct', 'global')", name='chat_rooms_room_type_check'),
        sa.ForeignKeyConstraint(['canvas_id'], ['canvases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Chat Room Participants Table
    op.create_table('chat_room_participants',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('room_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.INTEGER(), nullable=False),
        sa.Column('joined_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_read_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_active', sa.BOOLEAN(), nullable=True, server_default=sa.text('TRUE')),
        sa.Column('role', sa.VARCHAR(20), nullable=True, server_default=sa.text("'member'")),
        sa.ForeignKeyConstraint(['room_id'], ['chat_rooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Chat Messages Table
    op.create_table('chat_messages',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('room_id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.INTEGER(), nullable=False),
        sa.Column('message_text', sa.TEXT(), nullable=False),
        sa.Column('message_type', sa.VARCHAR(20), nullable=True, server_default=sa.text("'text'")),
        sa.Column('mentioned_tile_id', sa.INTEGER(), nullable=True),
        sa.Column('mentioned_canvas_id', sa.INTEGER(), nullable=True),
        sa.Column('mentioned_user_id', sa.INTEGER(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('edited_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.BOOLEAN(), nullable=True, server_default=sa.text('FALSE')),
        sa.ForeignKeyConstraint(['mentioned_canvas_id'], ['canvases.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['mentioned_tile_id'], ['tiles.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['mentioned_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['room_id'], ['chat_rooms.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # User Presence Table
    op.create_table('user_presence',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', sa.INTEGER(), nullable=False),
        sa.Column('canvas_id', sa.INTEGER(), nullable=True),
        sa.Column('status', sa.VARCHAR(20), nullable=True, server_default=sa.text("'online'")),
        sa.Column('current_tile_x', sa.INTEGER(), nullable=True),
        sa.Column('current_tile_y', sa.INTEGER(), nullable=True),
        sa.Column('is_editing_tile', sa.BOOLEAN(), nullable=True, server_default=sa.text('FALSE')),
        sa.Column('last_activity', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('session_id', sa.VARCHAR(255), nullable=True),
        sa.ForeignKeyConstraint(['canvas_id'], ['canvases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    
    # Activity Feed Table
    op.create_table('activity_feed',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', sa.INTEGER(), nullable=False),
        sa.Column('activity_type', sa.VARCHAR(30), nullable=False),
        sa.Column('canvas_id', sa.INTEGER(), nullable=True),
        sa.Column('tile_id', sa.INTEGER(), nullable=True),
        sa.Column('target_user_id', sa.INTEGER(), nullable=True),
        sa.Column('activity_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=True, server_default=sa.text("(CURRENT_TIMESTAMP + INTERVAL '30 days')")),
        sa.ForeignKeyConstraint(['canvas_id'], ['canvases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tile_id'], ['tiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('idx_chat_rooms_canvas_id', 'chat_rooms', ['canvas_id'])
    op.create_index('idx_chat_rooms_type', 'chat_rooms', ['room_type'])
    op.create_index('idx_chat_rooms_active', 'chat_rooms', ['is_active'])
    
    op.create_index('idx_chat_participants_room_id', 'chat_room_participants', ['room_id'])
    op.create_index('idx_chat_participants_user_id', 'chat_room_participants', ['user_id'])
    
    op.create_index('idx_chat_messages_room_id', 'chat_messages', ['room_id'])
    op.create_index('idx_chat_messages_sender_id', 'chat_messages', ['sender_id'])
    op.create_index('idx_chat_messages_created_at', 'chat_messages', ['created_at'])
    
    op.create_index('idx_user_presence_user_id', 'user_presence', ['user_id'])
    op.create_index('idx_user_presence_canvas_id', 'user_presence', ['canvas_id'])
    op.create_index('idx_user_presence_activity', 'user_presence', ['last_activity'])
    
    op.create_index('idx_activity_feed_user_id', 'activity_feed', ['user_id'])
    op.create_index('idx_activity_feed_type', 'activity_feed', ['activity_type'])
    op.create_index('idx_activity_feed_created_at', 'activity_feed', ['created_at'])
    
    # Add constraints
    op.execute("""
        ALTER TABLE chat_rooms 
        ADD CONSTRAINT check_canvas_room_has_canvas 
        CHECK (
            (room_type = 'canvas' AND canvas_id IS NOT NULL) OR 
            (room_type != 'canvas')
        )
    """)
    
    op.execute("""
        ALTER TABLE chat_rooms 
        ADD CONSTRAINT check_direct_room_no_canvas 
        CHECK (
            (room_type = 'direct' AND canvas_id IS NULL) OR 
            (room_type != 'direct')
        )
    """)
    
    # Create initial data
    op.execute("""
        INSERT INTO chat_rooms (room_type, created_by)
        SELECT 'global', 1
        WHERE NOT EXISTS (
            SELECT 1 FROM chat_rooms WHERE room_type = 'global'
        )
    """)
    
    op.execute("""
        INSERT INTO chat_rooms (room_type, canvas_id, created_by)
        SELECT 'canvas', c.id, COALESCE(c.creator_id, 1)
        FROM canvases c
        WHERE c.is_active = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM chat_rooms cr 
            WHERE cr.canvas_id = c.id AND cr.room_type = 'canvas'
        )
    """)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_activity_feed_created_at', table_name='activity_feed')
    op.drop_index('idx_activity_feed_type', table_name='activity_feed')
    op.drop_index('idx_activity_feed_user_id', table_name='activity_feed')
    op.drop_index('idx_user_presence_activity', table_name='user_presence')
    op.drop_index('idx_user_presence_canvas_id', table_name='user_presence')
    op.drop_index('idx_user_presence_user_id', table_name='user_presence')
    op.drop_index('idx_chat_messages_created_at', table_name='chat_messages')
    op.drop_index('idx_chat_messages_sender_id', table_name='chat_messages')
    op.drop_index('idx_chat_messages_room_id', table_name='chat_messages')
    op.drop_index('idx_chat_participants_user_id', table_name='chat_room_participants')
    op.drop_index('idx_chat_participants_room_id', table_name='chat_room_participants')
    op.drop_index('idx_chat_rooms_active', table_name='chat_rooms')
    op.drop_index('idx_chat_rooms_type', table_name='chat_rooms')
    op.drop_index('idx_chat_rooms_canvas_id', table_name='chat_rooms')
    
    # Drop tables in reverse order
    op.drop_table('activity_feed')
    op.drop_table('user_presence')
    op.drop_table('chat_messages')
    op.drop_table('chat_room_participants')
    op.drop_table('chat_rooms')