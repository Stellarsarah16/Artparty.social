/**
 * Artparty.social API Integration Layer
 * Copyright (c) 2025 Artparty.social. All rights reserved.
 * 
 * Handles all communication between frontend and backend services.
 * This file is part of Artparty.social's proprietary codebase.
 */

class APIClient {
    constructor() {
        // Use the secure base URL from config
        let baseURL = API_CONFIG.BASE_URL;
        
        // Only force HTTP for localhost development, never for production
        if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
            baseURL.includes('localhost') && baseURL.startsWith('https://')) {
            console.warn('⚠️ APIClient: Forcing HTTP for localhost development');
            baseURL = baseURL.replace('https://', 'http://');
        }
        
        // Force HTTPS for production domain
        if (window.location.hostname === 'artparty.social' && baseURL.startsWith('http://')) {
            console.warn('⚠️ APIClient: Forcing HTTPS for production');
            baseURL = baseURL.replace('http://', 'https://');
        }
        
        this.baseURL = baseURL;
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
            originalBaseURL: API_CONFIG.BASE_URL,
            finalBaseURL: this.baseURL,
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
        // Request interceptor for auth (exclude auth endpoints)
        this.addRequestInterceptor((config) => {
            // Don't add auth headers to authentication endpoints
            const authEndpoints = [
                API_CONFIG.ENDPOINTS.LOGIN,
                API_CONFIG.ENDPOINTS.REGISTER,
                API_CONFIG.ENDPOINTS.REFRESH
            ];
            
            const isAuthEndpoint = authEndpoints.some(endpoint => 
                config.url.includes(endpoint)
            );
            
            if (!isAuthEndpoint) {
                const authHeaders = CONFIG_UTILS.getAuthHeaders();
                config.headers = { ...config.headers, ...authHeaders };
            }
            
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
        
        // Use smart logger if available, fallback to regular logging
        const logger = window.smartLogger || console;
        const method = requestConfig.method || 'GET';
        const endpoint = url.replace(this.baseURL, ''); // Clean endpoint for logging
        
        if (window.smartLogger) {
            return window.smartLogger.apiOperation(method, endpoint, async () => {
                return await this._executeRequest(url, fetchOptions);
            });
        } else {
            // Fallback to regular logging
            try {
                console.log(`📤 API: ${method} ${endpoint}`);
                
                // Mixed content detection (production only)
                if (window.location.hostname === 'artparty.social' && url.startsWith('http://')) {
                    console.error('❌ MIXED CONTENT DETECTED:', endpoint);
                }
                
                const result = await this._executeRequest(url, fetchOptions);
                console.log(`📥 API: ${method} ${endpoint} ✅`);
                return result;
                
            } catch (error) {
                console.error(`❌ API: ${method} ${endpoint} - ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * Execute a function with retry logic for 503 errors
     * @param {Function} apiCall - Function to execute
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} baseDelay - Base delay between retries
     * @param {boolean} suppressToastOnRetry - Don't show toast for retried errors
     * @returns {Promise} Result of the API call
     */
    async executeWithRetry(apiCall, maxRetries = 3, baseDelay = 1000, suppressToastOnRetry = true) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;
                
                if (error.status === 503 && attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`🔄 API call attempt ${attempt}/${maxRetries} failed with 503, retrying in ${delay}ms...`);
                    
                    // Don't show toast for retry attempts, only log to console
                    if (!suppressToastOnRetry) {
                        // Only show toast if explicitly requested
                        if (window.UIManager) {
                            window.UIManager.showToast(`Server busy, retrying... (${attempt}/${maxRetries})`, 'warning');
                        }
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                // For final failure or non-503 errors, let normal error handling occur
                throw error;
            }
        }
        
        // Should never reach here, but just in case
        throw lastError;
    }
    
    /**
     * Execute the actual HTTP request
     * @param {string} url - Complete URL
     * @param {Object} fetchOptions - Fetch options
     * @returns {Promise} Response data
     */
    async _executeRequest(url, fetchOptions) {
        // Mixed content detection (production only)
        if (window.location.hostname === 'artparty.social' && url.startsWith('http://')) {
            console.error('❌ MIXED CONTENT DETECTED in API request:', {
                url: url,
                method: fetchOptions.method,
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
        return await this.parseResponse(processedResponse);
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
        
        // AGGRESSIVE localhost HTTP enforcement
        let secureURL = fullURL;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            if (fullURL.includes('localhost') && fullURL.startsWith('https://')) {
                console.warn('⚠️ AGGRESSIVE: Converting HTTPS to HTTP for localhost API');
                secureURL = fullURL.replace('https://', 'http://');
            }
            // Also check if the URL is missing the port
            if (fullURL.includes('localhost') && !fullURL.includes(':8000')) {
                console.warn('⚠️ AGGRESSIVE: Adding port 8000 to localhost URL');
                secureURL = fullURL.replace('localhost', 'localhost:8000');
            }
        }
        
        // Final safety check: Force HTTPS for production only
        if (window.location.hostname === 'artparty.social' && secureURL.startsWith('http://')) {
            console.warn('⚠️ Final safety check: Converting HTTP to HTTPS for production');
            secureURL = secureURL.replace('http://', 'https://');
        }
        
        if (!params) {
            console.log('🔧 Final URL (no params):', secureURL);
            return secureURL;
        }
        
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });
        
        const queryString = searchParams.toString();
        const finalURL = queryString ? `${secureURL}?${queryString}` : secureURL;
        
        console.log('🔧 Final URL (with params):', finalURL);
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
        const isRetryableError = error.status === 503;
        const showToast = !isRetryableError || error.isRetryExhausted;
        
        if (error.status === 401) {
            console.log('🔐 Authentication failure: Session expired');
            
            // Clear invalid credentials
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            
            // Update app state
            if (window.appState) {
                window.appState.set('currentUser', null);
                window.appState.set('authToken', null);
            }
            
            // Use AuthManager to handle the redirect properly
            if (window.authManager) {
                window.authManager.handleAuthFailure('Session expired');
            } else {
                // Fallback: show welcome section
                if (window.navigationManager) {
                    window.navigationManager.showSection('welcome');
                    window.navigationManager.updateNavigation();
                }
                
                if (window.UIManager) {
                    window.UIManager.showToast('Session expired. Please log in again.', 'warning');
                }
            }
        } else if (error.status === 403) {
            console.log('🔐 Access forbidden: Insufficient permissions');
            
            // For 403 errors, don't clear credentials but show a more specific message
            if (showToast && window.UIManager) {
                window.UIManager.showToast('Access denied. You may not have permission for this action.', 'warning');
            }
        } else if (error.status === 404) {
            // Not found
            if (showToast && window.UIManager) {
                window.UIManager.showToast('Resource not found', 'error');
            }
        } else if (error.status === 503) {
            // Service unavailable - don't show toast since retry logic handles it
            console.log('🔄 503 Service Unavailable detected - retry logic will handle this silently');
            // NO TOAST - reduces user-facing noise for temporary backend issues
        } else if (error.status >= 500) {
            // Other server errors
            console.error('🚨 Server Error Details:', {
                status: error.status,
                url: error.config?.url || 'unknown',
                method: error.config?.method || 'unknown',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            if (showToast && window.UIManager) {
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
    
    // Email verification methods
    async sendVerificationEmail(email) {
        return await this.client.post('/api/v1/auth/verify-email', { email });
    }
    
    async confirmEmailVerification(token) {
        return await this.client.post('/api/v1/auth/confirm-email', { token });
    }
    
    // Password reset methods
    async sendPasswordResetEmail(email) {
        return await this.client.post('/api/v1/auth/reset-password', { email });
    }
    
    async confirmPasswordReset(token, new_password) {
        return await this.client.post('/api/v1/auth/confirm-password-reset', { token, new_password });
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
        return await this.client.get(`${API_CONFIG.ENDPOINTS.CANVAS}${id}`);
    }
    
    async createCanvas(canvasData) {
        return await this.client.post(API_CONFIG.ENDPOINTS.CANVAS, canvasData);
    }
    
    async updateCanvas(id, canvasData) {
        return await this.client.put(`${API_CONFIG.ENDPOINTS.CANVAS}${id}`, canvasData);
    }
    
    async deleteCanvas(id) {
        return await this.client.delete(`${API_CONFIG.ENDPOINTS.CANVAS}${id}`);
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
        
        // Add retry logic for 503 errors
        return await this.client.executeWithRetry(async () => {
            return await this.client.get(url, { params });
        });
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
        const url = API_CONFIG.ENDPOINTS.TILE_NEIGHBORS.replace('{id}', id);
        return await this.client.get(url);
    }
    
    async getAdjacentNeighbors(id) {
        const url = API_CONFIG.ENDPOINTS.TILE_ADJACENT_NEIGHBORS.replace('{id}', id);
        return await this.client.get(url);
    }
    
    async getAdjacentNeighborsByPosition(canvasId, x, y) {
        const url = API_CONFIG.ENDPOINTS.TILE_POSITION_NEIGHBORS.replace('{id}', canvasId);
        return await this.client.get(url, { params: { x, y } });
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
    
    async getUserTileCount(userId, canvasId = null) {
        const url = API_CONFIG.ENDPOINTS.USER_TILES.replace('{id}', userId) + '/count';
        const params = canvasId ? { canvas_id: canvasId } : {};
        
        // Add retry logic for 503 errors
        return await this.client.executeWithRetry(async () => {
            return await this.client.get(url, { params });
        });
    }
    
    // Tile lock methods
    async acquireTileLock(tileId) {
        return await this.client.post(`/api/v1/tile-locks/${tileId}/lock`);
    }
    
    async releaseTileLock(tileId) {
        return await this.client.delete(`/api/v1/tile-locks/${tileId}/lock`);
    }
    
    async extendTileLock(tileId) {
        return await this.client.put(`/api/v1/tile-locks/${tileId}/lock`);
    }
    
    async getTileLockStatus(tileId) {
        return await this.client.get(`/api/v1/tile-locks/${tileId}/lock`);
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
        getUserStats: () => authAPI.getUserStats(),
        // Email verification
        sendVerificationEmail: (email) => authAPI.sendVerificationEmail(email),
        confirmEmailVerification: (token) => authAPI.confirmEmailVerification(token),
        // Password reset
        sendPasswordResetEmail: (email) => authAPI.sendPasswordResetEmail(email),
        confirmPasswordReset: (token, new_password) => authAPI.confirmPasswordReset(token, new_password)
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
        getUserTileCount: (userId, canvasId) => tileAPI.getUserTileCount(userId, canvasId),
        getNeighbors: (id) => tileAPI.getTileNeighbors(id),
        getAdjacentNeighbors: (id) => tileAPI.getAdjacentNeighbors(id),
        getAdjacentNeighborsByPosition: (canvasId, x, y) => tileAPI.getAdjacentNeighborsByPosition(canvasId, x, y),
        like: (id) => tileAPI.likeTile(id),
        unlike: (id) => tileAPI.unlikeTile(id),
        getLikes: (id) => tileAPI.getTileLikes(id),
        getStats: (id) => tileAPI.getTileStats(id),
        // Tile lock methods
        acquireTileLock: (tileId) => tileAPI.acquireTileLock(tileId),
        releaseTileLock: (tileId) => tileAPI.releaseTileLock(tileId),
        extendTileLock: (tileId) => tileAPI.extendTileLock(tileId),
        getTileLockStatus: (tileId) => tileAPI.getTileLockStatus(tileId)
    },
    
    // WebSocket
    websocket: {
        getStats: () => websocketAPI.getStats(),
        broadcast: (canvasId, message) => websocketAPI.broadcastToCanvas(canvasId, message)
    },
    
    // Chat API
    chat: {
        // Canvas chat
        getCanvasRoom: (canvasId) => apiClient.get(`/api/v1/chat/canvas/${canvasId}/room`),
        getCanvasMessages: (canvasId, params = {}) => apiClient.get(`/api/v1/chat/canvas/${canvasId}/messages`, params),
        sendCanvasMessage: (canvasId, messageData) => apiClient.post(`/api/v1/chat/canvas/${canvasId}/messages`, messageData),
        
        // Message operations
        updateMessage: (messageId, messageData) => apiClient.put(`/api/v1/chat/messages/${messageId}`, messageData),
        deleteMessage: (messageId) => apiClient.delete(`/api/v1/chat/messages/${messageId}`),
        
        // User presence
        updatePresence: (presenceData) => apiClient.put('/api/v1/chat/presence', presenceData),
        getCanvasUsers: (canvasId) => apiClient.get(`/api/v1/chat/canvas/${canvasId}/users`),
        
        // Direct messages (Phase 2)
        sendDirectMessage: (messageData) => apiClient.post('/api/v1/chat/direct-messages', messageData),
        
        // Activity feed
        getCanvasActivity: (canvasId, params = {}) => apiClient.get(`/api/v1/chat/canvas/${canvasId}/activity`, params)
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