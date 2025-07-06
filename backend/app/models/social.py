from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class SocialProfile(Base):
    """Extended user profile for social features"""
    
    __tablename__ = "social_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    bio = Column(Text)
    website = Column(String(255))
    location = Column(String(100))
    avatar_tile_id = Column(Integer, ForeignKey("tiles.id"))
    profile_banner_id = Column(Integer, ForeignKey("tiles.id"))
    art_style_tags = Column(ARRAY(String))
    social_links = Column(JSON)
    follower_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="social_profile")
    avatar_tile = relationship("Tile", foreign_keys=[avatar_tile_id])
    banner_tile = relationship("Tile", foreign_keys=[profile_banner_id])


class Post(Base):
    """Social posts for sharing art and updates"""
    
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text)
    post_type = Column(String(50), default='text')  # 'text', 'art', 'tutorial', 'wip'
    featured_tile_id = Column(Integer, ForeignKey("tiles.id"))
    images = Column(JSON)  # Array of image URLs
    hashtags = Column(ARRAY(String))
    mentions = Column(ARRAY(Integer))  # Array of user IDs
    visibility = Column(String(20), default='public')  # 'public', 'followers', 'private'
    is_collaboration_open = Column(Boolean, default=False)
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="posts")
    featured_tile = relationship("Tile", foreign_keys=[featured_tile_id])
    likes = relationship("PostLike", back_populates="post")
    comments = relationship("PostComment", back_populates="post")
    shares = relationship("PostShare", back_populates="post")


class Follow(Base):
    """User following relationships"""
    
    __tablename__ = "follows"
    
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_id])
    following = relationship("User", foreign_keys=[following_id])


class PostLike(Base):
    """Likes on posts"""
    
    __tablename__ = "post_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="post_likes")
    post = relationship("Post", back_populates="likes")


class PostComment(Base):
    """Comments on posts"""
    
    __tablename__ = "post_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("post_comments.id"))
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="post_comments")
    post = relationship("Post", back_populates="comments")
    parent_comment = relationship("PostComment", remote_side=[id])
    replies = relationship("PostComment", back_populates="parent_comment")


class PostShare(Base):
    """Shares/reposts of posts"""
    
    __tablename__ = "post_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    share_comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="post_shares")
    post = relationship("Post", back_populates="shares")


class Community(Base):
    """Art communities/groups"""
    
    __tablename__ = "communities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    avatar_tile_id = Column(Integer, ForeignKey("tiles.id"))
    banner_tile_id = Column(Integer, ForeignKey("tiles.id"))
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    member_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    tags = Column(ARRAY(String))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="created_communities")
    avatar_tile = relationship("Tile", foreign_keys=[avatar_tile_id])
    banner_tile = relationship("Tile", foreign_keys=[banner_tile_id])
    members = relationship("CommunityMember", back_populates="community")


class CommunityMember(Base):
    """Community membership"""
    
    __tablename__ = "community_members"
    
    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), default='member')  # 'member', 'moderator', 'admin'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    community = relationship("Community", back_populates="members")
    user = relationship("User", back_populates="community_memberships")


class Notification(Base):
    """User notifications"""
    
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # 'like', 'comment', 'follow', 'mention', 'collaboration'
    actor_id = Column(Integer, ForeignKey("users.id"))
    target_type = Column(String(50))  # 'post', 'tile', 'user', 'community'
    target_id = Column(Integer)
    content = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id]) 