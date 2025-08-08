# 🏗️ Artparty.social Architecture Documentation

## Overview

Artparty.social follows **SOLID principles** and modern software engineering best practices with a focus on maintainability, testability, and scalability. This document outlines the current architecture, design patterns, and how to contribute to the codebase.

## 🎯 SOLID Principles Implementation

### ✅ Single Responsibility Principle (SRP)
- **Before**: Large monolithic files with multiple responsibilities
- **After**: Focused modules with single responsibilities

#### Backend Services
- `PasswordService`: Only handles password hashing/verification
- `TokenService`: Only handles JWT token operations
- `UserService`: Only handles user business logic
- `TileService`: Only handles tile business logic
- `AuthenticationService`: Orchestrates authentication workflow
- `EmailService`: Handles email sending operations
- `VerificationService`: Manages email verification and password reset

#### Frontend Managers
- `AuthManager`: Authentication operations and user session management
- `CanvasListManager`: Canvas listing and management operations
- `CanvasViewerManager`: Canvas display and tile interactions
- `TileEditorManager`: Tile editing interface and pixel editor interactions
- `ModalManager`: Modal dialogs and form submissions
- `WebSocketManager`: Real-time WebSocket connections
- `NavigationManager`: Section navigation and UI state management

### ✅ Open/Closed Principle (OCP)
- **Repository Pattern**: Easy to extend with new data sources
- **Service Layer**: New business logic can be added without modifying existing code
- **Manager Pattern**: New frontend managers can be added without changing core logic

### ✅ Liskov Substitution Principle (LSP)
- **Repository Interfaces**: All repositories implement the same base interface
- **Service Abstractions**: Services can be swapped without breaking functionality
- **Manager Interfaces**: Managers follow consistent patterns for easy substitution

### ✅ Interface Segregation Principle (ISP)
- **Focused Interfaces**: Each repository has only the methods it needs
- **Modular Frontend**: Managers only depend on the functionality they use
- **API Endpoints**: Each endpoint group has focused responsibilities

### ✅ Dependency Inversion Principle (DIP)
- **Repository Pattern**: Business logic depends on abstractions, not concrete implementations
- **Service Layer**: Controllers depend on service interfaces, not implementations
- **Manager Pattern**: Frontend managers depend on abstractions and event-driven communication

## 🏛️ Backend Architecture

### Layer Structure
```
┌─────────────────────────────────────┐
│           API Layer (FastAPI)       │
├─────────────────────────────────────┤
│           Service Layer             │
├─────────────────────────────────────┤
│          Repository Layer           │
├─────────────────────────────────────┤
│           Model Layer               │
├─────────────────────────────────────┤
│           Database Layer            │
└─────────────────────────────────────┘
```

### Directory Structure
```
backend/app/
├── api/v1/              # API endpoints (controllers)
│   ├── auth.py          # Authentication endpoints
│   ├── users.py         # User management endpoints
│   ├── canvas.py        # Canvas management endpoints
│   ├── tiles.py         # Tile management endpoints
│   ├── tile_locks.py    # Tile locking system endpoints
│   ├── websockets.py    # WebSocket endpoints
│   ├── admin.py         # Admin-only endpoints
│   └── api.py           # Main API router
├── services/            # Business logic layer
│   ├── authentication.py
│   ├── user.py
│   ├── tile.py
│   ├── password.py
│   ├── token.py
│   ├── email.py
│   ├── verification.py
│   └── admin.py
├── repositories/        # Data access layer
│   ├── base.py          # Abstract repository
│   ├── user.py
│   ├── tile.py
│   ├── canvas.py
│   ├── like.py
│   └── tile_lock.py
├── models/              # Database models
│   ├── user.py
│   ├── canvas.py
│   ├── tile.py
│   ├── tile_lock.py
│   ├── like.py
│   ├── social.py
│   └── verification.py
├── schemas/             # Pydantic schemas
│   ├── auth.py
│   ├── user.py
│   ├── canvas.py
│   ├── tile.py
│   ├── admin.py
│   └── ...
└── core/                # Core functionality
    ├── config.py
    ├── database.py
    └── websocket.py
```

### Repository Pattern
```python
# Abstract base repository
class BaseRepository(ABC):
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> T: pass
    def get(self, db: Session, id: int) -> Optional[T]: pass
    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[T]: pass
    def update(self, db: Session, *, db_obj: T, obj_in: UpdateSchemaType) -> T: pass
    def delete(self, db: Session, *, id: int) -> T: pass

# Concrete implementation
class UserRepository(SQLAlchemyRepository[User, UserCreate, UserUpdate]):
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]: pass
    def is_username_taken(self, db: Session, *, username: str) -> bool: pass
```

## 🎨 Frontend Architecture

### Manager Pattern
The frontend uses a **Manager Pattern** where each manager is responsible for a specific domain of functionality. Managers communicate through events and maintain their own state.

### Directory Structure
```
frontend/js/
├── modules/             # Core application modules
│   ├── app-state.js     # Centralized state management
│   ├── navigation.js    # Navigation and UI state management
│   ├── auth.js          # Authentication utilities
│   ├── ui-utils.js      # Common UI utilities
│   └── managers/        # Domain-specific managers
│       ├── auth-manager.js
│       ├── canvas-list-manager.js
│       ├── canvas-viewer-manager.js
│       ├── tile-editor-manager.js
│       ├── modal-manager.js
│       ├── websocket-manager.js
│       └── index.js
├── services/            # API service layer
│   ├── auth.js
│   └── canvas.js
├── utils/               # Utility functions
│   ├── events.js
│   └── ui.js
├── api.js               # Centralized API client
├── pixel-editor.js      # Pixel art editing functionality
├── canvas-viewer.js     # Canvas display functionality
└── app.js               # Application entry point
```

### Manager Responsibilities

#### AuthManager
- User authentication (login, register, logout)
- Session management
- User data persistence
- Authentication state updates

#### CanvasListManager
- Canvas listing and display
- Canvas creation and deletion
- Canvas filtering and search
- Canvas statistics display

#### CanvasViewerManager
- Canvas display and rendering
- Tile interactions and selection
- WebSocket connection management
- Real-time updates

#### TileEditorManager
- Tile editing interface
- Pixel editor integration
- Tool selection and management
- Neighbor tile display
- Save/load tile operations

#### ModalManager
- Modal dialog management
- Form handling and validation
- Canvas settings management
- User feedback and notifications

#### WebSocketManager
- Real-time connection management
- Message handling and routing
- Connection state management
- Reconnection logic

#### NavigationManager
- Section navigation
- UI state management
- Manager initialization and coordination
- Event routing and handling

### State Management
The application uses a centralized state management system through `AppState`:

```javascript
// State structure
{
    isAuthenticated: boolean,
    currentUser: User | null,
    currentCanvas: Canvas | null,
    currentTile: Tile | null,
    currentSection: string,
    websocket: WebSocket | null,
    onlineUsers: User[],
    canvasList: Canvas[],
    currentTool: string,
    currentColor: string,
    isLoading: boolean
}
```

### Event-Driven Communication
Managers communicate through events using the EventManager:

```javascript
// Example event usage
appState.emit('user:login', userData);
appState.emit('canvas:created', canvasData);
appState.emit('tile:saved', tileData);
```

## 🔌 API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Token refresh
- `POST /auth/verify-email` - Email verification
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset

### Users (`/users`)
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `DELETE /users/me` - Delete user account
- `GET /users/{user_id}` - Get user profile (public)

### Canvas (`/canvas`)
- `GET /canvas` - List all canvases
- `POST /canvas` - Create new canvas
- `GET /canvas/{canvas_id}` - Get canvas details
- `PUT /canvas/{canvas_id}` - Update canvas
- `DELETE /canvas/{canvas_id}` - Delete canvas
- `GET /canvas/{canvas_id}/tiles` - Get canvas tiles

### Tiles (`/tiles`)
- `GET /tiles` - List tiles (with filters)
- `POST /tiles` - Create new tile
- `GET /tiles/{tile_id}` - Get tile details
- `PUT /tiles/{tile_id}` - Update tile
- `DELETE /tiles/{tile_id}` - Delete tile

### Tile Locks (`/tiles/locks`)
- `POST /tiles/locks/acquire` - Acquire tile lock
- `DELETE /tiles/locks/release` - Release tile lock
- `GET /tiles/locks/status` - Get lock status

### WebSockets (`/ws`)
- `GET /ws/{canvas_id}` - WebSocket connection for real-time updates

### Admin (`/admin`)
- `GET /admin/users` - List all users (admin only)
- `PUT /admin/users/{user_id}` - Update user (admin only)
- `DELETE /admin/users/{user_id}` - Delete user (admin only)
- `GET /admin/canvases` - List all canvases (admin only)
- `DELETE /admin/canvases/{canvas_id}` - Delete canvas (admin only)

## 🚀 Performance Considerations

### Backend Optimizations
- Database query optimization with proper indexing
- Repository pattern enables easy caching implementation
- Service layer allows for business logic optimization
- Async/await for non-blocking operations
- WebSocket connections for real-time updates

### Frontend Optimizations
- Manager pattern for focused functionality
- Event-driven communication reduces coupling
- State management reduces unnecessary re-renders
- Debounced user inputs for better performance
- Efficient DOM manipulation through focused managers

## 🔒 Security Best Practices

### Backend Security
- JWT token validation in dedicated service
- Password hashing with bcrypt
- Input validation with Pydantic schemas
- SQL injection prevention through ORM
- CORS configuration for production
- Email verification for account security
- Rate limiting on sensitive endpoints

### Frontend Security
- XSS prevention through proper input handling
- CSRF protection through token-based auth
- Secure storage of authentication tokens
- Input sanitization and validation
- HTTPS enforcement in production

## 📈 Future Enhancements

### Planned Improvements
1. **Dependency Injection Container**: Implement IoC container for better testability
2. **Event-Driven Architecture**: Enhance event bus for loose coupling
3. **Caching Layer**: Implement Redis caching in repository layer
4. **API Versioning**: Enhance version management
5. **Error Monitoring**: Add centralized error tracking
6. **Performance Monitoring**: Add metrics and monitoring
7. **Social Features**: Enhanced collaboration and social interactions

### Extension Points
- **Authentication**: Easy to add OAuth providers through service interfaces
- **Storage**: Easy to switch to different databases through repository pattern
- **UI Themes**: Modular frontend supports easy theming
- **Internationalization**: State management supports multi-language
- **Real-time Features**: WebSocket infrastructure supports additional real-time features

## 🤝 Contributing

### Before Contributing
1. Read this architecture documentation
2. Understand the SOLID principles implementation
3. Follow the established patterns and conventions
4. Write tests for new functionality
5. Update documentation for significant changes

### Code Review Checklist
- [ ] Does the code follow SOLID principles?
- [ ] Are responsibilities properly separated?
- [ ] Is the code testable and well-tested?
- [ ] Does it follow established patterns?
- [ ] Is error handling comprehensive?
- [ ] Is the code documented appropriately?
- [ ] Are events used for cross-manager communication?

## 📞 Support

For questions about the architecture or contributing:
1. Check this documentation first
2. Review existing code patterns
3. Ask in the development chat
4. Create an issue for architectural discussions

---

**Remember**: Good architecture is not just about following patterns, but about creating maintainable, testable, and scalable code that other developers can easily understand and extend. 