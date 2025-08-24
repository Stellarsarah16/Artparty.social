# 🏗️ StellarCollabApp Architecture Guide

## 📋 **Table of Contents**
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Event System](#event-system)
5. [Data Flow](#data-flow)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Security Model](#security-model)
9. [Testing Strategy](#testing-strategy)
10. [Development Guidelines](#development-guidelines)
11. [Documentation Process](#documentation-process)

## 🎯 **System Overview**

### **High-Level Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │   UI/UX     │ │  Managers   │ │ Event System│ │ Services │  │
│  │ Components  │ │ (Business   │ │ (Comm.)     │ │ (API)    │  │
│  │             │ │  Logic)     │ │             │ │          │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Backend Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │   FastAPI   │ │  Services   │ │ Repositories│ │ Models   │  │
│  │ (REST API)  │ │ (Business)  │ │ (Data)      │ │ (ORM)    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ PostgreSQL  │ │  Redis      │ │ File Storage│ │ WebSocket│  │
│  │ (Primary)   │ │ (Cache)     │ │ (Assets)    │ │ (Real-time)│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### **Core Systems**
- **Frontend**: Modular JavaScript architecture with manager pattern
- **Backend**: FastAPI with SQLAlchemy ORM and dependency injection
- **Real-time**: WebSocket for collaborative editing and live updates
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Database**: PostgreSQL with Alembic migrations
- **Caching**: Redis for session management and performance

## 🔧 **Architecture Principles**

### **1. Separation of Concerns**
- **UI Layer**: Handles presentation and user interaction
- **Business Layer**: Contains business logic and rules
- **Data Layer**: Manages data persistence and retrieval
- **Communication Layer**: Handles inter-component communication

### **2. Single Responsibility**
- Each class/module has one reason to change
- Managers coordinate, don't implement business logic
- Services handle business logic, repositories handle data
- UI components focus on presentation, not business rules

### **3. Dependency Injection**
- Components receive dependencies in constructor
- Easy to test and mock
- Clear dependency graph
- Loose coupling between components

### **4. Event-Driven Architecture**
- Loose coupling between components
- Asynchronous communication
- Easy to add new features without breaking existing ones
- Clear data flow and state changes

### **5. Progressive Enhancement**
- Core functionality works without JavaScript
- Enhanced experience with modern browsers
- Graceful degradation for older browsers
- Accessibility-first design

## 🧩 **Component Architecture**

### **Frontend Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │Navigation   │ │ Canvas      │ │ Tile        │ │ Admin    │  │
│  │Manager      │ │ Manager     │ │ Manager     │ │ Manager  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ Auth        │ │ WebSocket   │ │ Modal       │ │ Event    │  │
│  │ Manager     │ │ Manager     │ │ Manager     │ │ Manager  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ Canvas      │ │ Tile        │ │ Pixel       │ │ UI       │  │
│  │ Viewer      │ │ Editor      │ │ Editor      │ │ Utils    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### **Backend Architecture**
```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │   Auth      │ │  Canvas     │ │   Tile      │ │  Admin   │  │
│  │   API       │ │   API       │ │   API       │ │   API    │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ Auth        │ │ Canvas      │ │ Tile        │ │ Admin    │  │
│  │ Service     │ │ Service     │ │ Service     │ │ Service  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ Auth        │ │ Canvas      │ │ Tile        │ │ Admin    │  │
│  │ Repository  │ │ Repository  │ │ Repository  │ │ Repository│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐  │
│  │ User        │ │ Canvas      │ │ Tile        │ │ Tile     │  │
│  │ Model       │ │ Model       │ │ Model       │ │ Lock     │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### **Manager Pattern**
```javascript
export class ExampleManager {
    constructor(dependencies) {
        this.apiService = dependencies.apiService;
        this.eventManager = dependencies.eventManager;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for events from other components
        this.eventManager.on('userLogin', this.handleUserLogin.bind(this));
    }
    
    async createItem(data) {
        const item = await this.apiService.create(data);
        this.eventManager.emit('itemCreated', item);
        return item;
    }
}
```

## 📡 **Event System**

### **Event Flow**
```
Component A → EventManager.emit('eventName', data)
                    ↓
EventManager notifies all listeners
                    ↓
Component B (listener) receives event and data
                    ↓
Component B updates its state/UI
```

### **Event Categories**
- **Authentication**: `userLogin`, `userLogout`, `tokenExpired`
- **Canvas**: `canvasCreated`, `canvasUpdated`, `canvasDeleted`
- **Tiles**: `tileLocked`, `tileUnlocked`, `tileUpdated`
- **System**: `appReady`, `error`, `loadingStateChanged`

### **Event Contract Example**
```javascript
/**
 * @event userLogin
 * @data {Object} user - User data
 * @data {number} user.id - User ID
 * @data {string} user.username - Username
 * @data {Array} user.roles - User roles
 */
eventManager.emit('userLogin', {
    id: 123,
    username: 'john_doe',
    roles: ['user', 'admin']
});
```

## 🚀 **Data Flow**

### **Typical Flow**
```
1. User Action → UI Component
2. UI Component → Manager
3. Manager → API Service
4. API Service → Backend
5. Backend → Database
6. Response flows back up
7. Manager emits event
8. Other components react
```

### **Event Flow Example**
```
User clicks "Create Canvas"
    ↓
CanvasListManager.handleCreateCanvas()
    ↓
API call to backend
    ↓
On success: emit('canvasCreated', canvasData)
    ↓
AdminPanelManager listens and updates stats
CanvasViewerManager listens and refreshes list
```

## 🗃️ **State Management**

### **AppState (Global State)**
- User authentication status
- Current canvas/tile
- Application-wide settings
- WebSocket connection status

### **Manager State (Local State)**
- Each manager maintains its own state
- State changes trigger events
- Other components react to events

### **Event-Driven State Updates**
```javascript
// Instead of direct state manipulation
appState.set('currentUser', user);

// Use events to notify components
eventManager.emit('userLogin', user);
// Components listen and update their own state
```

## 🔌 **API Integration**

### **API Client Pattern**
```javascript
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.setupInterceptors();
    }
    
    async request(endpoint, options) {
        // Centralized request handling
        // Authentication headers
        // Error handling
        // Response processing
    }
}
```

### **Service Layer**
```javascript
class CanvasService {
    constructor(apiClient) {
        this.api = apiClient;
    }
    
    async createCanvas(data) {
        return this.api.request('/canvases', {
            method: 'POST',
            data: data
        });
    }
}
```

## 🔒 **Security Model**

### **Authentication Flow**
1. User provides credentials
2. Backend validates and returns JWT
3. Frontend stores token securely
4. Token included in all API requests
5. Backend validates token on each request

### **Authorization**
- Role-based access control (RBAC)
- Admin endpoints require admin role
- User can only access their own data
- Canvas permissions based on ownership/roles

### **Security Features**
- JWT token expiration
- HTTPS enforcement
- CORS configuration
- Input validation and sanitization
- SQL injection prevention

## 🧪 **Testing Strategy**

### **Unit Testing**
- Test each manager in isolation
- Mock dependencies (API, eventManager)
- Test event emission and handling
- Verify state changes

### **Integration Testing**
- Test manager interactions
- Test event flow between components
- Test API integration
- Test authentication flow

### **E2E Testing**
- Test complete user workflows
- Test collaborative editing
- Test admin panel functionality
- Test error scenarios

### **Testing Tools**
- Jest for unit testing
- Playwright for E2E testing
- Mock Service Worker for API mocking
- Test coverage reporting

## 📚 **Development Guidelines**

### **Adding New Features**
1. **Create Manager Class**
   ```javascript
   export class NewFeatureManager {
       constructor(dependencies) {
           this.eventManager = dependencies.eventManager;
           this.setupEventListeners();
       }
   }
   ```

2. **Define Events**
   ```javascript
   // Emit events when state changes
   this.eventManager.emit('newFeatureUpdated', data);
   
   // Listen for relevant events
   this.eventManager.on('canvasUpdated', this.handleCanvasUpdate.bind(this));
   ```

3. **Add to Managers Index**
   ```javascript
   import { NewFeatureManager } from './new-feature-manager.js';
   
   const managers = {
       // ... existing managers
       newFeature: new NewFeatureManager(dependencies)
   };
   ```

4. **Update Documentation**
   - Add to architecture guide
   - Document events and data contracts
   - Update component relationships

### **Code Review Checklist**
- [ ] Follows manager pattern
- [ ] Uses event system correctly
- [ ] Proper error handling
- [ ] Authentication checks
- [ ] Documentation updated
- [ ] Tests added/updated

### **Event System Checklist**
- [ ] Events have descriptive names
- [ ] Event data is documented
- [ ] Listeners are cleaned up
- [ ] No circular dependencies
- [ ] Events are tested

## 📋 **Documentation Process**

### **Documentation Structure**
```
docs/
├── ARCHITECTURE-GUIDE.md          # This file - Master architecture
├── EVENT-SYSTEM-GUIDE.md         # Event system implementation
├── MANAGER-PATTERN-GUIDE.md      # Manager pattern implementation
├── API-INTEGRATION-GUIDE.md      # Backend integration patterns
├── SECURITY-GUIDE.md             # Authentication & authorization
├── TESTING-GUIDE.md              # Testing strategies & examples
├── DEPLOYMENT-GUIDE.md           # Deployment & environment setup
├── CONTRIBUTING.md               # Development workflow
├── TROUBLESHOOTING.md            # Common issues & solutions
└── CHANGELOG.md                  # Feature & bug tracking
```

### **Documentation Maintenance**
1. **When adding features**: Update relevant sections
2. **When fixing bugs**: Document the fix and why it was needed
3. **When refactoring**: Update architecture diagrams
4. **Monthly review**: Ensure documentation is current

### **Documentation Standards**
- Use clear, concise language
- Include code examples
- Provide diagrams when helpful
- Keep examples up to date
- Link related documentation

## 🔄 **Maintenance Process**

### **Regular Reviews**
- **Monthly**: Check for unused components
- **Quarterly**: Review architecture decisions
- **Before releases**: Verify system interactions
- **After bugs**: Document patterns and solutions

### **Architecture Reviews**
1. **Before major changes**: Review impact on architecture
2. **After releases**: Review what worked/didn't work
3. **Quarterly**: Full architecture review and cleanup

### **Event System Audits**
1. **Check for unused events**
2. **Verify event contracts are followed**
3. **Look for circular dependencies**
4. **Ensure proper cleanup**

## 🚀 **Performance Considerations**

### **Frontend Performance**
- Lazy loading of managers
- Event listener cleanup
- Efficient DOM updates
- Asset optimization

### **Backend Performance**
- Database query optimization
- Caching strategies
- Connection pooling
- Async processing

### **Real-time Performance**
- WebSocket connection management
- Event batching
- Rate limiting
- Memory leak prevention

## 🔮 **Future Considerations**

### **Scalability**
- Microservices architecture
- Load balancing
- Database sharding
- CDN integration

### **Maintainability**
- TypeScript migration
- Automated testing
- CI/CD pipeline
- Monitoring and logging

### **User Experience**
- Progressive Web App (PWA)
- Offline functionality
- Mobile optimization
- Accessibility improvements

---

## 📚 **Quick Reference**

### **Key Files**
- **Frontend**: `frontend/js/modules/managers/index.js`
- **Backend**: `backend/app/main.py`
- **Event System**: `frontend/js/utils/events.js`
- **API Client**: `frontend/js/api.js`

### **Key Commands**
```bash
# Start development server
python run_server.py

# Run tests
npm test

# Build for production
npm run build

# Database migrations
alembic upgrade head
```

### **Common Patterns**
- **Manager Creation**: Use dependency injection
- **Event Handling**: Listen in setup, emit on changes
- **Error Handling**: Catch, log, emit error events
- **State Updates**: Use setState, emit events

This architecture guide should be updated whenever the system architecture changes or new patterns emerge.

## 🚨 **Current Development Status**

### **Canvas Viewer Refactoring (January 2024)**
**Status**: 🔄 **IN PROGRESS** - Major refactoring in progress with known issues

**What's Working**:
- ✅ SOLID architecture successfully implemented
- ✅ Manager pattern properly applied
- ✅ Event-driven communication working
- ✅ Basic canvas loading and navigation functional

**Critical Issues**:
- ❌ **Coordinate System Broken** - Tile detection coordinates misaligned
- ❌ **Viewport Positioning** - Complex calculations causing rendering issues
- ❌ **Debug Overlay** - Not functional due to underlying coordinate problems

**Next Steps**:
1. Fix coordinate system using proven logic from original implementation
2. Test tile interaction and editor opening
3. Verify debug overlay functionality
4. Complete performance optimization

**Fallback Plan**: If issues persist, port entire coordinate logic from working original system

**Documentation**: See `docs/refactoring/CANVAS-VIEWER-REFACTORING.md` for detailed troubleshooting
