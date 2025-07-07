# StellarCollabApp Frontend

Clean, organized frontend structure for the StellarCollabApp collaborative pixel art platform.

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
docker build -f Dockerfile.prod -t stellarcollab-frontend .
```

## Module Overview

### Core Modules

#### `app.js`
Main application entry point that orchestrates all other modules.

#### `core/app.js`
Core application class that manages initialization and module coordination.

#### `core/state.js`
Centralized state management with reactive updates and persistence.

### Services

#### `services/auth.js`
Authentication service for login, registration, and token management.

#### `services/canvas.js`
Canvas service for canvas-related API operations.

### Components

#### `components/navigation.js`
Navigation manager for UI sections and modals.

### Utils

#### `utils/events.js`
Event management system for application-wide event handling.

#### `utils/ui.js`
UI utilities for common operations like toasts, modals, and form handling.

## Configuration

The application automatically detects the environment and configures API endpoints accordingly:

- **Development**: `http://localhost:8000`
- **Staging**: `https://staging-api.stellarcollab.com`
- **Production**: Same-origin with nginx proxy (recommended)

## Migration from Legacy Code

The legacy `main.js` and `main-refactored.js` files have been replaced with a clean, modular architecture. Key improvements:

1. **Reduced File Size**: Main entry point is now ~200 lines instead of 1400+
2. **Better Organization**: Related functionality grouped into logical modules
3. **Improved Maintainability**: Each module has a single responsibility
4. **Cleaner Dependencies**: Clear import/export structure
5. **No Debug Code**: Production-ready without debug artifacts

## Browser Support

- Modern browsers with ES6 module support
- Chrome 61+
- Firefox 54+
- Safari 10.1+
- Edge 16+

## Development Notes

- Use browser dev tools for debugging
- All console spam prevention has been removed
- Clean, readable console output
- Proper error handling and user feedback 