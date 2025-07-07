# StellarCollabApp Testing Suite

This directory contains a comprehensive testing suite for the StellarCollabApp project, organized by concern and testing level.

## Directory Structure

```
tests/
├── frontend/
│   ├── unit/
│   │   ├── auth/              # Authentication service tests
│   │   ├── canvas/            # Canvas service tests
│   │   ├── state/             # State management tests
│   │   ├── services/          # Service layer tests
│   │   ├── ui/                # UI component tests
│   │   └── utils/             # Utility function tests
│   └── integration/           # Frontend integration tests
├── backend/
│   ├── unit/
│   │   ├── auth/              # Backend authentication tests
│   │   ├── models/            # Database model tests
│   │   ├── services/          # Backend service tests
│   │   ├── repositories/      # Repository layer tests
│   │   └── api/               # API endpoint tests
│   └── integration/           # Backend integration tests
├── e2e/                       # End-to-end tests
├── coverage/                  # Test coverage reports
├── results/                   # Test result outputs
├── setup-frontend.js          # Frontend test setup
├── setup-backend.py           # Backend test setup
├── test.config.js             # Jest configuration
└── README.md                  # This file
```

## Test Categories

### 1. Unit Tests
- **Frontend Unit Tests**: Test individual JavaScript modules, services, and utilities
- **Backend Unit Tests**: Test Python classes, functions, and service methods
- Coverage target: 80% for critical services, 70% overall

### 2. Integration Tests
- **Frontend Integration**: Test interaction between frontend components and services
- **Backend Integration**: Test API endpoints with database interactions
- Focus on data flow and service communication

### 3. End-to-End Tests
- Test complete user journeys from registration to canvas interaction
- Browser automation using Puppeteer
- Cross-browser compatibility testing

## Running Tests

### Prerequisites

Install testing dependencies:

```bash
# Frontend testing dependencies
npm install --save-dev jest @testing-library/jest-dom jsdom puppeteer

# Backend testing dependencies  
pip install pytest pytest-asyncio pytest-mock httpx
```

### Running All Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Running Specific Test Suites

```bash
# Frontend unit tests only
npm run test:frontend:unit

# Backend unit tests only
npm run test:backend:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Specific test file
npm test -- auth-service.test.js
```

### Backend Tests (Python)

```bash
# Run backend tests with pytest
cd backend
pytest tests/

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/unit/auth/test_auth_service.py
```

## Test Configuration

### Jest Configuration (`test.config.js`)

The Jest configuration includes:
- Multiple project setup for frontend/backend/e2e
- Coverage thresholds and reporting
- Custom matchers and setup files
- Module path mapping for imports

### Frontend Test Setup (`setup-frontend.js`)

Provides:
- DOM environment mocking with JSDOM
- Global mocks for fetch, WebSocket, canvas
- Test utilities for common operations
- Custom Jest matchers

### Backend Test Setup (`setup-backend.py`)

Provides:
- Database test fixtures
- Authentication mocking
- API client setup
- Test data factories

## Writing Tests

### Frontend Unit Test Example

```javascript
// tests/frontend/unit/auth/auth-service.test.js
import { AuthService } from '@/services/auth.js';

describe('AuthService', () => {
    let authService;

    beforeEach(() => {
        authService = new AuthService();
    });

    test('should login successfully', async () => {
        testUtils.mockFetchSuccess({
            access_token: 'token123',
            user: { id: 1, username: 'testuser' }
        });

        const result = await authService.login({
            username: 'testuser',
            password: 'password123'
        });

        expect(result.success).toBe(true);
        expect(result.user.username).toBe('testuser');
    });
});
```

### Backend Unit Test Example

```python
# tests/backend/unit/auth/test_auth_service.py
import pytest
from backend.app.services.auth import AuthService

class TestAuthService:
    @pytest.fixture
    def auth_service(self):
        return AuthService()

    def test_hash_password(self, auth_service):
        password = "testpassword"
        hashed = auth_service.hash_password(password)
        
        assert hashed != password
        assert auth_service.verify_password(password, hashed)
```

### Integration Test Example

```javascript
// tests/frontend/integration/auth-canvas-flow.test.js
describe('Authentication and Canvas Flow', () => {
    test('should complete login and load canvases', async () => {
        // Mock successful login
        testUtils.mockFetchSuccess({
            access_token: 'token123',
            user: { id: 1, username: 'testuser' }
        });

        // Execute login
        const loginResult = await authService.login(credentials);
        expect(loginResult.success).toBe(true);

        // Mock canvas data
        testUtils.mockFetchSuccess([
            { id: 1, name: 'Canvas 1' }
        ]);

        // Load canvases
        const canvases = await canvasService.getCanvases();
        expect(canvases).toHaveLength(1);
    });
});
```

### E2E Test Example

```javascript
// tests/e2e/complete-user-journey.test.js
describe('Complete User Journey', () => {
    test('should register and create canvas', async () => {
        await page.goto('http://localhost:3000');
        
        // Fill registration form
        await page.type('#register-username', 'testuser');
        await page.type('#register-email', 'test@example.com');
        await page.click('#register-btn');
        
        // Verify successful registration
        await page.waitForSelector('#canvas-section');
        
        // Create new canvas
        await page.click('#create-canvas-btn');
        await page.type('#canvas-name', 'My Canvas');
        await page.click('#create-canvas-submit');
        
        // Verify canvas created
        await page.waitForSelector('.toast.success');
    });
});
```

## Test Utilities

### Frontend Test Utilities (`global.testUtils`)

- `createMockUser()`: Create mock user objects
- `createMockCanvas()`: Create mock canvas objects
- `mockFetchSuccess(data)`: Mock successful API responses
- `mockFetchError(error, status)`: Mock API error responses
- `createMockDOM(html)`: Create DOM elements for testing
- `waitFor(condition, timeout)`: Wait for conditions to be met

### Custom Jest Matchers

- `toBeInDOM(element)`: Check if element is in DOM
- `toHaveBeenCalledWithUrl(mock, url)`: Check fetch calls with specific URL

## Coverage Requirements

### Minimum Coverage Thresholds

- **Global**: 70% (branches, functions, lines, statements)
- **Critical Services**: 80% (auth, canvas, state management)
- **API Endpoints**: 75%
- **Utilities**: 70%

### Coverage Reports

Coverage reports are generated in multiple formats:
- Terminal output during test runs
- HTML report: `tests/coverage/lcov-report/index.html`
- JSON report: `tests/coverage/coverage-final.json`
- LCOV format: `tests/coverage/lcov.info`

## Continuous Integration

### GitHub Actions

The test suite integrates with CI/CD pipelines:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

### Test Scripts in package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false",
    "test:frontend:unit": "jest --testPathPattern=frontend/unit",
    "test:backend:unit": "jest --testPathPattern=backend/unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

## Best Practices

### Test Organization

1. **Group by Feature**: Organize tests by the feature or component they test
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
4. **Single Responsibility**: Each test should verify one specific behavior

### Mocking Guidelines

1. **Mock External Dependencies**: Always mock API calls, databases, and external services
2. **Don't Mock What You're Testing**: Only mock dependencies, not the code under test
3. **Use Realistic Mock Data**: Mock data should reflect real API responses
4. **Reset Mocks**: Clear mocks between tests to avoid interference

### Test Data Management

1. **Use Factories**: Create test data using factory functions for consistency
2. **Isolate Test Data**: Each test should use its own data to avoid conflicts
3. **Clean Up**: Restore original state after each test

### Performance Considerations

1. **Parallel Execution**: Run tests in parallel when possible
2. **Selective Testing**: Use test patterns to run only relevant tests during development
3. **Mock Heavy Operations**: Mock expensive operations like file I/O and network calls

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npm test -- auth-service.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Run with verbose output
npm test -- --verbose
```

### Debug Mode

```bash
# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test in debug mode
npm test -- --no-cache --runInBand auth-service.test.js
```

### Common Issues

1. **Async Test Timeouts**: Increase timeout or ensure proper async/await usage
2. **Mock Leakage**: Clear mocks between tests using `jest.clearAllMocks()`
3. **DOM Cleanup**: Reset DOM state in `afterEach` hooks
4. **Memory Leaks**: Properly destroy services and clean up event listeners

## Contributing

### Adding New Tests

1. Follow the existing directory structure
2. Use appropriate test categories (unit, integration, e2e)
3. Include both positive and negative test cases
4. Add tests for error conditions and edge cases
5. Maintain or improve coverage percentage

### Test Review Checklist

- [ ] Tests are well-organized and properly categorized
- [ ] Test names clearly describe what is being tested
- [ ] Both success and failure scenarios are covered
- [ ] Mocks are properly configured and cleaned up
- [ ] Tests are deterministic and don't depend on external state
- [ ] Coverage requirements are met
- [ ] Tests run quickly and don't have unnecessary delays

## Resources

- [Jest Documentation](https://jestjs.io/docs)
- [Testing Library](https://testing-library.com/)
- [Puppeteer Documentation](https://pptr.dev/)
- [Pytest Documentation](https://docs.pytest.org/)

## Support

For questions about the testing suite:
1. Check this README and inline documentation
2. Review existing tests for examples
3. Create an issue in the project repository
4. Contact the development team 