# ArtPartySocial Frontend

Clean, organized frontend structure for the ArtPartySocial collaborative pixel art platform.

## Directory Structure

```
frontend/
├── index.html              # Main HTML file
├── package.json           # Dependencies and scripts
├── nginx.prod.conf        # Production nginx configuration
├── Dockerfile.prod        # Production Docker build
├── css/                   # Stylesheets
│   ├── main.css
│   ├── animations.css
│   └── enhancements.css
├── js/                    # JavaScript files
│   ├── app.js            # Main application entry point
│   ├── config.js         # Configuration and environment detection
│   ├── api.js            # API communication
│   ├── canvas-viewer.js  # Canvas viewing functionality
│   ├── pixel-editor.js   # Pixel editing tools
│   ├── websocket.js      # WebSocket communication
│   ├── ui.js             # UI components
│   ├── form-validation.js # Form validation
│   ├── core/             # Core application modules
│   │   ├── app.js        # Core application class
│   │   └── state.js      # State management
│   ├── services/         # Service modules
│   │   ├── auth.js       # Authentication service
│   │   └── canvas.js     # Canvas service
│   ├── components/       # UI components
│   │   └── navigation.js # Navigation manager
│   ├── utils/            # Utility modules
│   │   ├── events.js     # Event management
│   │   └── ui.js         # UI utilities
│   └── modules/          # Legacy modules (to be refactored)
│       ├── app-state.js
│       ├── auth.js
│       ├── navigation.js
│       └── ui-utils.js
├── tests/                # Test files
│   ├── test-runner.html
│   └── setup.js
└── debug/                # Debug files and backups
    ├── main.js.backup
    ├── main-refactored.js.backup
    ├── cors-test-utility.html
    ├── setup-cors.py
    └── test-*.html
```

## Key Features

### Clean Architecture
- **Modular Structure**: Code is organized into logical modules (core, services, components, utils)
- **Separation of Concerns**: Each module has a single responsibility
- **ES6 Modules**: Modern JavaScript module system for better dependency management
- **Singleton Pattern**: Core services use singleton pattern to ensure single instances

### Removed Debug Code
- All debug console spam prevention code removed
- Test files moved to `debug/` directory
- Production-ready configuration without debug flags
- Clean, minimal logging

### State Management
- Centralized state management with reactive updates
- Persistent state storage for user preferences
- Event-driven architecture for component communication

### Production Ready
- Environment-specific configuration
- Proper error handling
- Security best practices
- Clean, maintainable codebase

## Usage

### Development
```bash
# Serve the frontend files using a local server
# The app will automatically detect development environment
```

### Production
```bash
# Build and deploy using Docker
docker build -f Dockerfile.prod -t artpartysocial-frontend .
```

## Module Overview

### Core Modules

#### `app.js`
Main application entry point that orchestrates all other modules.

#### `core/app.js`
Core application class that manages initialization and module coordination.

#### `