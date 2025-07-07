# 🌐 StellarArtCollab Social Networking Features Plan

## 🎯 Overview
Transform StellarArtCollab into a social art platform with Twitter-like features, focused on pixel art community building and sharing.

## 🚀 Core Social Features

### 1. **Artist Profiles & Social Identity**
- **Extended User Profiles**
  - Profile pictures (pixel art avatars)
  - Bio/artist statement
  - Location & website links
  - Art style tags
  - Portfolio showcase
  - Social stats (followers, following, likes received)

### 2. **Social Feed & Timeline**
- **Personal Timeline**
  - See posts from followed artists
  - Algorithmic and chronological sorting
  - Filter by content type (art, updates, tutorials)
  
- **Global Art Feed**
  - Discover new artists and art
  - Trending pixel art
  - Featured creations
  - Category filtering

### 3. **Posts & Content Sharing**
- **Art Posts**
  - Share completed pixel art with descriptions
  - Work-in-progress updates
  - Tutorial posts with step-by-step images
  - Art challenges and prompts
  
- **Social Posts**
  - Text updates about art journey
  - Behind-the-scenes content
  - Art tips and techniques
  - Community discussions

### 4. **Social Interactions**
- **Following System**
  - Follow/unfollow artists
  - Mutual following indicators
  - Follow recommendations
  
- **Engagement Features**
  - Like posts and artwork
  - Comment on posts
  - Share/repost artwork
  - Bookmark favorite pieces
  
- **Collaborative Features**
  - Invite artists to collaborate on canvases
  - Art collaboration requests
  - Mentorship connections

### 5. **Discovery & Search**
- **Artist Discovery**
  - Suggested artists based on interests
  - "Artists you might like" recommendations
  - Featured artist spotlights
  
- **Content Discovery**
  - Hashtag system for art styles/themes
  - Search by technique, color palette, theme
  - Trending hashtags
  - Art challenges and contests

### 6. **Community Features**
- **Art Communities/Groups**
  - Create/join art communities
  - Community challenges
  - Group canvases
  - Community events
  
- **Messaging System**
  - Direct messages between artists
  - Group chat for collaborations
  - Art critique exchanges

## 🗄️ Database Schema Extensions

### New Tables Needed

#### 1. **Social Profiles**
```sql
CREATE TABLE social_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    bio TEXT,
    website VARCHAR(255),
    location VARCHAR(100),
    avatar_tile_id INTEGER REFERENCES tiles(id),
    profile_banner_id INTEGER REFERENCES tiles(id),
    art_style_tags TEXT[],
    social_links JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **Posts**
```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT,
    post_type VARCHAR(50) DEFAULT 'text', -- 'text', 'art', 'tutorial', 'wip'
    featured_tile_id INTEGER REFERENCES tiles(id),
    images JSONB, -- Array of image URLs
    hashtags TEXT[],
    mentions INTEGER[], -- Array of user IDs
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers', 'private'
    is_collaboration_open BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **Social Relationships**
```sql
CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER REFERENCES users(id),
    following_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);
```

#### 4. **Post Interactions**
```sql
CREATE TABLE post_likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

CREATE TABLE post_comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    content TEXT NOT NULL,
    parent_comment_id INTEGER REFERENCES post_comments(id),
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_shares (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    share_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. **Communities**
```sql
CREATE TABLE communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_tile_id INTEGER REFERENCES tiles(id),
    banner_tile_id INTEGER REFERENCES tiles(id),
    creator_id INTEGER REFERENCES users(id),
    member_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE community_members (
    id SERIAL PRIMARY KEY,
    community_id INTEGER REFERENCES communities(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member', -- 'member', 'moderator', 'admin'
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);
```

#### 6. **Messaging System**
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    is_group BOOLEAN DEFAULT FALSE,
    name VARCHAR(100), -- For group chats
    created_by INTEGER REFERENCES users(id),
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    sender_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'art'
    attachment_data JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. **Notifications**
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'follow', 'mention', 'collaboration'
    actor_id INTEGER REFERENCES users(id),
    target_type VARCHAR(50), -- 'post', 'tile', 'user', 'community'
    target_id INTEGER,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 📱 Frontend Components Needed

### 1. **Social Feed Components**
- Timeline component
- Post composer
- Post card with interactions
- Comment system
- Share modal

### 2. **Profile Components**
- Profile header with stats
- Profile editor
- Portfolio gallery
- Following/followers lists

### 3. **Discovery Components**
- Artist discovery cards
- Search interface
- Trending hashtags
- Featured content

### 4. **Community Components**
- Community browser
- Community profile pages
- Member management
- Community posts

### 5. **Messaging Components**
- Message inbox
- Chat interface
- Conversation list
- Group chat management

## 🔧 API Endpoints Needed

### Social Feed
- `GET /api/v1/social/feed` - Get user's timeline
- `GET /api/v1/social/discover` - Get discovery feed
- `POST /api/v1/social/posts` - Create new post
- `GET /api/v1/social/posts/{post_id}` - Get post details
- `PUT /api/v1/social/posts/{post_id}` - Update post
- `DELETE /api/v1/social/posts/{post_id}` - Delete post

### Social Interactions
- `POST /api/v1/social/posts/{post_id}/like` - Like/unlike post
- `POST /api/v1/social/posts/{post_id}/comments` - Add comment
- `GET /api/v1/social/posts/{post_id}/comments` - Get comments
- `POST /api/v1/social/posts/{post_id}/share` - Share post

### User Relationships
- `POST /api/v1/social/follow/{user_id}` - Follow/unfollow user
- `GET /api/v1/social/followers/{user_id}` - Get followers
- `GET /api/v1/social/following/{user_id}` - Get following
- `GET /api/v1/social/suggestions` - Get follow suggestions

### Communities
- `GET /api/v1/communities` - List communities
- `POST /api/v1/communities` - Create community
- `GET /api/v1/communities/{community_id}` - Get community details
- `POST /api/v1/communities/{community_id}/join` - Join community
- `POST /api/v1/communities/{community_id}/posts` - Create community post

### Messaging
- `GET /api/v1/messages/conversations` - Get user's conversations
- `POST /api/v1/messages/conversations` - Create conversation
- `GET /api/v1/messages/conversations/{id}/messages` - Get messages
- `POST /api/v1/messages/conversations/{id}/messages` - Send message

## 📊 Implementation Phases

### Phase 1: Core Social Features (MVP)
- Extended user profiles
- Basic posting system
- Follow/unfollow functionality
- Like and comment system
- Simple feed algorithm

### Phase 2: Discovery & Engagement
- Hashtag system
- Search functionality
- Trending content
- Notification system
- Share functionality

### Phase 3: Communities & Collaboration
- Community creation and management
- Group canvases
- Collaboration requests
- Community events

### Phase 4: Advanced Features
- Direct messaging
- Advanced recommendations
- Art challenges/contests
- Mentorship system
- Analytics dashboard

## 🎨 Design Considerations

### User Experience
- Keep the pixel art aesthetic
- Maintain focus on art creation
- Seamless integration with existing canvas features
- Mobile-responsive design

### Performance
- Efficient feed loading with pagination
- Image optimization for art sharing
- Real-time updates for social interactions
- Caching strategies for popular content

### Privacy & Safety
- Content moderation tools
- User blocking/reporting
- Privacy settings for posts
- Safe community guidelines

## 🔮 Future Enhancements

- **AI-powered recommendations**
- **Virtual galleries and exhibitions**
- **NFT integration for art monetization**
- **Live streaming of art creation**
- **Advanced analytics for artists**
- **Mobile app development**

---

This plan provides a comprehensive roadmap for transforming StellarArtCollab into a thriving social art platform while maintaining its core collaborative pixel art focus. 