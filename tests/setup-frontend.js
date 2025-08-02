/**
 * Frontend Test Setup
 * Global setup for frontend JavaScript tests
 */

// Set up TextEncoder/TextDecoder BEFORE importing JSDOM
if (typeof global !== 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}

// Now import JSDOM
const { JSDOM } = require('jsdom');

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Mock console methods for testing
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
}));

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn()
}));

// Mock global application config
global.CONFIG_UTILS = {
    getApiUrl: jest.fn(endpoint => `http://localhost:8000${endpoint}`),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
    removeAuthToken: jest.fn(),
    setUserData: jest.fn(),
    getUserData: jest.fn(),
    removeUserData: jest.fn(),
    getAuthHeaders: jest.fn(() => ({
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
    })),
    isAuthenticated: jest.fn(() => false)
};

global.API_CONFIG = {
    BASE_URL: 'http://localhost:8000',
    ENDPOINTS: {
        LOGIN: '/api/v1/auth/login',
        REGISTER: '/api/v1/auth/register',
        LOGOUT: '/api/v1/auth/logout',
        ME: '/api/v1/auth/me',
        CANVAS: '/api/v1/canvas',
        TILES: '/api/v1/tiles'
    }
};

global.APP_CONFIG = {
    STORAGE: {
        AUTH_TOKEN: 'stellar_auth_token',
        USER_DATA: 'stellar_user_data',
        PREFERENCES: 'stellar_preferences'
    },
    CANVAS: {
        DEFAULT_WIDTH: 100,
        DEFAULT_HEIGHT: 100,
        MAX_WIDTH: 1000,
        MAX_HEIGHT: 1000
    }
};

// Test utilities
global.testUtils = {
    createMockUser: (overrides = {}) => ({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        ...overrides
    }),
    
    createMockCanvas: (overrides = {}) => ({
        id: 1,
        name: 'Test Canvas',
        width: 100,
        height: 100,
        public: true,
        created_at: '2023-01-01T00:00:00Z',
        ...overrides
    }),
    
    createMockTile: (overrides = {}) => ({
        id: 1,
        canvas_id: 1,
        x: 0,
        y: 0,
        color: '#FF0000',
        created_at: '2023-01-01T00:00:00Z',
        ...overrides
    }),
    
    mockFetchSuccess: (data) => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => data
        });
    },
    
    mockFetchError: (error = {}, status = 400) => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status,
            json: async () => error
        });
    },
    
    mockFetchNetworkError: (message = 'Network error') => {
        global.fetch.mockRejectedValueOnce(new Error(message));
    },
    
    createMockDOM: (html = '<div></div>') => {
        document.body.innerHTML = html;
        return document.body.firstElementChild;
    },
    
    triggerEvent: (element, eventType, options = {}) => {
        const event = new dom.window.Event(eventType, options);
        element.dispatchEvent(event);
        return event;
    },
    
    waitFor: (condition, timeout = 1000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkCondition = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for condition`));
                } else {
                    setTimeout(checkCondition, 10);
                }
            };
            checkCondition();
        });
    }
};

// Setup test environment before each test
beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset console mocks
    console.log.mockClear();
    console.warn.mockClear();
    console.error.mockClear();
    console.info.mockClear();
    console.debug.mockClear();
    
    // Reset fetch mock
    global.fetch.mockClear();
    
    // Reset CONFIG_UTILS mocks
    Object.keys(global.CONFIG_UTILS).forEach(key => {
        if (typeof global.CONFIG_UTILS[key] === 'function') {
            global.CONFIG_UTILS[key].mockClear();
        }
    });
});

// Cleanup after each test
afterEach(() => {
    // Clean up any remaining timers
    jest.useRealTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});

// Add custom matchers
expect.extend({
    toBeInDOM(received) {
        const pass = document.body.contains(received);
        return {
            pass,
            message: () => `Expected element ${pass ? 'not ' : ''}to be in DOM`
        };
    },
    
    toHaveBeenCalledWithUrl(received, expectedUrl) {
        const calls = received.mock.calls;
        const pass = calls.some(call => call[0] === expectedUrl);
        return {
            pass,
            message: () => `Expected fetch to have been called with URL ${expectedUrl}`
        };
    }
}); 