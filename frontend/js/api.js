/**
 * API Integration Layer
 * Handles all communication between frontend and backend
 */

class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        
        // Debug logging
        console.log('🔧 APIClient initialized with:', {
            baseURL: this.baseURL,
            currentProtocol: window.location.protocol,
            currentHostname: window.location.hostname,
            fullCurrentUrl: window.location.href
        });
        
        // Setup online/offline detection
        this.setupNetworkDetection();
        
        // Setup request/response interceptors
        this.setupDefaultInterceptors();
        
        console.log('✅ API Client initialized');
    }
    
    /**
     * Setup network detection
     */
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
            if (window.UIManager) {
                window.UIManager.showToast('Connection restored', 'success');
            }
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            if (window.UIManager) {
                window.UIManager.showToast('Connection lost', 'warning');
            }
        });
    }
    
    /**
     * Setup default interceptors
     */
    setupDefaultInterceptors() {
        // Request interceptor for auth
        this.addRequestInterceptor((config) => {
            const authHeaders = CONFIG_UTILS.getAuthHeaders();
            config.headers = { ...config.headers, ...authHeaders };
            return config;
        });
        
        // Response interceptor for error handling
        this.addResponseInterceptor(
            (response) => response,
            (error) => this.handleAPIError(error)
        );
    }
    
    /**
     * Add request interceptor
     * @param {Function} interceptor - Request interceptor function
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    /**
     * Add response interceptor
     * @param {Function} onSuccess - Success handler
     * @param {Function} onError - Error handler
     */
    addResponseInterceptor(onSuccess, onError) {
        this.responseInterceptors.push({ onSuccess, onError });
    }
    
    /**
     * Make HTTP request
     * @param {Object} config - Request configuration
     * @returns {Promise} Request promise
     */
    async request(config) {
        // Apply request interceptors
        let requestConfig = { ...config };
        for (const interceptor of this.requestInterceptors) {
            requestConfig = interceptor(requestConfig) || requestConfig;
        }
        
        // Check if online for non-GET requests
        if (!this.isOnline && requestConfig.method !== 'GET') {
            return this.queueRequest(requestConfig);
        }
        
        // Prepare fetch options
        const fetchOptions = {
            method: requestConfig.method || 'GET',
            headers: { ...this.defaultHeaders, ...requestConfig.headers },
            signal: requestConfig.signal
        };
        
        // Add body for non-GET requests
        if (requestConfig.data && requestConfig.method !== 'GET') {
            if (requestConfig.data instanceof FormData) {
                fetchOptions.body = requestConfig.data;
                delete fetchOptions.headers['Content-Type']; // Let browser set it
            } else {
                fetchOptions.body = JSON.stringify(requestConfig.data);
            }
        }
        
        // Build URL with query parameters
        const url = this.buildURL(requestConfig.url, requestConfig.params);
        
        try {
            console.log(`📤 API Request: ${requestConfig.method || 'GET'} ${url}`);
            
            // Additional debugging for mixed content detection
            if (url.startsWith('http://')) {
                console.error('❌ MIXED CONTENT DETECTED in API request:', {
                    url: url,
                    method: requestConfig.method,
                    stack: new Error().stack
                });
            }
            
            const response = await fetch(url, fetchOptions);
            
            // Apply response interceptors
            let processedResponse = response;
            for (const interceptor of this.responseInterceptors) {
                if (response.ok && interceptor.onSuccess) {
                    processedResponse = interceptor.onSuccess(processedResponse) || processedResponse;
                } else if (!response.ok && interceptor.onError) {
                    throw await interceptor.onError(response);
                }
            }
            
            // Parse response
            const result = await this.parseResponse(processedResponse);
            
            console.log(`📥 API Response: ${response.status}`, result);
            return result;
            
        } catch (error) {
            console.error(`❌ API Error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Build URL with query parameters
     * @param {string} url - Base URL
     * @param {Object} params - Query parameters
     * @returns {string} Complete URL
     */
    buildURL(url, params) {
        const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
        
        // Debug logging
        console.log('🔧 URL Construction:', {
            inputUrl: url,
            baseURL: this.baseURL,
            fullURL: fullURL,
            hasParams: !!params
        });
        
        // Final safety check: Force HTTPS for production
        let secureURL = fullURL;
        if (window.location.hostname === 'artparty.social' && fullURL.startsWith('http://')) {
            console.warn('⚠️ Final safety check: Converting HTTP to HTTPS');
            secureURL = fullURL.replace('http://', 'https://');
        }
        
        if (!params) return secureURL;
        
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });
        
        const queryString = searchParams.toString();
        const finalURL = queryString ? `${secureURL}?${queryString}` : secureURL;
        
        console.log('🔧 Final URL:', finalURL);
        return finalURL;
    }
    
    /**
     * Parse response based on content type
     * @param {Response} response - Fetch response
     * @returns {*} Parsed response data
     */
    async parseResponse(response) {
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = response;
            
            try {
                error.data = await response.json();
            } catch (e) {
                error.data = await response.text();
            }
            
            throw error;
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            return await response.json();
        } else if (contentType?.includes('text/')) {
            return await response.text();
        } else if (contentType?.includes('image/')) {
            return await response.blob();
        } else {
            return response;
        }
    }
    
    /**
     * Handle API errors
     * @param {Error} error - API error
     * @returns {Promise} Rejected promise
     */
    async handleAPIError(error) {
        if (error.status === 401) {
            // Unauthorized - redirect to login
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            
            // Update main app interface
            if (window.ArtPartySocial) {
                window.ArtPartySocial.showSection('welcome');
                window.ArtPartySocial.updateNavigation();
            }
            
            if (window.UIManager) {
                window.UIManager.showToast('Session expired. Please log in again.', 'error');
            }
        } else if (error.status === 403) {
            // Forbidden
            if (window.UIManager) {
                window.UIManager.showToast('Access denied', 'error');
            }
        } else if (error.status === 404) {
            // Not found
            if (window.UIManager) {
                window.UIManager.showToast('Resource not found', 'error');
            }
        } else if (error.status >= 500) {
            // Server error
            if (window.UIManager) {
                window.UIManager.showToast('Server error. Please try again later.', 'error');
            }
        } else if (!this.isOnline) {
            // Network error
            if (window.UIManager) {
                window.UIManager.showToast('No internet connection', 'warning');
            }
        }
        
        return Promise.reject(error);
    }
    
    /**
     * Queue request for when back online
     * @param {Object} config - Request configuration
     * @returns {Promise} Queued request promise
     */
    queueRequest(config) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ config, resolve, reject });
            
            if (window.UIManager) {
                window.UIManager.showToast('Request queued for when back online', 'info');
            }
        });
    }
    
    /**
     * Process offline queue
     */
    async processOfflineQueue() {
        const queue = [...this.requestQueue];
        this.requestQueue = [];
        
        for (const { config, resolve, reject } of queue) {
            try {
                const result = await this.request(config);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }
    
    /**
     * GET request
     * @param {string} url - Request URL
     * @param {Object} config - Request configuration
     * @returns {Promise} Request promise
     */
    get(url, config = {}) {
        return this.request({ ...config, method: 'GET', url });
    }
    
    /**
     * POST request
     * @param {string} url - Request URL
     * @param {*} data - Request data
     * @param {Object} config - Request configuration
     * @returns {Promise} Request promise
     */
    post(url, data, config = {}) {
        return this.request({ ...config, method: 'POST', url, data });
    }
    
    /**
     * PUT request
     * @param {string} url - Request URL
     * @param {*} data - Request data
     * @param {Object} config - Request configuration
     * @returns {Promise} Request promise
     */
    put(url, data, config = {}) {
        return this.request({ ...config, method: 'PUT', url, data });
    }
    
    /**
     * DELETE request
     * @param {string} url - Request URL
     * @param {Object} config - Request configuration
     * @returns {Promise} Request promise
     */
    delete(url, config = {}) {
        return this.request({ ...config, method: 'DELETE', url });
    }
    
    /**
     * Request with retry logic
     * @param {Object} config - Request configuration
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise} Request promise
     */
    async requestWithRetry(config, maxRetries = this.retryAttempts) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(config);
            } catch (error) {
                lastError = error;
                
                // Don't retry for client errors (4xx)
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                // Don't retry on last attempt
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                const delay = this.retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                console.log(`🔄 Retrying request (attempt ${attempt + 2}/${maxRetries + 1})`);
            }
        }
        
        throw lastError;
    }
}

// API Service Classes
class AuthAPI {
    constructor(client) {
        this.client = client;
    }
    
    async login(credentials) {
        const response = await this.client.post(API_CONFIG.ENDPOINTS.LOGIN, credentials);
        
        if (response.access_token) {
            CONFIG_UTILS.setAuthToken(response.access_token);
            CONFIG_UTILS.setUserData(response.user);
        }
        
        return response;
    }
    
    async register(userData) {
        const response = await this.client.post(API_CONFIG.ENDPOINTS.REGISTER, userData);
        
        if (response.access_token) {
            CONFIG_UTILS.setAuthToken(response.access_token);
            CONFIG_UTILS.setUserData(response.user);
        }
        
        return response;
    }
    
    async refreshToken() {
        return await this.client.post(API_CONFIG.ENDPOINTS.REFRESH);
    }
    
    async logout() {
        try {
            await this.client.post(API_CONFIG.ENDPOINTS.LOGOUT);
        } finally {
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
        }
    }
    
    async getCurrentUser() {
        return await this.client.get(API_CONFIG.ENDPOINTS.ME);
    }
    
    async updateProfile(profileData) {
        return await this.client.put(API_CONFIG.ENDPOINTS.USER_PROFILE, profileData);
    }
    
    async updatePassword(passwordData) {
        return await this.client.put(API_CONFIG.ENDPOINTS.USER_PASSWORD, passwordData);
    }
    
    async deleteAccount() {
        return await this.client.delete(API_CONFIG.ENDPOINTS.USER_ACCOUNT);
    }
    
    async getUserStats() {
        return await this.client.get(API_CONFIG.ENDPOINTS.USER_STATS);
    }
}

class CanvasAPI {
    constructor(client) {
        this.client = client;
    }
    
    async getCanvases(params = {}) {
        return await this.client.get(API_CONFIG.ENDPOINTS.CANVAS, { params });
    }
    
    async getCanvas(id) {
        return await this.client.get(`${API_CONFIG.ENDPOINTS.CANVAS}/${id}`);
    }
    
    async createCanvas(canvasData) {
        return await this.client.post(API_CONFIG.ENDPOINTS.CANVAS, canvasData);
    }
    
    async updateCanvas(id, canvasData) {
        return await this.client.put(`${API_CONFIG.ENDPOINTS.CANVAS}/${id}`, canvasData);
    }
    
    async deleteCanvas(id) {
        return await this.client.delete(`${API_CONFIG.ENDPOINTS.CANVAS}/${id}`);
    }
    
    async getCanvasRegion(id, bounds) {
        const url = API_CONFIG.ENDPOINTS.CANVAS_REGION.replace('{id}', id);
        return await this.client.get(url, { params: bounds });
    }
    
    async getCanvasStats(id) {
        const url = API_CONFIG.ENDPOINTS.CANVAS_STATS.replace('{id}', id);
        return await this.client.get(url);
    }
}

class TileAPI {
    constructor(client) {
        this.client = client;
    }
    
    async createTile(tileData) {
        return await this.client.post(API_CONFIG.ENDPOINTS.TILES, tileData);
    }
    
    async getTile(id) {
        return await this.client.get(`${API_CONFIG.ENDPOINTS.TILES}/${id}`);
    }
    
    async updateTile(id, tileData) {
        return await this.client.put(`${API_CONFIG.ENDPOINTS.TILES}/${id}`, tileData);
    }
    
    async deleteTile(id) {
        return await this.client.delete(`${API_CONFIG.ENDPOINTS.TILES}/${id}`);
    }
    
    async getCanvasTiles(canvasId, params = {}) {
        const url = API_CONFIG.ENDPOINTS.CANVAS_TILES.replace('{id}', canvasId);
        return await this.client.get(url, { params });
    }
    
    async getTileAtPosition(canvasId, x, y) {
        const url = API_CONFIG.ENDPOINTS.CANVAS_TILE_POSITION.replace('{id}', canvasId);
        return await this.client.get(url, { params: { x, y } });
    }
    
    async getUserTiles(userId, params = {}) {
        const url = API_CONFIG.ENDPOINTS.USER_TILES.replace('{id}', userId);
        return await this.client.get(url, { params });
    }
    
    async getTileNeighbors(id) {
        return this.client.get(`/tiles/${id}/neighbors`);
    }
    
    async getAdjacentNeighbors(id) {
        return this.client.get(`/tiles/${id}/adjacent-neighbors`);
    }
    
    async likeTile(id) {
        const url = API_CONFIG.ENDPOINTS.TILE_LIKE.replace('{id}', id);
        return await this.client.post(url);
    }
    
    async unlikeTile(id) {
        const url = API_CONFIG.ENDPOINTS.TILE_LIKE.replace('{id}', id);
        return await this.client.delete(url);
    }
    
    async getTileLikes(id) {
        const url = API_CONFIG.ENDPOINTS.TILE_LIKES.replace('{id}', id);
        return await this.client.get(url);
    }
    
    async getTileStats(id) {
        const url = API_CONFIG.ENDPOINTS.TILE_STATS.replace('{id}', id);
        return await this.client.get(url);
    }
}

class WebSocketAPI {
    constructor(client) {
        this.client = client;
    }
    
    async getStats() {
        return await this.client.get(API_CONFIG.ENDPOINTS.WS_STATS);
    }
    
    async broadcastToCanvas(canvasId, message) {
        const url = API_CONFIG.ENDPOINTS.WS_BROADCAST.replace('{id}', canvasId);
        return await this.client.post(url, message);
    }
}

// Create API instances
const apiClient = new APIClient();
const authAPI = new AuthAPI(apiClient);
const canvasAPI = new CanvasAPI(apiClient);
const tileAPI = new TileAPI(apiClient);
const websocketAPI = new WebSocketAPI(apiClient);

// Higher-level API functions
const API = {
    // Authentication
    auth: {
        login: (credentials) => authAPI.login(credentials),
        register: (userData) => authAPI.register(userData),
        logout: () => authAPI.logout(),
        refreshToken: () => authAPI.refreshToken(),
        getCurrentUser: () => authAPI.getCurrentUser(),
        updateProfile: (data) => authAPI.updateProfile(data),
        updatePassword: (data) => authAPI.updatePassword(data),
        deleteAccount: () => authAPI.deleteAccount(),
        getUserStats: () => authAPI.getUserStats()
    },
    
    // Canvas management
    canvas: {
        list: (params) => canvasAPI.getCanvases(params),
        get: (id) => canvasAPI.getCanvas(id),
        create: (data) => canvasAPI.createCanvas(data),
        update: (id, data) => canvasAPI.updateCanvas(id, data),
        delete: (id) => canvasAPI.deleteCanvas(id),
        getRegion: (id, bounds) => canvasAPI.getCanvasRegion(id, bounds),
        getStats: (id) => canvasAPI.getCanvasStats(id)
    },
    
    // Tile management
    tiles: {
        create: (data) => tileAPI.createTile(data),
        get: (id) => tileAPI.getTile(id),
        update: (id, data) => tileAPI.updateTile(id, data),
        delete: (id) => tileAPI.deleteTile(id),
        getForCanvas: (canvasId, params) => tileAPI.getCanvasTiles(canvasId, params),
        getAtPosition: (canvasId, x, y) => tileAPI.getTileAtPosition(canvasId, x, y),
        getForUser: (userId, params) => tileAPI.getUserTiles(userId, params),
        getNeighbors: (id) => tileAPI.getTileNeighbors(id),
        getAdjacentNeighbors: (id) => tileAPI.getAdjacentNeighbors(id),
        like: (id) => tileAPI.likeTile(id),
        unlike: (id) => tileAPI.unlikeTile(id),
        getLikes: (id) => tileAPI.getTileLikes(id),
        getStats: (id) => tileAPI.getTileStats(id)
    },
    
    // WebSocket
    websocket: {
        getStats: () => websocketAPI.getStats(),
        broadcast: (canvasId, message) => websocketAPI.broadcastToCanvas(canvasId, message)
    }
};

// Export API instances
window.API = API;
window.APIClient = apiClient;

// Integration with main app
if (window.ArtPartySocial) {
    // Add API methods to main app
    window.ArtPartySocial.api = API;
    
    // Setup automatic token refresh
    setInterval(async () => {
        if (CONFIG_UTILS.isAuthenticated()) {
            try {
                await API.auth.refreshToken();
            } catch (error) {
                console.warn('Token refresh failed:', error);
                // Token refresh will be handled by the error interceptor
            }
        }
    }, 15 * 60 * 1000); // Refresh every 15 minutes
}

console.log('✅ API integration loaded'); 