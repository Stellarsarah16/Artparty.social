# 🤝 Contributing to StellarArtCollab

Welcome to StellarArtCollab! We're excited that you want to contribute. This guide will help you understand our development process, architecture, and how to make meaningful contributions.

## 🏗️ Architecture Overview

Before contributing, please read our [Architecture Documentation](./ARCHITECTURE.md) to understand:
- SOLID principles implementation
- Repository pattern usage
- Service layer architecture
- Module-based frontend structure

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+ and pip
- Docker and Docker Compose
- Git

### Development Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/StellarArtCollab.git
   cd StellarArtCollab
   ```

2. **Start the development environment**
   ```bash
   docker-compose up -d
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Verify setup**
   ```bash
   # Backend health check
   curl http://localhost:8000/health
   
   # Frontend should be accessible at http://localhost:3000
   ```

## 📋 Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### 2. Follow Architecture Patterns

#### Backend Development
```python
# 1. Create/Update Model (if needed)
class NewModel(Base):
    __tablename__ = "new_models"
    # ... model definition

# 2. Create/Update Schema
class NewModelCreate(BaseModel):
    # ... schema definition

# 3. Create/Update Repository
class NewModelRepository(SQLAlchemyRepository[NewModel, NewModelCreate, NewModelUpdate]):
    def custom_query_method(self, db: Session, param: str) -> List[NewModel]:
        # ... custom data access logic

# 4. Create/Update Service
class NewModelService:
    def __init__(self):
        self.repository = new_model_repository
    
    def business_logic_method(self, db: Session, data: NewModelCreate) -> NewModel:
        # ... business logic

# 5. Create/Update API Endpoint
@router.post("/", response_model=NewModelResponse)
async def create_new_model(
    data: NewModelCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return new_model_service.create(db, data, current_user)
```

#### Frontend Development
```javascript
// 1. Update State (if needed)
// Add new state properties to app-state.js

// 2. Create/Update Module
class NewFeatureManager {
    constructor() {
        this.setupEventListeners();
    }
    
    async handleNewFeature(data) {
        // ... feature logic
    }
}

// 3. Import and Use in Main Application
import newFeatureManager from './modules/new-feature.js';
```

### 3. Testing Requirements

#### Backend Tests
```python
# Unit Tests
def test_service_method():
    # Test service logic in isolation
    
def test_repository_method():
    # Test repository with test database

# Integration Tests
def test_api_endpoint():
    # Test complete API workflow
```

#### Frontend Tests
```javascript
// Unit Tests
describe('NewFeatureManager', () => {
    test('should handle feature correctly', () => {
        // Test module functionality
    });
});

// Integration Tests
describe('Feature Integration', () => {
    test('should work with state management', () => {
        // Test module interactions
    });
});
```

## 🎯 Code Quality Standards

### Backend Standards

#### 1. Type Hints
```python
# ✅ Good
def create_user(self, db: Session, user_data: UserCreate) -> User:
    return self.user_repository.create(db, obj_in=user_data)

# ❌ Bad
def create_user(self, db, user_data):
    return self.user_repository.create(db, obj_in=user_data)
```

#### 2. Error Handling
```python
# ✅ Good
def get_user_by_id(self, db: Session, user_id: int) -> User:
    user = self.user_repository.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

# ❌ Bad
def get_user_by_id(self, db: Session, user_id: int):
    return self.user_repository.get(db, user_id)  # No error handling
```

#### 3. Service Layer Separation
```python
# ✅ Good - Business logic in service
@router.post("/users/")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(db, user_data)

# ❌ Bad - Business logic in controller
@router.post("/users/")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    # Direct database access and business logic in controller
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(400, "Username exists")
    # ... more business logic
```

### Frontend Standards

#### 1. Module Separation
```javascript
// ✅ Good - Focused module
class AuthManager {
    async login(credentials) {
        // Only authentication logic
    }
}

// ❌ Bad - Mixed responsibilities
class MegaManager {
    async login(credentials) { /* auth logic */ }
    drawPixel(x, y, color) { /* canvas logic */ }
    showToast(message) { /* UI logic */ }
}
```

#### 2. State Management
```javascript
// ✅ Good - Use centralized state
appState.set('currentUser', userData);

// ❌ Bad - Direct global variable
window.currentUser = userData;
```

#### 3. Error Handling
```javascript
// ✅ Good
try {
    const result = await apiCall();
    showSuccess('Operation successful');
    return result;
} catch (error) {
    console.error('Operation failed:', error);
    showError('Operation failed. Please try again.');
    throw error;
}

// ❌ Bad
const result = await apiCall(); // No error handling
```

## 🧪 Testing Guidelines

### Running Tests

#### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

#### Frontend Tests
```bash
cd frontend
npm test
```

### Writing Tests

#### Backend Test Structure
```python
class TestUserService:
    def setup_method(self):
        # Setup test data
        
    def test_create_user_success(self):
        # Test successful user creation
        
    def test_create_user_duplicate_username(self):
        # Test error handling
        
    def test_create_user_invalid_data(self):
        # Test validation
```

#### Frontend Test Structure
```javascript
describe('AuthManager', () => {
    beforeEach(() => {
        // Setup test environment
    });
    
    test('should login successfully with valid credentials', async () => {
        // Test successful login
    });
    
    test('should handle login failure gracefully', async () => {
        // Test error handling
    });
});
```

## 📝 Documentation Requirements

### Code Documentation

#### Backend
```python
class UserService:
    """Service for user-related business logic"""
    
    def create_user(self, db: Session, user_create: UserCreate) -> User:
        """
        Create a new user account.
        
        Args:
            db: Database session
            user_create: User creation data
            
        Returns:
            Created user object
            
        Raises:
            HTTPException: If username or email already exists
        """
```

#### Frontend
```javascript
/**
 * Authentication Manager
 * Handles user authentication operations
 */
class AuthManager {
    /**
     * Handle user login
     * @param {Object} credentials - User login credentials
     * @param {string} credentials.username - Username
     * @param {string} credentials.password - Password
     * @returns {Promise<Object>} Authentication response
     * @throws {Error} If login fails
     */
    async login(credentials) {
        // Implementation
    }
}
```

### API Documentation
- Update OpenAPI/Swagger documentation for new endpoints
- Include request/response examples
- Document error responses

## 🔍 Code Review Process

### Before Submitting PR
- [ ] Code follows architecture patterns
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No linting errors
- [ ] Manual testing completed

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows SOLID principles
- [ ] Proper error handling implemented
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
```

### Review Criteria
Reviewers will check for:
1. **Architecture Compliance**: Follows SOLID principles and established patterns
2. **Code Quality**: Clean, readable, maintainable code
3. **Testing**: Adequate test coverage and quality
4. **Security**: No security vulnerabilities
5. **Performance**: No performance regressions
6. **Documentation**: Appropriate documentation updates

## 🐛 Bug Reports

### Bug Report Template
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 1.2.3]

## Additional Context
Screenshots, logs, etc.
```

## 💡 Feature Requests

### Feature Request Template
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed?

## Proposed Implementation
How should this be implemented?

## Alternative Solutions
Other ways to achieve the same goal

## Additional Context
Mockups, examples, etc.
```

## 📚 Learning Resources

### Architecture Patterns
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Repository Pattern](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)

### Technologies
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://pydantic-docs.helpmanual.io/)
- [JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

## 🎉 Recognition

Contributors who follow these guidelines and make meaningful contributions will be:
- Added to the CONTRIBUTORS.md file
- Recognized in release notes
- Invited to the core contributor team (for consistent contributors)

## 📞 Getting Help

### Development Questions
- Create a discussion thread for architectural questions
- Use issues for specific problems
- Join our developer chat for real-time help

### Contact
- Project Maintainer: [Your Name](mailto:your-email@example.com)
- Development Chat: [Discord/Slack link]
- Issues: [GitHub Issues](https://github.com/your-org/StellarArtCollab/issues)

---

Thank you for contributing to StellarArtCollab! Your efforts help make this project better for everyone. 🚀 