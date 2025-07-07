/**
 * Authentication Service
 * Handles user authentication and authorization
 */

import { eventManager } from '../utils/events.js';
import { uiUtils } from '../utils/ui.js';

class AuthService {
    constructor() {
        this.initialized = false;
    }
    
    /**
     * Initialize the authentication service
     */
    init() {
        if (this.initialized) {
            console.warn('Auth service already initialized');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Auth service initialized');
    }
    
    /**
     * Handle user login
     */
    async login(credentials) {
        try {
            uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store authentication data
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                
                // Emit success event
                eventManager.emit('login:success', data.user);
                
                uiUtils.showToast('Login successful!', 'success');
                return { success: true, user: data.user };
                
            } else {
                // Handle login error
                eventManager.emit('login:error', data);
                uiUtils.showToast(data.detail || 'Login failed', 'error');
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Login error:', error);
            eventManager.emit('login:error', { message: error.message });
            uiUtils.showToast('Network error during login', 'error');
            return { success: false, error: { message: error.message } };
            
        } finally {
            uiUtils.hideLoading();
        }
    }
    
    /**
     * Handle user registration
     */
    async register(userData) {
        try {
            uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store authentication data
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                
                // Emit success event
                eventManager.emit('register:success', data.user);
                
                uiUtils.showToast('Registration successful!', 'success');
                return { success: true, user: data.user };
                
            } else {
                // Handle registration error
                eventManager.emit('register:error', data);
                uiUtils.showToast(data.detail || 'Registration failed', 'error');
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            eventManager.emit('register:error', { message: error.message });
            uiUtils.showToast('Network error during registration', 'error');
            return { success: false, error: { message: error.message } };
            
        } finally {
            uiUtils.hideLoading();
        }
    }
    
    /**
     * Handle user logout
     */
    async logout() {
        try {
            // Try to notify server
            try {
                await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGOUT), {
                    method: 'POST',
                    headers: CONFIG_UTILS.getAuthHeaders()
                });
            } catch (error) {
                console.warn('Server logout failed:', error);
            }
            
            // Clear local storage
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            
            // Emit logout event
            eventManager.emit('logout:success');
            
            uiUtils.showToast('Logged out successfully', 'info');
            return { success: true };
            
        } catch (error) {
            console.error('Logout error:', error);
            eventManager.emit('logout:error', { message: error.message });
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Verify authentication token
     */
    async verifyToken() {
        try {
            const token = CONFIG_UTILS.getAuthToken();
            if (!token) {
                return false;
            }
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.ME), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const userData = await response.json();
                CONFIG_UTILS.setUserData(userData);
                eventManager.emit('token:verified', userData);
                return true;
            } else {
                // Token is invalid, clear it
                CONFIG_UTILS.removeAuthToken();
                CONFIG_UTILS.removeUserData();
                eventManager.emit('token:invalid');
                return false;
            }
            
        } catch (error) {
            console.error('Token verification error:', error);
            eventManager.emit('token:error', { message: error.message });
            return false;
        }
    }
    
    /**
     * Handle login form submission
     */
    async handleLoginForm(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        // Validate form
        const validation = this.validateLoginForm(credentials);
        if (!validation.isValid) {
            uiUtils.showFormErrors(form, validation.errors);
            return;
        }
        
        uiUtils.clearFormErrors(form);
        uiUtils.setFormLoading(form, true, null, 'Logging in...');
        
        try {
            const result = await this.login(credentials);
            
            if (result.success) {
                uiUtils.hideModal('login');
                form.reset();
            } else {
                // Handle specific errors
                if (result.error.validation_errors) {
                    uiUtils.showFormErrors(form, result.error.validation_errors);
                }
            }
            
        } finally {
            uiUtils.setFormLoading(form, false);
        }
    }
    
    /**
     * Handle registration form submission
     */
    async handleRegisterForm(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };
        
        // Validate form
        const validation = this.validateRegistrationForm(userData);
        if (!validation.isValid) {
            uiUtils.showFormErrors(form, validation.errors);
            return;
        }
        
        uiUtils.clearFormErrors(form);
        uiUtils.setFormLoading(form, true, null, 'Creating account...');
        
        try {
            const result = await this.register(userData);
            
            if (result.success) {
                uiUtils.hideModal('register');
                form.reset();
            } else {
                // Handle specific errors
                if (result.error.validation_errors) {
                    uiUtils.showFormErrors(form, result.error.validation_errors);
                }
            }
            
        } finally {
            uiUtils.setFormLoading(form, false);
        }
    }
    
    /**
     * Validate login form
     */
    validateLoginForm(credentials) {
        const errors = {};
        
        if (!credentials.username || credentials.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }
        
        if (!credentials.password || credentials.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Validate registration form
     */
    validateRegistrationForm(userData) {
        const errors = {};
        
        // Username validation
        if (!userData.username || userData.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            errors.username = 'Username can only contain letters, numbers, and underscores';
        }
        
        // Email validation
        if (!userData.email) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
            errors.email = 'Please enter a valid email address';
        }
        
        // Password validation
        if (!userData.password || userData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
            errors.password = 'Password must contain at least one lowercase letter, uppercase letter, and number';
        }
        
        // Confirm password validation
        if (userData.password !== userData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return CONFIG_UTILS.isAuthenticated();
    }
    
    /**
     * Get current user data
     */
    getCurrentUser() {
        return CONFIG_UTILS.getUserData();
    }
    
    /**
     * Get authentication headers for API requests
     */
    getAuthHeaders() {
        return CONFIG_UTILS.getAuthHeaders();
    }
    
    /**
     * Destroy the authentication service
     */
    destroy() {
        this.initialized = false;
        console.log('✅ Auth service destroyed');
    }
}

// Create singleton instance
const authService = new AuthService();

// Export for use in other modules
export { authService };
export default authService; 

// CommonJS exports for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, authService };
} 