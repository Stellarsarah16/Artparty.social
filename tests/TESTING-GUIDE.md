# 🧪 Testing Guide for StellarCollabApp

## Quick Start

### Running Tests
```bash
# From project root
cd frontend
npm run test:summary
```

### Viewing Results
- **HTML Report**: `tests/results/test-report.html`
- **Coverage Report**: `tests/coverage/lcov-report/index.html`
- **Console Output**: Check terminal for detailed results

## Test Structure

### Frontend Tests
```
tests/frontend/
├── unit/                    # Unit tests for individual components
│   ├── auth/               # Authentication service tests
│   ├── canvas/             # Canvas service tests
│   ├── state/              # App state management tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
└── e2e/                   # End-to-end tests (temporarily disabled)
```

### Backend Tests
```
tests/backend/
├── unit/                   # Unit tests for backend services
└── integration/            # API integration tests
```

## Available Test Commands

### Frontend Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Run tests with coverage
npm run test:unit           # Run only unit tests
npm run test:integration    # Run only integration tests
npm run test:summary        # Run tests with HTML report
```

### Backend Tests
```bash
# From backend directory
python -m pytest tests/     # Run all backend tests
python -m pytest --cov=app  # Run with coverage
```

## Test Configuration

### Jest Configuration
- **File**: `tests/test.config.js`
- **Environment**: JSDOM for browser simulation
- **Coverage**: HTML, LCOV, and JSON reports
- **Reporters**: Console, HTML, and JUnit XML

### Setup Files
- **Main Setup**: `tests/setup.js`
- **Frontend Setup**: `tests/setup-frontend.js`
- **Global Setup**: `tests/global-setup.js`
- **Global Teardown**: `tests/global-teardown.js`

## Writing Tests

### Unit Test Example
```javascript
describe('MyService', () => {
    let service;
    
    beforeEach(() => {
        service = new MyService();
        jest.clearAllMocks();
    });
    
    test('should do something', () => {
        const result = service.doSomething();
        expect(result).toBe(expected);
    });
});
```

### Mocking Dependencies
```javascript
// Mock global objects
global.fetch = jest.fn();
global.CONFIG_UTILS = {
    getApiUrl: jest.fn(),
    getAuthHeaders: jest.fn()
};

// Mock event manager
const mockEventManager = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
};
```

## Common Issues & Solutions

### Missing Methods in Mocks
If you get errors like `this.uiUtils.hideLoading is not a function`:
1. Add the missing method to the mock object
2. Ensure the mock is properly assigned in the test class

### E2E Test Issues
E2E tests are temporarily disabled due to Puppeteer configuration issues. To re-enable:
1. Install proper Puppeteer dependencies
2. Configure WebSocket compatibility
3. Remove `testPathIgnorePatterns` from Jest config

### Coverage Issues
If coverage is too low:
1. Add more test cases
2. Check `collectCoverageFrom` patterns
3. Adjust `coverageThreshold` settings

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Mocking
- Mock external dependencies
- Use `jest.clearAllMocks()` in `beforeEach`
- Test both success and failure scenarios

### Assertions
- Use specific matchers (`toBe`, `toEqual`, `toContain`)
- Test error conditions
- Verify function calls with `toHaveBeenCalled`

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Specific Test
```bash
npm test -- --testNamePattern="should do something"
```

### View HTML Report
Open `tests/results/test-report.html` in your browser for:
- Visual test results
- Filtering by status
- Detailed error information
- Performance metrics

## Continuous Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Push to main branch
- Manual workflow triggers

### Coverage Reports
Coverage reports are generated and can be viewed in:
- HTML format: `tests/coverage/lcov-report/index.html`
- LCOV format: For CI integration
- JSON format: For programmatic access

## Troubleshooting

### Common Errors
1. **"require is not defined"**: Use ES module syntax in Jest config
2. **"TextEncoder is not defined"**: Check polyfill setup in `setup-frontend.js`
3. **"fetch is not defined"**: Ensure fetch is mocked in test setup

### Performance Issues
- Use `--maxWorkers=1` for debugging
- Disable coverage temporarily with `--no-coverage`
- Use `--runInBand` for sequential execution

---

**Happy Testing! 🎉** 