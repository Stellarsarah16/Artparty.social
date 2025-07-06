# 🔧 Quick Reference Card

## 📁 File Structure Quick Guide

```
backend/app/
├── api/v1/              # 🌐 Controllers (HTTP handlers)
├── services/            # 🧠 Business logic
├── repositories/        # 💾 Database access
├── models/              # 🏗️ Database models
├── schemas/             # 📋 API schemas
└── core/                # ⚙️ Core functionality

frontend/js/
├── main-refactored.js   # 🎯 Main orchestrator
├── modules/             # 📦 Focused modules
│   ├── app-state.js     # 📊 State management
│   ├── auth.js          # 🔐 Authentication
│   ├── navigation.js    # 🧭 Navigation
│   └── ui-utils.js      # 🎨 UI utilities
└── api.js               # 🔌 API client
```

## 🔄 Common Patterns

### Adding New Backend Feature

1. **Repository** (Data Access)
```python
# repositories/thing.py
def get_thing(self, db: Session, id: int) -> Optional[Thing]:
    return db.query(Thing).filter(Thing.id == id).first()
```

2. **Service** (Business Logic)
```python
# services/thing.py
def process_thing(self, db: Session, thing_id: int) -> Thing:
    thing = self.thing_repository.get_thing(db, thing_id)
    if not thing:
        raise ValueError("Thing not found")
    # Business logic here
    return thing
```

3. **Controller** (API Endpoint)
```python
# api/v1/things.py
@router.get("/things/{thing_id}")
async def get_thing(thing_id: int, db: Session = Depends(get_db)):
    try:
        thing = thing_service.process_thing(db, thing_id)
        return thing
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Adding New Frontend Feature

1. **Module** (Focused functionality)
```javascript
// modules/thing-manager.js
class ThingManager {
    constructor(appState, apiClient) {
        this.appState = appState;
        this.apiClient = apiClient;
    }
    
    async getThing(id) {
        const response = await this.apiClient.get(`/things/${id}`);
        this.appState.set('currentThing', response);
        return response;
    }
}
```

2. **Main App** (Integration)
```javascript
// main-refactored.js
constructor() {
    this.thingManager = new ThingManager(this.appState, this.apiClient);
    this.appState.subscribe('currentThing', (thing) => {
        this.updateThingDisplay(thing);
    });
}
```

## 🎯 Where to Put Code

| **What are you doing?** | **Where it goes** |
|-------------------------|-------------------|
| SQL queries, database operations | Repository |
| Business rules, validation | Service |
| HTTP handling, status codes | Controller |
| UI updates, DOM manipulation | Frontend Module |
| State changes, data sharing | AppState |

## 🚫 Common Mistakes

### ❌ Don't Do This
```python
# Controller with business logic
@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # ❌ Business logic in controller
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short")
    
    # ❌ Direct database access in controller
    user = db.query(User).filter(User.username == user_data.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username taken")
```

### ✅ Do This Instead
```python
# Controller delegates to service
@router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        user = user_service.create_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## 🔌 Import Patterns

### Backend Imports
```python
# Services
from app.services import user_service, auth_service

# Repositories  
from app.repositories import user_repository

# Models
from app.models.user import User

# Schemas
from app.schemas.user import UserCreate, UserResponse
```

### Frontend Imports
```javascript
// ES6 modules
import { AppState } from './modules/app-state.js';
import { AuthManager } from './modules/auth.js';

// Or CommonJS (if using bundler)
const { AppState } = require('./modules/app-state');
```

## 🐛 Debugging Tips

### Backend Debugging
```python
# Add logging to services
import logging
logger = logging.getLogger(__name__)

def create_user(self, db: Session, user_create: UserCreate) -> User:
    logger.info(f"Creating user: {user_create.username}")
    # ... rest of method
```

### Frontend Debugging
```javascript
// Add console logs to modules
class AuthManager {
    async login(username, password) {
        console.log('AuthManager: Attempting login for', username);
        const response = await this.apiClient.post('/auth/login', {username, password});
        console.log('AuthManager: Login successful', response);
        return response;
    }
}
```

## 📊 State Management Cheat Sheet

```javascript
// Set state
this.appState.set('currentUser', userData);

// Get state
const user = this.appState.get('currentUser');

// Subscribe to changes
this.appState.subscribe('currentUser', (user) => {
    console.log('User changed:', user);
});

// Check if state exists
if (this.appState.has('currentUser')) {
    // User is logged in
}
```

## 🔧 Development Commands

```bash
# Start development environment
docker-compose up -d

# View logs
docker logs stellarcollabapp-backend-1 --tail 50

# Access database
docker exec -it stellarcollabapp-db-1 psql -U stellaruser -d stellardb

# Run tests
docker exec stellarcollabapp-backend-1 python -m pytest

# Format code
docker exec stellarcollabapp-backend-1 black .
docker exec stellarcollabapp-backend-1 isort .
```

## 🎨 Frontend Event Handling

```javascript
// Form submission
document.getElementById('myForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        await this.myManager.handleFormSubmit(data);
        this.uiUtils.showSuccess('Success!');
    } catch (error) {
        this.uiUtils.showError(error.message);
    }
});

// State change handling
this.appState.subscribe('currentUser', (user) => {
    if (user) {
        this.showUserSection();
    } else {
        this.showLoginSection();
    }
});
```

## 🔒 Error Handling Patterns

### Backend
```python
# Service layer - raise domain errors
if not user.is_active:
    raise ValueError("User account is disabled")

# Controller layer - convert to HTTP errors
try:
    result = service.do_something()
    return result
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

### Frontend
```javascript
// API calls with error handling
async makeApiCall() {
    try {
        const response = await this.apiClient.post('/endpoint', data);
        return response;
    } catch (error) {
        if (error.response?.status === 401) {
            this.appState.set('currentUser', null);
            this.navigationManager.showSection('login');
        }
        throw new Error(`API call failed: ${error.message}`);
    }
}
```

## 📝 Testing Quick Start

### Backend Tests
```python
# test_user_service.py
def test_create_user():
    # Arrange
    user_data = UserCreate(username="test", email="test@example.com")
    
    # Act
    user = user_service.create_user(db, user_data)
    
    # Assert
    assert user.username == "test"
    assert user.is_active is True
```

### Frontend Tests
```javascript
// test_auth_manager.js
describe('AuthManager', () => {
    it('should update app state on successful login', async () => {
        // Arrange
        const authManager = new AuthManager(appState, mockApiClient);
        
        // Act
        await authManager.login('testuser', 'password');
        
        // Assert
        expect(appState.get('currentUser')).toBeDefined();
    });
});
```

---

**💡 Remember**: When in doubt, check the [JUNIOR-ENGINEER-GUIDE.md](JUNIOR-ENGINEER-GUIDE.md) for detailed explanations! 