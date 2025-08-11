# Artparty.social

**A Collaborative Pixel Art Creation Platform**

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-green.svg)]()

---

## 🎨 About

Artparty.social is a real-time collaborative pixel art platform that brings artists together in shared creative spaces. Create, edit, and collaborate on pixel art projects with people from around the world.

### ✨ Features

- **Real-time Collaboration**: Work together on canvases with live updates
- **Tile-based System**: Organized creation with individual tile ownership
- **Advanced Editor**: Professional pixel art tools and color palettes
- **Community Features**: Share, discover, and appreciate artwork
- **Mobile Responsive**: Create on desktop, tablet, or mobile devices
- **Secure Authentication**: Protected user accounts and data

## 🚀 Technology Stack

### Frontend
- **JavaScript ES6+** - Modern web standards
- **HTML5 Canvas** - High-performance rendering
- **CSS3 Grid/Flexbox** - Responsive layouts
- **WebSocket** - Real-time communication
- **Progressive Web App** - Mobile-optimized experience

### Backend
- **Python 3.11+** - Modern Python features
- **FastAPI** - High-performance async API framework
- **SQLAlchemy** - Database ORM and migrations
- **PostgreSQL** - Reliable data storage
- **Redis** - Caching and session management
- **Docker** - Containerized deployment

## 📋 Requirements

### Development
- Python 3.11+
- Node.js 16+ (for build tools)
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose

### Production
- Docker environment
- SSL certificate
- Domain name
- Cloud storage (optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/stellarcollab.git
   cd stellarcollab
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Configure your .env file
   alembic upgrade head
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   # No build step required - pure vanilla JS
   ```

4. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d db redis
   
   # Run migrations
   cd backend
   alembic upgrade head
   ```

5. **Start Development Server**
   ```bash
   # Backend
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (serve static files)
   cd frontend
   python -m http.server 3000
   ```

### Production Deployment

1. **Configure Environment**
   ```bash
   cp deployment/production/.env.example deployment/production/.env
   # Update production environment variables
   ```

2. **Deploy with Docker**
   ```bash
   cd deployment/production
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 📝 API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🎯 Usage

1. **Register an Account**: Create your artist profile
2. **Explore Canvases**: Browse community creations
3. **Start Creating**: Join a canvas or create your own
4. **Collaborate**: Work with other artists in real-time
5. **Share & Discover**: Show off your creations

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 Legal

### Copyright
Copyright (c) 2025 Artparty.social. All rights reserved.

### License
This project is proprietary software. See the [LICENSE](LICENSE) file for details.

### Terms of Service
By using Artparty.social, you agree to our [Terms of Service](https://artparty.social/#terms).

### Privacy Policy
Your privacy is important to us. Read our [Privacy Policy](https://artparty.social/#privacy).

### User Content
- Users retain ownership of their original pixel art creations
- By using the platform, users grant Artparty.social necessary licenses to provide the service
- Community guidelines apply to all user-generated content

## 📞 Support

- **Email**: support@artparty.social
- **Legal**: legal@artparty.social
- **Business**: business@artparty.social

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Vanilla JS)  │◄──►│   (FastAPI)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────►│   WebSocket     │◄─────────────┘
                        │   (Real-time)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Redis Cache   │
                        │   (Sessions)    │
                        └─────────────────┘
```

## 🔒 Security

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Data Protection**: Encrypted data transmission and storage
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API abuse prevention
- **CSRF Protection**: Cross-site request forgery prevention

## 📈 Performance

- **Real-time Updates**: Sub-100ms collaboration latency
- **Scalable Architecture**: Horizontal scaling support
- **Caching Strategy**: Multi-layer caching for optimal performance
- **CDN Ready**: Static asset optimization
- **Database Optimization**: Indexed queries and connection pooling

---

**Made with ❤️ for the creative community**

Copyright (c) 2025 Artparty.social. All rights reserved.