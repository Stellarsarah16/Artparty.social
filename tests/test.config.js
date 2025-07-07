/**
 * Comprehensive Test Configuration for StellarCollabApp
 * Configures Jest for frontend and backend testing
 */

const path = require('path');

module.exports = {
    // Test environment setup
    testEnvironment: 'jsdom',
    
    // Root directory for tests
    rootDir: path.resolve(__dirname, '..'),
    
    // Test directories
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.test.py',
        '<rootDir>/backend/tests/**/*.py',
        '<rootDir>/frontend/tests/**/*.js'
    ],
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json', 'py'],
    
    // Module name mapping for path resolution
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/js/$1',
        '^@backend/(.*)$': '<rootDir>/backend/app/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
    },
    
    // Setup files to run before tests
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js'
    ],
    
    // Test coverage configuration
    collectCoverage: true,
    coverageDirectory: '<rootDir>/tests/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    
    // Coverage collection patterns
    collectCoverageFrom: [
        'frontend/js/**/*.js',
        'backend/app/**/*.py',
        '!frontend/js/config.js',
        '!backend/app/main.py',
        '!**/node_modules/**',
        '!**/venv/**',
        '!**/dist/**',
        '!**/build/**',
        '!**/*.config.js',
        '!**/*.test.js',
        '!**/*.test.py'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        },
        './frontend/js/services/': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        },
        './backend/app/services/': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    
    // Transform files for testing
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
        '^.+\\.py$': 'jest-python-transform'
    },
    
    // Ignore patterns for transformation
    transformIgnorePatterns: [
        '/node_modules/(?!(@babel|babel-preset-react-app)/)'
    ],
    
    // Test timeout
    testTimeout: 30000,
    
    // Verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Test runner configuration
    testRunner: 'jest-circus/runner',
    
    // Global setup and teardown
    globalSetup: '<rootDir>/tests/global-setup.js',
    globalTeardown: '<rootDir>/tests/global-teardown.js',
    
    // Reporters
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: '<rootDir>/tests/results',
                outputName: 'test-results.xml'
            }
        ],
        [
            'jest-html-reporter',
            {
                outputPath: '<rootDir>/tests/results/test-report.html',
                pageTitle: 'StellarCollabApp Test Results'
            }
        ]
    ],
    
    // Projects configuration for multi-environment testing
    projects: [
        {
            displayName: 'Frontend Unit Tests',
            testMatch: ['<rootDir>/tests/frontend/unit/**/*.test.js'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/setup-frontend.js']
        },
        {
            displayName: 'Frontend Integration Tests',
            testMatch: ['<rootDir>/tests/frontend/integration/**/*.test.js'],
            testEnvironment: 'jsdom',
            setupFilesAfterEnv: ['<rootDir>/tests/setup-frontend.js']
        },
        {
            displayName: 'Backend Unit Tests',
            testMatch: ['<rootDir>/tests/backend/unit/**/*.test.py'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/setup-backend.py']
        },
        {
            displayName: 'Backend Integration Tests',
            testMatch: ['<rootDir>/tests/backend/integration/**/*.test.py'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/setup-backend.py']
        },
        {
            displayName: 'E2E Tests',
            testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/tests/setup-e2e.js']
        }
    ]
}; 