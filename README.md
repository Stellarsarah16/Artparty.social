# 🎨 StellarCollabApp - Collaborative Pixel Canvas Game

> **Create, Share, and Collaborate on Pixel Art in Real-Time!**

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue.svg)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Development](https://img.shields.io/badge/Status-Active%20Development-brightgreen.svg)](https://github.com)

## 🌟 **What is StellarCollabApp?**

StellarCollabApp is a **real-time collaborative pixel art platform** where artists can create, share, and discover amazing 32x32 pixel art tiles on shared canvases. Think of it as a digital art gallery where every pixel tells a story and every tile is a masterpiece waiting to happen!

### ✨ **Key Features**

🎯 **Positive-Only Community** - Only likes, no dislikes! Create a supportive environment for artists  
🎨 **32x32 Pixel Art Creation** - Perfect size for detailed pixel art with JSON-based pixel data  
🔄 **Real-Time Collaboration** - See other artists' work appear live on shared canvases  
🏆 **Artist Recognition** - Track your tiles created, likes received, and community impact  
🛡️ **Secure Authentication** - JWT-based auth with user profiles and statistics  
📊 **Canvas Management** - Create custom canvases with configurable dimensions and user limits  
🎮 **Gamified Experience** - User stats, like counts, and collaborative achievements  

## 🚀 **Current Development Status**

**Backend Core: 44% Complete (7/16 major systems)** ✅

### ✅ **Completed Systems**
- 🔐 **Authentication & User Management** - Full JWT auth, user profiles, stats
- 🎨 **Canvas Management** - Create, manage, and explore collaborative canvases  
- 🖼️ **Pixel Art Tile System** - 32x32 tile creation with validation and ownership
- 👍 **Positive Feedback System** - Like/unlike functionality with statistics
- 🗄️ **Database Architecture** - Complete SQLAlchemy models and relationships
- 📡 **RESTful API** - 30+ endpoints with full CRUD operations

### 🔄 **In Development**
- 🌐 **WebSocket Real-time Updates** - Live collaboration features
- 💻 **Frontend Interface** - Modern web UI for pixel art creation
- 🎭 **Pixel Art Editor** - Interactive 32x32 canvas with color palettes
- ✨ **UI/UX Polish** - Beautiful, responsive design

## 🛠️ **Technology Stack**

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - SQL toolkit and ORM for database operations  
- **Pydantic** - Data validation using Python type annotations
- **JWT** - Secure token-based authentication
- **SQLite** - Lightweight database (easily upgradeable to PostgreSQL)
- **Uvicorn** - ASGI server for production deployment

### Frontend (Planned)
- **HTML5 Canvas** - For pixel art rendering and editing
- **Vanilla JavaScript** - Lightweight, fast, and reliable
- **WebSocket** - Real-time communication
- **CSS3** - Modern styling and animations

## 🏃‍♂️ **Quick Start**

### Prerequisites
- Python 3.12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/StellarCollabApp.git
cd StellarCollabApp
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux  
source venv/bin/activate

pip install -r requirements.txt
```

3. **Initialize the database**
```bash
python init_db.py
```

4. **Start the development server**
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. **Explore the API**
- 🌐 **API Documentation**: http://127.0.0.1:8000/docs
- 🔍 **Health Check**: http://127.0.0.1:8000/health
- 📚 **ReDoc**: http://127.0.0.1:8000/redoc

## 📖 **API Endpoints Overview**

### 🔐 Authentication (`/api/v1/auth`)
- `POST /register` - Create new user account
- `POST /login` - User authentication  
- `GET /me` - Get current user info
- `POST /refresh` - Refresh JWT token
- `POST /logout` - User logout

### 👤 User Management (`/api/v1/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile info
- `PUT /password` - Change password
- `GET /stats` - User statistics
- `GET /{user_id}` - Public user profile
- `DELETE /account` - Delete account

### 🎨 Canvas Management (`/api/v1/canvas`)
- `GET /` - List all canvases
- `POST /` - Create new canvas
- `GET /{id}` - Get canvas with tiles
- `PUT /{id}` - Update canvas
- `DELETE /{id}` - Delete canvas
- `GET /{id}/region` - Get canvas region
- `GET /{id}/stats` - Canvas statistics

### 🖼️ Tile Management (`/api/v1/tiles`)
- `POST /` - Create pixel art tile
- `GET /{id}` - Get tile details
- `PUT /{id}` - Update tile (owner only)
- `DELETE /{id}` - Delete tile (owner only)
- `GET /{id}/neighbors` - Get surrounding tiles
- `GET /canvas/{id}` - Get canvas tiles
- `GET /canvas/{id}/position` - Get tile at position
- `GET /user/{id}` - Get user's tiles

### 👍 Like System (`/api/v1/tiles`)
- `POST /{id}/like` - Like a tile
- `DELETE /{id}/like` - Unlike a tile  
- `GET /{id}/likes` - Get tile likes
- `GET /{id}/like-stats` - Like statistics

## 🎮 **How to Use**

### 1. **Create an Account**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "artist123", "email": "artist@example.com", "password": "securepass123"}'
```

### 2. **Create a Canvas**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/canvas/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Art Canvas", "description": "A collaborative space", "width": 1024, "height": 1024}'
```

### 3. **Create Pixel Art**
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/tiles/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"canvas_id": 1, "x": 0, "y": 0, "pixel_data": "[[\"#FF0000\", ...], ...]", "title": "My First Pixel Art"}'
```

## 🤝 **Contributing**

We welcome contributions! Here's how you can help:

1. **🐛 Report bugs** - Found an issue? Let us know!
2. **✨ Suggest features** - Have ideas? We'd love to hear them!
3. **🔧 Submit PRs** - Code contributions are always welcome!
4. **📖 Improve docs** - Help make our documentation better!

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🗺️ **Roadmap**

### Phase 1: Backend Foundation ✅ **COMPLETE**
- [x] Authentication system
- [x] User management  
- [x] Canvas CRUD operations
- [x] Tile management system
- [x] Like/feedback system

### Phase 2: Real-time Features 🔄 **IN PROGRESS**
- [ ] WebSocket implementation
- [ ] Live canvas updates
- [ ] Real-time collaboration

### Phase 3: Frontend Development 📋 **PLANNED**
- [ ] Pixel art editor interface
- [ ] Canvas viewer
- [ ] User dashboard
- [ ] Responsive design

### Phase 4: Enhanced Features 🔮 **FUTURE**
- [ ] Advanced pixel art tools
- [ ] Canvas themes/templates
- [ ] User achievements
- [ ] Export functionality
- [ ] Mobile app

## 📊 **Project Statistics**

- **API Endpoints**: 30+ fully functional
- **Database Tables**: 4 core models (Users, Canvases, Tiles, Likes)
- **Authentication**: JWT-based with secure token handling
- **Validation**: Comprehensive input validation with Pydantic
- **Testing**: Health checks and API validation
- **Documentation**: Interactive API docs with Swagger UI

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- FastAPI team for the amazing framework
- SQLAlchemy for robust ORM capabilities  
- Pydantic for excellent data validation
- The pixel art community for inspiration

## 🔗 **Links**

- 📚 **Documentation**: [API Docs](http://127.0.0.1:8000/docs)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/StellarCollabApp/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/StellarCollabApp/discussions)

---

<div align="center">

**⭐ Star this repo if you find it interesting! ⭐**

*Built with ❤️ for the pixel art community*

</div> 