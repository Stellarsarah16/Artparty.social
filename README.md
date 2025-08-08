# 🎨 Artparty.social - Collaborative Pixel Canvas Game

A **real-time collaborative pixel art platform** built with FastAPI (Python) backend and vanilla JavaScript frontend. Artists can create, share, and collaborate on pixel art in shared canvases with live updates via WebSocket connections.

---

## 🚀 **Live Demo**
🌐 **[Try Artparty.social Live](http://104.248.124.8)** *(Running on DigitalOcean)*

## 🌟 **What is Artparty.social?**

Artparty.social is a **real-time collaborative pixel art platform** where artists can create, share, and discover amazing 32x32 pixel art tiles on shared canvases. Think of it as a digital art gallery where creativity meets collaboration!

### ✨ **Key Features**
- 🎨 **Real-time Collaboration** - Multiple artists working together
- 🖼️ **Shared Canvases** - Large collaborative art spaces
- 🎯 **32x32 Pixel Tiles** - Perfect for detailed pixel art
- 🔄 **Live Updates** - See changes as they happen
- 👥 **User Management** - Secure authentication and profiles
- 📱 **Responsive Design** - Works on desktop and mobile
- 🚀 **Fast Performance** - Optimized for real-time collaboration

### 🎯 **Perfect For**
- 🎨 **Digital Artists** - Create and share pixel art
- 👥 **Art Communities** - Collaborate on projects
- 🎓 **Education** - Learn pixel art techniques
- 🏢 **Team Building** - Creative collaboration exercises

---

## 🛠️ **Tech Stack**

### Backend
- **FastAPI** - Modern Python web framework
- **WebSockets** - Real-time communication
- **PostgreSQL** - Database for production
- **SQLite** - Database for development
- **JWT Authentication** - Secure user sessions
- **Docker** - Containerization

### Frontend
- **Vanilla JavaScript** - No frameworks, pure performance
- **HTML5 Canvas** - Pixel art rendering
- **CSS3** - Modern styling and animations
- **WebSocket Client** - Real-time updates

### Infrastructure
- **Docker Compose** - Multi-container setup
- **Nginx** - Production web server
- **SSL/TLS** - HTTPS encryption
- **DigitalOcean** - Cloud hosting

---

## 🚀 **Quick Start**

### Prerequisites
- **Docker** and **Docker Compose** installed
- **Git** for cloning the repository

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/Artparty.social.git
cd Artparty.social

# Start the application
docker-compose up --build

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

### First Steps
1. **Register** a new account or **login**
2. **Create** a new canvas or **join** an existing one
3. **Select** your colors and tools
4. **Start** creating pixel art!
5. **Collaborate** with other artists in real-time

---

## 📚 **Documentation**

### For Users
- [🎨 How to Create Pixel Art](docs/pixel-art-guide.md)
- [👥 Collaboration Tips](docs/collaboration-guide.md)
- [🛠️ Tools and Features](docs/user-guide.md)

### For Developers
- [🔧 Development Setup](docs/development.md)
- [🏗️ Architecture Overview](docs/architecture.md)
- [🚀 Deployment Guide](DEPLOYMENT.md)
- [🔗 API Documentation](docs/api.md)

### For DevOps
- [🐳 Docker Configuration](docs/docker.md)
- [☁️ Cloud Deployment](DIGITALOCEAN-DEPLOY.md)
- [🔒 Security Configuration](docs/security.md)
- [📊 Monitoring Setup](docs/monitoring.md)

---

## 🔧 **Development**

### Local Development
```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Run tests
docker-compose exec backend python -m pytest
docker-compose exec frontend npm test

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Code Structure
```
StellarArtCollab/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/       # API endpoints
│   │   ├── models/    # Database models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   └── tests/         # Backend tests
├── frontend/          # Vanilla JS frontend
│   ├── js/           # JavaScript modules
│   ├── css/          # Stylesheets
│   └── tests/        # Frontend tests
└── deployment/        # Production configs
```

---

## 🚀 **Deployment**

### Production Deployment
```bash
# Quick deployment to DigitalOcean
./deployment/quick-deploy-digitalocean.sh

# Manual deployment
docker-compose -f docker-compose.prod.yml up -d

# SSL certificate setup
certbot --nginx -d yourdomain.com
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Authentication
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
APP_NAME=StellarArtCollab
DEBUG=false
```

---

## 🧪 **Testing**

### Backend Tests
```bash
# Run all tests
docker-compose exec backend python run_tests.py

# Run specific test
docker-compose exec backend python -m pytest tests/test_auth.py

# Test coverage
docker-compose exec backend python -m pytest --cov=app
```

### Frontend Tests
```bash
# Open test runner in browser
open http://localhost/tests/test-runner.html

# Run API integration tests
open http://localhost/tests/api-integration.test.html
```

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Areas for Contribution
- 🎨 **UI/UX Improvements**
- 🚀 **Performance Optimizations**
- 🧪 **Test Coverage**
- 📝 **Documentation**
- 🐛 **Bug Fixes**
- ✨ **New Features**

---

## 📞 **Support**

Need help? We're here for you!

- 📧 **Email**: support@stellarartcollab.com
- 💬 **Discord**: [Join our community](https://discord.gg/stellarartcollab)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/StellarArtCollab/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/StellarArtCollab/discussions)

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 **Acknowledgments**

- 🎨 **Artists** - For inspiring this platform
- 👥 **Community** - For feedback and contributions
- 🛠️ **Open Source** - For the amazing tools we use

---

**Happy Creating! 🎨✨** 