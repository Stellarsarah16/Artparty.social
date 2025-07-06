# 🚀 Junior Engineer's Guide to StellarArtCollab Architecture

## Welcome! 👋

This guide will help you understand how StellarArtCollab works under the hood. If you're new to backend development, frontend architecture, or just want to understand our codebase better, this is your starting point.

We'll go from the basics to advanced concepts, with lots of examples and practical exercises.

## 🎯 What Makes Good Architecture?

Before diving into our code, let's understand **why** we structure code this way:

### The Old Way (What We Fixed)
```python
# ❌ BAD: Everything in one giant file
def register_user(request):
    # 50 lines of validation code
    # 30 lines of database code  
    # 20 lines of password hashing
    # 15 lines of token generation
    # 25 lines of error handling
    # = 140 lines of mixed concerns!
```

### The New Way (What We Built)
```python
# ✅ GOOD: Separated concerns
def register_user(request):
    user_data = user_service.create_user(request.data)
    token = token_service.create_token(user_data)
    return {"user": user_data, "token": token}
    # = 3 lines that are easy to understand!
```

## 🏗️ Understanding Our Architecture

Think of our architecture like a restaurant:

- **Frontend** = The dining room (what customers see)
- **API Controllers** = The waiters (take orders, serve food)
- **Services** = The kitchen (prepare the food)
- **Repositories** = The pantry (store and retrieve ingredients)
- **Database** = The warehouse (where everything is stored)

## 🔧 Backend Architecture Deep Dive

### 1. The Repository Pattern (Our Data Access Layer)

**What it does**: Handles all database operations
**Why it's useful**: If we change from PostgreSQL to MongoDB, we only change the repository, not the business logic

#### Example: UserRepository

```python
# backend/app/repositories/user.py
class UserRepository(SQLAlchemyRepository[User, UserCreate, UserUpdate]):
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()
    
    def is_username_taken(self, db: Session, *, username: str) -> bool:
        return db.query(User).filter(User.username == username).first() is not None
```

**🎯 Key Points**:
- Only talks to the database
- No business logic (like "is this password strong enough?")
- Returns raw data models

### 2. The Service Layer (Our Business Logic)

**What it does**: Contains all the business rules and logic
**Why it's useful**: All the "smart" decisions happen here

#### Example: UserService

```python
# backend/app/services/user.py
class UserService:
    def __init__(self):
        self.user_repository = user_repository
        self.password_service = password_service
    
    def create_user(self, db: Session, user_create: UserCreate) -> User:
        # Business logic: Check if username is taken
        if self.user_repository.is_username_taken(db, username=user_create.username):
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Business logic: Hash the password
        hashed_password = self.password_service.hash_password(user_create.password)
        
        # Business logic: Create user with defaults
        user_data = UserCreate(
            username=user_create.username,
            email=user_create.email,
            hashed_password=hashed_password,
            is_active=True,  # New users are active by default
            total_points=0   # New users start with 0 points
        )
        
        return self.user_repository.create(db, obj_in=user_data)
```

**🎯 Key Points**:
- Contains all business rules
- Coordinates between different repositories
- Handles complex logic like validation and defaults

### 3. The API Layer (Our Controllers)

**What it does**: Handles HTTP requests and responses
**Why it's useful**: Separates web concerns from business logic

#### Example: Auth Controller

```python
# backend/app/api/v1/auth.py
@router.post("/register", response_model=TokenResponse)
async def register(
    user_create: UserCreate,
    db: Session = Depends(get_db)
) -> TokenResponse:
    try:
        # Just coordinate - let services do the work
        user = user_service.create_user(db, user_create)
        token_data = authentication_service.create_token_response(user)
        return token_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**🎯 Key Points**:
- Thin layer - just coordinates
- Handles HTTP-specific things (status codes, headers)
- Delegates business logic to services

## 🎨 Frontend Architecture Deep Dive

### 1. The Module System

Instead of one giant JavaScript file, we have focused modules:

#### AppState Module (Our State Manager)
```javascript
// frontend/js/modules/app-state.js
class AppState {
    constructor() {
        this.state = {};
        this.listeners = {};
    }
    
    // Set state and notify listeners
    set(key, value) {
        this.state[key] = value;
        this.notifyListeners(key, value);
    }
    
    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback);
    }
}
```

#### AuthManager Module (Authentication Operations)
```javascript
// frontend/js/modules/auth.js
class AuthManager {
    constructor(appState, apiClient) {
        this.appState = appState;
        this.apiClient = apiClient;
    }
    
    async login(username, password) {
        try {
            const response = await this.apiClient.post('/auth/login', {
                username, password
            });
            
            // Update global state
            this.appState.set('currentUser', response.user);
            this.appState.set('authToken', response.access_token);
            
            return response;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }
}
```

### 2. How Modules Work Together

```javascript
// frontend/js/main-refactored.js
class StellarArtCollab {
    constructor() {
        // Initialize core modules
        this.appState = new AppState();
        this.authManager = new AuthManager(this.appState, this.apiClient);
        this.navigationManager = new NavigationManager(this.appState);
        this.uiUtils = new UIUtils(this.appState);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize the app
        this.init();
    }
    
    setupEventListeners() {
        // Listen to state changes
        this.appState.subscribe('currentUser', (user) => {
            this.updateUIForUser(user);
        });
        
        // Handle form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });
    }
    
    async handleLogin(event) {
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        try {
            await this.authManager.login(username, password);
            this.navigationManager.showSection('dashboard');
        } catch (error) {
            this.uiUtils.showError('Login failed: ' + error.message);
        }
    }
}
```

## 🔄 Request Flow Walkthrough

Let's trace what happens when a user registers:

### 1. User Clicks "Register" Button
```javascript
// frontend/js/main-refactored.js
async handleRegister(event) {
    // Extract form data
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name')
    };
    
    // Call AuthManager
    await this.authManager.register(userData);
}
```

### 2. AuthManager Handles Registration
```javascript
// frontend/js/modules/auth.js
async register(userData) {
    // Make API call
    const response = await this.apiClient.post('/auth/register', userData);
    
    // Update app state
    this.appState.set('currentUser', response.user);
    this.appState.set('authToken', response.access_token);
    
    return response;
}
```

### 3. Backend Controller Receives Request
```python
# backend/app/api/v1/auth.py
@router.post("/register", response_model=TokenResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # Delegate to service layer
    user = user_service.create_user(db, user_create)
    token_data = authentication_service.create_token_response(user)
    return token_data
```

### 4. UserService Handles Business Logic
```python
# backend/app/services/user.py
def create_user(self, db: Session, user_create: UserCreate) -> User:
    # Check if username is taken
    if self.user_repository.is_username_taken(db, username=user_create.username):
        raise ValueError("Username already taken")
    
    # Hash password
    hashed_password = self.password_service.hash_password(user_create.password)
    
    # Create user
    user_data = UserCreate(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hashed_password,
        first_name=user_create.first_name,
        last_name=user_create.last_name,
        is_active=True,
        total_points=0
    )
    
    return self.user_repository.create(db, obj_in=user_data)
```

### 5. UserRepository Saves to Database
```python
# backend/app/repositories/user.py
def create(self, db: Session, *, obj_in: UserCreate) -> User:
    db_obj = User(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj
```

## 🧪 Adding New Features (Step-by-Step)

Let's add a "Get User Profile" feature:

### Step 1: Add Repository Method
```python
# backend/app/repositories/user.py
def get_profile_by_id(self, db: Session, *, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()
```

### Step 2: Add Service Method
```python
# backend/app/services/user.py
def get_user_profile(self, db: Session, user_id: int) -> User:
    user = self.user_repository.get_profile_by_id(db, user_id=user_id)
    if not user:
        raise ValueError("User not found")
    
    # Business logic: Don't return sensitive data
    if not user.is_active:
        raise ValueError("User account is disabled")
    
    return user
```

### Step 3: Add API Endpoint
```python
# backend/app/api/v1/users.py
@router.get("/profile/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db)
):
    try:
        user = user_service.get_user_profile(db, user_id)
        return user
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

### Step 4: Add Frontend Method
```javascript
// frontend/js/modules/user.js
class UserManager {
    constructor(appState, apiClient) {
        this.appState = appState;
        this.apiClient = apiClient;
    }
    
    async getUserProfile(userId) {
        try {
            const response = await this.apiClient.get(`/users/profile/${userId}`);
            return response;
        } catch (error) {
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }
}
```

### Step 5: Use in Main App
```javascript
// frontend/js/main-refactored.js
async showUserProfile(userId) {
    try {
        const profile = await this.userManager.getUserProfile(userId);
        this.appState.set('selectedUserProfile', profile);
        this.navigationManager.showSection('profile');
    } catch (error) {
        this.uiUtils.showError(error.message);
    }
}
```

## 🔍 Common Patterns and Best Practices

### 1. Error Handling Pattern
```python
# Service layer raises business errors
def create_user(self, db: Session, user_create: UserCreate) -> User:
    if self.user_repository.is_username_taken(db, username=user_create.username):
        raise ValueError("Username already taken")  # Business error
    
    # ... rest of logic

# Controller layer converts to HTTP errors
@router.post("/register")
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    try:
        user = user_service.create_user(db, user_create)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))  # HTTP error
```

### 2. State Management Pattern
```javascript
// Always update state through AppState
this.appState.set('currentUser', userData);

// Always subscribe to state changes
this.appState.subscribe('currentUser', (user) => {
    this.updateUserDisplay(user);
});
```

### 3. Module Communication Pattern
```javascript
// Modules communicate through AppState, not directly
class AuthManager {
    async login(username, password) {
        const response = await this.apiClient.post('/auth/login', {username, password});
        this.appState.set('currentUser', response.user);  // Notify other modules
        return response;
    }
}

class NavigationManager {
    constructor(appState) {
        // Listen to auth changes
        appState.subscribe('currentUser', (user) => {
            if (user) {
                this.showSection('dashboard');
            } else {
                this.showSection('login');
            }
        });
    }
}
```

## 🐛 Common Issues and Solutions

### Issue 1: "Cannot read property of undefined"
```javascript
// ❌ Bad: Direct property access
const username = this.appState.state.currentUser.username;

// ✅ Good: Safe property access
const user = this.appState.get('currentUser');
const username = user ? user.username : 'Guest';
```

### Issue 2: "Service not found" errors
```python
# ❌ Bad: Direct import
from app.services.user import UserService
user_service = UserService()

# ✅ Good: Use dependency injection
from app.services import user_service  # Import from __init__.py
```

### Issue 3: Circular dependencies
```python
# ❌ Bad: Services importing each other
# user_service.py
from app.services.auth import AuthService

# auth_service.py  
from app.services.user import UserService

# ✅ Good: Use dependency injection or events
class UserService:
    def __init__(self, auth_service):
        self.auth_service = auth_service
```

## 📚 Learning Exercises

### Exercise 1: Add a "Like Tile" Feature
1. Add a `like_tile` method to `TileRepository`
2. Add business logic to `TileService` (check if already liked)
3. Add API endpoint to `tiles.py`
4. Add frontend method to handle likes
5. Update UI to show like count

### Exercise 2: Create a "User Settings" Module
1. Create `frontend/js/modules/settings.js`
2. Add methods to update user preferences
3. Integrate with existing AuthManager
4. Add settings section to navigation

### Exercise 3: Implement Real-time Notifications
1. Add `NotificationService` to backend
2. Create WebSocket endpoint
3. Add `NotificationManager` to frontend
4. Subscribe to real-time events

## 🎯 Testing Your Understanding

### Quiz Questions:
1. **Where should you put code that checks if a username is valid?**
   - A) Repository
   - B) Service  ✅
   - C) Controller
   - D) Frontend

2. **How do frontend modules communicate?**
   - A) Direct method calls
   - B) Global variables
   - C) AppState pub/sub ✅
   - D) Local storage

3. **What should a repository method return?**
   - A) HTTP response
   - B) Database model ✅
   - C) Business object
   - D) JSON string

### Practical Challenges:
1. **Add logging to all service methods**
2. **Create a caching layer for frequently accessed data**
3. **Add input validation to all API endpoints**
4. **Implement user role-based permissions**

## 🚀 Next Steps

Once you understand this architecture:

1. **Read the detailed [ARCHITECTURE.md](ARCHITECTURE.md)** for advanced patterns
2. **Check [CONTRIBUTING.md](CONTRIBUTING.md)** for development workflow
3. **Look at [SOCIAL-FEATURES-PLAN.md](SOCIAL-FEATURES-PLAN.md)** to see planned features
4. **Start with simple features** like adding new API endpoints
5. **Gradually work up to complex features** like real-time collaboration

## 💡 Key Takeaways

- **Separation of Concerns**: Each piece of code has one job
- **Dependency Injection**: Pass dependencies instead of creating them
- **State Management**: Centralize state, use pub/sub for communication
- **Error Handling**: Handle errors at appropriate layers
- **Testing**: Write tests for each layer independently
- **Documentation**: Keep docs updated as code changes

Remember: **Good architecture makes code easy to understand, test, and change**. If you're confused about where to put code, ask yourself: "What is this code's main responsibility?" That will guide you to the right layer.

Happy coding! 🎉

---

*Need help? Check our [CONTRIBUTING.md](CONTRIBUTING.md) for how to ask questions or create GitHub issues.* 