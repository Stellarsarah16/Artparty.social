/**
 * Configuration for StellarArtCollab Frontend
 * Production-ready configuration without debug code
 */

// Enhanced environment detection
const ENVIRONMENT = {
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname.includes('local') ||
                   window.location.hostname.includes('dev'),
    isStaging: window.location.hostname.includes('staging'),
    isProduction: !window.location.hostname.includes('localhost') && 
                  !window.location.hostname.includes('127.0.0.1') &&
                  !window.location.hostname.includes('local') &&
                  !window.location.hostname.includes('staging')
};

// Force reload configuration to prevent caching issues
if (window.location.hostname === 'artparty.social' && window.location.protocol !== 'https:') {
    console.warn('⚠️ Redirecting to HTTPS for security');
    window.location.href = window.location.href.replace('http:', 'https:');
}

// Enhanced base URLs based on environment
const getBaseUrls = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Debug logging
    console.log('🔧 Environment Detection:', {
        hostname,
        protocol,
        port,
        isDevelopment: ENVIRONMENT.isDevelopment,
        isStaging: ENVIRONMENT.isStaging,
        isProduction: ENVIRONMENT.isProduction,
        fullUrl: window.location.href
    });
    
    // Development detection (local development)
    if (ENVIRONMENT.isDevelopment) {
        console.log('🔧 Using development URLs');
        return {
            API_BASE_URL: 'http://localhost:8000',
            WS_BASE_URL: 'ws://localhost:8000'
        };
    }
    
    // Staging environment
    if (ENVIRONMENT.isStaging) {
        console.log('🔧 Using staging URLs');
        return {
            API_BASE_URL: `${protocol}//staging-api.artparty.social`,
            WS_BASE_URL: `${protocol === 'https:' ? 'wss:' : 'ws:'}//staging-api.artparty.social`
        };
    }
    
    // Production - Force HTTPS for security
    if (hostname === 'artparty.social' || hostname.includes('artparty.social')) {
        console.log('🔧 Using production URLs with forced HTTPS');
        return {
            API_BASE_URL: 'https://artparty.social',
            WS_BASE_URL: 'wss://artparty.social'
        };
    }
    
    // Production - Same domain with nginx proxy (recommended approach)
    if (port === '80' || port === '443' || port === '') {
        console.log('🔧 Using same-domain production URLs');
        // Force HTTPS for production
        const secureProtocol = protocol === 'https:' ? 'https:' : 'https:';
        return {
            API_BASE_URL: `${secureProtocol}//${hostname}`,
            WS_BASE_URL: `${secureProtocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}`
        };
    }
    
    // Custom port (testing/development with custom ports)
    console.log('🔧 Using custom port URLs');
    return {
        API_BASE_URL: `${protocol}//${hostname}:${port}`,
        WS_BASE_URL: `${protocol === 'https:' ? 'wss:' : 'ws:'}//${hostname}:${port}`
    };
};

const { API_BASE_URL, WS_BASE_URL } = getBaseUrls();

// Safety check: Ensure HTTPS for production
const getSecureBaseURL = (baseURL) => {
    if (window.location.hostname === 'artparty.social' && baseURL.startsWith('http://')) {
        console.warn('⚠️ Forcing HTTPS for production security');
        return baseURL.replace('http://', 'https://');
    }
    return baseURL;
};

const getSecureWSURL = (wsURL) => {
    if (window.location.hostname === 'artparty.social' && wsURL.startsWith('ws://')) {
        console.warn('⚠️ Forcing WSS for production security');
        return wsURL.replace('ws://', 'wss://');
    }
    return wsURL;
};

const SECURE_API_BASE_URL = getSecureBaseURL(API_BASE_URL);
const SECURE_WS_BASE_URL = getSecureWSURL(WS_BASE_URL);

// Log final configuration
console.log('🔧 Final Secure Configuration:', {
    originalAPI: API_BASE_URL,
    secureAPI: SECURE_API_BASE_URL,
    originalWS: WS_BASE_URL,
    secureWS: SECURE_WS_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol
});

// Fallback API URLs in case primary fails
const FALLBACK_URLS = {
    development: [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001'
    ],
    staging: [
        `${window.location.protocol}//staging-api.artparty.social`,
        `${window.location.protocol}//staging.artparty.social/api`
    ],
    production: [
        `${window.location.protocol}//${window.location.hostname}`,
        `${window.location.protocol}//artparty.social`
    ]
};

// API Configuration
const API_CONFIG = {
    // Base URL for API calls - dynamically set based on environment
    BASE_URL: SECURE_API_BASE_URL,
    
    // Fallback URLs
    FALLBACK_URLS: FALLBACK_URLS[ENVIRONMENT.isDevelopment ? 'development' : 
                                  ENVIRONMENT.isStaging ? 'staging' : 'production'],
    
    // API endpoints
    ENDPOINTS: {
        // Authentication
        REGISTER: '/api/v1/auth/register',
        LOGIN: '/api/v1/auth/login',
        REFRESH: '/api/v1/auth/refresh',
        LOGOUT: '/api/v1/auth/logout',
        ME: '/api/v1/auth/me',
        
        // Users
        USERS: '/api/v1/users',
        USER_PROFILE: '/api/v1/users/profile',
        USER_STATS: '/api/v1/users/stats',
        USER_PASSWORD: '/api/v1/users/password',
        USER_ACCOUNT: '/api/v1/users/account',
        
        // Canvas
        CANVAS: '/api/v1/canvas/',
        CANVAS_REGION: '/api/v1/canvas/{id}/region',
        CANVAS_STATS: '/api/v1/canvas/{id}/stats',
        
        // Tiles
        TILES: '/api/v1/tiles',
        TILE_LIKE: '/api/v1/tiles/{id}/like',
        TILE_LIKES: '/api/v1/tiles/{id}/likes',
        TILE_STATS: '/api/v1/tiles/{id}/like-stats',
        TILE_NEIGHBORS: '/api/v1/tiles/{id}/neighbors',
        CANVAS_TILES: '/api/v1/tiles/canvas/{id}',
        CANVAS_TILE_POSITION: '/api/v1/tiles/canvas/{id}/position',
        USER_TILES: '/api/v1/tiles/user/{id}',
        
        // WebSocket
        WS_STATS: '/api/v1/ws/stats',
        WS_CANVAS: '/api/v1/ws/canvas/{id}',
        WS_BROADCAST: '/api/v1/ws/broadcast/{id}',
        
        // Debug/Testing
        CORS_DEBUG: '/cors-debug',
        CORS_TEST: '/api/v1/cors-test'
    }
};

// WebSocket Configuration
const WS_CONFIG = {
    // WebSocket URL - dynamically set based on environment
    BASE_URL: SECURE_WS_BASE_URL,
    
    // Connection settings
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    HEARTBEAT_INTERVAL: 30000,
    
    // Message types
    MESSAGE_TYPES: {
        // Client to server
        PING: 'ping',
        REQUEST_CANVAS_STATE: 'request_canvas_state',
        TYPING_INDICATOR: 'typing_indicator',
        
        // Server to client
        PONG: 'pong',
        CANVAS_STATE: 'canvas_state',
        USER_JOINED: 'user_joined',
        USER_LEFT: 'user_left',
        TILE_CREATED: 'tile_created',
        TILE_UPDATED: 'tile_updated',
        TILE_DELETED: 'tile_deleted',
        TILE_LIKED: 'tile_liked',
        TILE_UNLIKED: 'tile_unliked',
        USER_TYPING: 'user_typing',
        ADMIN_MESSAGE: 'admin_message'
    }
};

// Application Configuration
const APP_CONFIG = {
    // Application info
    NAME: 'Artparty.Social',
    VERSION: '1.0.0',
    DESCRIPTION: 'Collaborative Pixel Art Platform',
    
    // Canvas settings
    CANVAS: {
        TILE_SIZE: 32,
        DEFAULT_WIDTH: 1024,
        DEFAULT_HEIGHT: 1024,
        MAX_WIDTH: 4096,
        MAX_HEIGHT: 4096,
        GRID_COLOR: '#e2e8f0',
        BACKGROUND_COLOR: '#f8fafc'
    },
    
    // Pixel editor settings
    PIXEL_EDITOR: {
        CANVAS_SIZE: 512,
        GRID_SIZE: 16,
        DEFAULT_COLORS: [
            '#000000', '#ffffff', '#ff0000', '#00ff00',
            '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
            '#800000', '#008000', '#000080', '#808000',
            '#800080', '#008080', '#c0c0c0', '#808080',
            '#ffa500', '#a52a2a', '#dda0dd', '#98fb98',
            '#f0e68c', '#dda0dd', '#87ceeb', '#ff69b4'
        ],
        BRUSH_SIZES: [1, 2, 3, 4],
        TOOLS: {
            PAINT: 'paint',
            ERASER: 'eraser',
            PICKER: 'picker',
            FILL: 'fill'
        }
    },
    
    // UI settings
    UI: {
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 3000,
        DEBOUNCE_DELAY: 300,
        PAGINATION_LIMIT: 20,
        THEME: {
            LIGHT: 'light',
            DARK: 'dark'
        }
    },
    
    // LocalStorage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'artparty_social_token',
        USER_DATA: 'artparty_social_user',
        THEME: 'artparty_social_theme',
        PREFERENCES: 'artparty_social_preferences'
    },
    
    // Error messages
    ERRORS: {
        NETWORK_ERROR: 'Network error. Please check your connection.',
        AUTH_ERROR: 'Authentication failed. Please log in again.',
        PERMISSION_ERROR: 'You don\'t have permission to perform this action.',
        VALIDATION_ERROR: 'Please check your input and try again.',
        SERVER_ERROR: 'Server error. Please try again later.',
        WEBSOCKET_ERROR: 'Real-time connection failed. Some features may not work.',
        CANVAS_LOAD_ERROR: 'Failed to load canvas. Please try again.',
        TILE_SAVE_ERROR: 'Failed to save tile. Please try again.',
        LIKE_ERROR: 'Failed to like tile. Please try again.',
        CORS_ERROR: 'Cross-origin request failed. Please check your network connection.'
    },
    
    // Success messages
    SUCCESS: {
        LOGIN: 'Successfully logged in!',
        REGISTER: 'Account created successfully!',
        LOGOUT: 'Successfully logged out!',
        CANVAS_CREATED: 'Canvas created successfully!',
        TILE_SAVED: 'Tile saved successfully!',
        TILE_LIKED: 'Tile liked!',
        TILE_UNLIKED: 'Tile unliked!',
        PROFILE_UPDATED: 'Profile updated successfully!',
        PASSWORD_CHANGED: 'Password changed successfully!'
    },
    
    // Debug settings
    DEBUG_CANVAS: ENVIRONMENT.isDevelopment,
    DEBUG_WEBSOCKET: ENVIRONMENT.isDevelopment,
    DEBUG_AUTH: ENVIRONMENT.isDevelopment
};

// Utility functions
const CONFIG_UTILS = {
    /**
     * Get full API URL by combining base URL with endpoint
     */
    getApiUrl(endpoint) {
        return `${API_CONFIG.BASE_URL}${endpoint}`;
    },
    
    /**
     * Get API URL with fallback support
     */
    getApiUrlWithFallback(endpoint, fallbackIndex = 0) {
        if (fallbackIndex === 0) {
            return `${API_CONFIG.BASE_URL}${endpoint}`;
        }
        
        const fallbacks = API_CONFIG.FALLBACK_URLS;
        if (fallbackIndex - 1 < fallbacks.length) {
            return `${fallbacks[fallbackIndex - 1]}${endpoint}`;
        }
        
        return `${API_CONFIG.BASE_URL}${endpoint}`;
    },
    
    /**
     * Get WebSocket URL for canvas
     */
    getWebSocketUrl(canvasId) {
        return `${WS_CONFIG.BASE_URL}/api/v1/ws/canvas/${canvasId}`;
    },

    /**
     * Get WebSocket URL with authentication
     */
    getWsUrl(canvasId, token) {
        const baseUrl = WS_CONFIG.BASE_URL;
        const wsUrl = `${baseUrl}/api/v1/ws/canvas/${canvasId}`;
        return token ? `${wsUrl}?token=${token}` : wsUrl;
    },
    
    // Authentication methods
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getAuthToken();
        const userData = this.getUserData();
        return !!(token && userData);
    },
    
    /**
     * Get authentication token from localStorage
     */
    getAuthToken() {
        return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    },
    
    /**
     * Set authentication token in localStorage
     */
    setAuthToken(token) {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    },
    
    /**
     * Remove authentication token from localStorage
     */
    removeAuthToken() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    },
    
    /**
     * Get user data from localStorage
     */
    getUserData() {
        try {
            const userData = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    },
    
    /**
     * Set user data in localStorage
     */
    setUserData(userData) {
        try {
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
        } catch (error) {
            console.error('Error storing user data:', error);
        }
    },
    
    /**
     * Remove user data from localStorage
     */
    removeUserData() {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    },
    
    /**
     * Get authentication headers for API requests
     */
    getAuthHeaders() {
        const token = this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },
    
    // Utility methods
    
    /**
     * Debounce function to limit function calls
     */
    debounce(func, delay = APP_CONFIG.UI.DEBOUNCE_DELAY) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    /**
     * Generate UUID
     */
    generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * Test CORS configuration
     */
    async testCors() {
        try {
            const response = await fetch(this.getApiUrl(API_CONFIG.ENDPOINTS.CORS_TEST), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                return { success: false, error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Get environment information
     */
    getEnvironmentInfo() {
        return {
            environment: ENVIRONMENT,
            api_base_url: API_CONFIG.BASE_URL,
            ws_base_url: WS_CONFIG.BASE_URL,
            fallback_urls: API_CONFIG.FALLBACK_URLS,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            port: window.location.port,
            origin: window.location.origin
        };
    },

    // Logging utilities
    
    /**
     * Safe logging that won't cause errors
     */
    safeLog(...args) {
        try {
            console.log(...args);
        } catch (error) {
            // Fallback to basic logging
            try {
                console.log(args.join(' '));
            } catch (e) {
                // Silent fail - don't break the app
            }
        }
    },

    /**
     * Throttled logging to prevent console spam
     */
    throttledLog: (() => {
        const logCounts = new Map();
        const resetInterval = 5000; // Reset counters every 5 seconds
        
        setInterval(() => {
            logCounts.clear();
        }, resetInterval);
        
        return (level, ...args) => {
            const key = args.join(' ');
            const count = logCounts.get(key) || 0;
            
            if (count < 3) { // Allow max 3 logs per message per 5 seconds
                logCounts.set(key, count + 1);
                
                try {
                    if (level === 'warn') {
                        console.warn(...args);
                    } else if (level === 'error') {
                        console.error(...args);
                    } else {
                        console.log(...args);
                    }
                } catch (error) {
                    // Silent fail
                }
            }
        };
    })(),

    /**
     * Debug logging (only in development)
     */
    debug(...args) {
        if (ENVIRONMENT.isDevelopment) {
            try {
                console.log('🐛 DEBUG:', ...args);
            } catch (error) {
                // Silent fail
            }
        }
    },

    /**
     * Prevent console spam by throttling repeated messages
     */
    preventConsoleSpam: (() => {
        const spamTracker = new Map();
        const spamThreshold = 10; // Max 10 identical messages per minute
        const resetInterval = 60000; // Reset every minute
        
        setInterval(() => {
            spamTracker.clear();
        }, resetInterval);
        
        return (message) => {
            const count = spamTracker.get(message) || 0;
            if (count < spamThreshold) {
                spamTracker.set(message, count + 1);
                return false; // Not spam
            }
            return true; // Is spam
        };
    })()
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        WS_CONFIG,
        APP_CONFIG,
        CONFIG_UTILS,
        ENVIRONMENT
    };
}

// Make configurations available globally
window.APP_CONFIG = APP_CONFIG;
window.API_CONFIG = API_CONFIG;
window.WS_CONFIG = WS_CONFIG;
window.CONFIG_UTILS = CONFIG_UTILS; 
window.ENVIRONMENT = ENVIRONMENT;

// Simple initialization log
console.log('✅ Artparty.Social configuration loaded');
console.log('🔧 HTTPS FIX VERSION 1.1.0 LOADED - Mixed content error should be resolved');
console.log('🔧 Current configuration:', {
    API_BASE_URL: API_CONFIG.BASE_URL,
    WS_BASE_URL: WS_CONFIG.BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    timestamp: new Date().toISOString()
});
if (ENVIRONMENT.isDevelopment) {
    console.log('🔧 Development mode - API:', API_CONFIG.BASE_URL);
} 