/**
 * Configuration for StellarArtCollab Frontend
 */

// API Configuration
const API_CONFIG = {
    // Base URL for API calls
    BASE_URL: 'http://localhost:8000',
    
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
        CANVAS: '/api/v1/canvas',
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
        WS_BROADCAST: '/api/v1/ws/broadcast/{id}'
    }
};

// WebSocket Configuration
const WS_CONFIG = {
    // WebSocket URL
    BASE_URL: 'ws://localhost:8000',
    
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
    NAME: 'StellarArtCollab',
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
    
    // Storage keys
    STORAGE: {
        AUTH_TOKEN: 'stellarartcollab_auth_token',
        USER_DATA: 'stellarartcollab_user_data',
        THEME: 'stellarartcollab_theme',
        PREFERENCES: 'stellarartcollab_preferences'
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
        LIKE_ERROR: 'Failed to like tile. Please try again.'
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
    }
};

// Utility functions
const CONFIG_UTILS = {
    /**
     * Get full API URL by combining base URL with endpoint
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters to replace
     * @returns {string} Full API URL
     */
    getApiUrl: (endpoint, params = {}) => {
        let url = API_CONFIG.BASE_URL + endpoint;
        
        // Replace URL parameters
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    },
    
    /**
     * Get WebSocket URL for canvas
     * @param {number} canvasId - Canvas ID
     * @param {string} token - Authentication token
     * @returns {string} WebSocket URL
     */
    getWsUrl: (canvasId, token) => {
        return `${WS_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WS_CANVAS.replace('{id}', canvasId)}?token=${token}`;
    },
    
    /**
     * Get stored auth token
     * @returns {string|null} Auth token
     */
    getAuthToken: () => {
        return localStorage.getItem(APP_CONFIG.STORAGE.AUTH_TOKEN);
    },
    
    /**
     * Store auth token
     * @param {string} token - Auth token
     */
    setAuthToken: (token) => {
        localStorage.setItem(APP_CONFIG.STORAGE.AUTH_TOKEN, token);
    },
    
    /**
     * Remove auth token
     */
    removeAuthToken: () => {
        localStorage.removeItem(APP_CONFIG.STORAGE.AUTH_TOKEN);
    },
    
    /**
     * Get stored user data
     * @returns {Object|null} User data
     */
    getUserData: () => {
        const data = localStorage.getItem(APP_CONFIG.STORAGE.USER_DATA);
        return data ? JSON.parse(data) : null;
    },
    
    /**
     * Store user data
     * @param {Object} userData - User data
     */
    setUserData: (userData) => {
        localStorage.setItem(APP_CONFIG.STORAGE.USER_DATA, JSON.stringify(userData));
    },
    
    /**
     * Remove user data
     */
    removeUserData: () => {
        localStorage.removeItem(APP_CONFIG.STORAGE.USER_DATA);
    },
    
    /**
     * Check if user is authenticated
     * @returns {boolean} Is authenticated
     */
    isAuthenticated: () => {
        const token = CONFIG_UTILS.getAuthToken();
        return token !== null && token !== '';
    },
    
    /**
     * Get authorization headers
     * @returns {Object} Authorization headers
     */
    getAuthHeaders: () => {
        const token = CONFIG_UTILS.getAuthToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },
    
    /**
     * Format error message
     * @param {string|Error} error - Error message or object
     * @returns {string} Formatted error message
     */
    formatError: (error) => {
        if (typeof error === 'string') {
            return error;
        }
        if (error.message) {
            return error.message;
        }
        if (error.detail) {
            return error.detail;
        }
        return APP_CONFIG.ERRORS.SERVER_ERROR;
    },
    
    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    },
    
    /**
     * Format number with commas
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * Generate UUID
     * @returns {string} UUID
     */
    generateUuid: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        WS_CONFIG,
        APP_CONFIG,
        CONFIG_UTILS
    };
} 