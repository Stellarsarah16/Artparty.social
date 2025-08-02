/**
 * Comprehensive Test Configuration for StellarCollabApp
 * Configures Jest for frontend and backend testing
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    // Test environment setup
    testEnvironment: 'jsdom',
    
    // Root directory for tests
    rootDir: path.resolve(__dirname, '..'),
    
    // Test directories - Exclude E2E tests for now
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/frontend/tests/**/*.js'
    ],
    
    // Exclude E2E tests until Puppeteer is properly configured
    testPathIgnorePatterns: [
        '<rootDir>/tests/e2e/',
        '<rootDir>/node_modules/'
    ],
    
    // Module file extensions
    moduleFileExtensions: ['js', 'json'],
    
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
    
    // Test coverage configuration - ENABLED with HTML report
    collectCoverage: true,
    coverageDirectory: '<rootDir>/tests/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    
    // Coverage collection patterns
    collectCoverageFrom: [
        'frontend/js/**/*.js',
        '!frontend/js/config.js',
        '!frontend/js/config-fixed.js',
        '!**/node_modules/**',
        '!**/venv/**',
        '!**/dist/**',
        '!**/build/**',
        '!**/*.config.js',
        '!**/*.test.js'
    ],
    
    // Coverage thresholds (lowered for initial testing)
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
        }
    },
    
    // Transform files for testing
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
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
    
    // Reporters - Multiple formats for better viewing
    reporters: [
        'default',
        [
            'jest-html-reporter',
            {
                outputPath: '<rootDir>/tests/results/test-report.html',
                pageTitle: 'StellarCollabApp Test Results',
                includeFailureMsg: true,
                includeConsoleLog: true,
                styleOverridePath: path.resolve(__dirname, 'custom-styles.css')
            }
        ],
        [
            'jest-junit',
            {
                outputDirectory: '<rootDir>/tests/results',
                outputName: 'test-results.xml'
            }
        ]
    ]
}; 