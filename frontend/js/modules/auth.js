/**
 * Authentication Module
 * Handles user authentication operations
 */

import appState from './app-state.js';
import { showToast } from './ui-utils.js';
import { showSection, hideModal } from './navigation.js';

class AuthManager {
    constructor() {
        // Use the global API configuration or fallback to secure URL
        this.baseUrl = window.API_CONFIG?.BASE_URL || this.getSecureBaseUrl();
        
        // Debug logging
        console.log('🔧 AuthManager initialized with:', {
            baseUrl: this.baseUrl,
            apiConfigBaseUrl: window.API_CONFIG?.BASE_URL,
            hostname: window.location.hostname,
            protocol: window.location.protocol
        });
    }
    
    /**
     * Get secure base URL with HTTPS enforcement for production
     */
    getSecureBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        
        // Production - force HTTPS
        if (hostname === 'artparty.social' || hostname.includes('artparty.social')) {
            return 'https://artparty.social';
        }
        
        // Other environments - use current protocol
        return `${protocol}//${hostname}`;
    }
    
    /**
     * Handle user login
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        try {
            this.setFormLoading(true, submitButton, 'Signing in...');
            window.clearFormErrors('login-form');
            
            const loginUrl = `${this.baseUrl}/api/v1/auth/login`;
            console.log('🔧 Auth login URL:', loginUrl);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store authentication data
                window.CONFIG_UTILS.setAuthToken(data.access_token);
                window.CONFIG_UTILS.setUserData(data.user);
                
                // Update app state
                appState.setAuthenticated(data.user);
                
                // Update navigation UI to show logged-in state
                if (window.navigationManager) {
                    window.navigationManager.updateNavigation();
                    window.navigationManager.updateUserInfo(data.user);
                }
                
                // Update UI
                hideModal('login');
                showSection('canvas');
                showToast(`Welcome back, ${data.user.first_name}!`, 'success');
                
                // Reset form
                form.reset();
                
            } else {
                showToast(data.detail || 'Login failed', 'error');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
        } finally {
            this.setFormLoading(false, submitButton, 'Sign In');
        }
    }
    
    /**
     * Handle user registration
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name')
        };
        
        // Client-side validation
        const validationErrors = this.validateRegistrationForm(registerData);
        if (validationErrors.length > 0) {
            this.displayFormErrors(validationErrors);
            return;
        }
        
        try {
            this.setFormLoading(true, submitButton, 'Creating account...');
            window.clearFormErrors('register-form');
            
            const registerUrl = `${this.baseUrl}/api/v1/auth/register`;
            console.log('🔧 Auth register URL:', registerUrl);
            
            const response = await fetch(registerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store authentication data
                window.CONFIG_UTILS.setAuthToken(data.access_token);
                window.CONFIG_UTILS.setUserData(data.user);
                
                // Update app state
                appState.setAuthenticated(data.user);
                
                // Update navigation UI to show logged-in state
                if (window.navigationManager) {
                    window.navigationManager.updateNavigation();
                    window.navigationManager.updateUserInfo(data.user);
                }
                
                // Update UI
                hideModal('register');
                showSection('canvas');
                showToast(`Welcome to StellarArtCollab, ${data.user.first_name}!`, 'success');
                
                // Reset form
                form.reset();
                
            } else {
                this.handleRegistrationError(response.status, data);
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Registration failed. Please try again.', 'error');
        } finally {
            this.setFormLoading(false, submitButton, 'Create Account');
        }
    }
    
    /**
     * Handle user logout
     */
    async logout() {
        try {
            appState.setLoading(true);
            
            // Close WebSocket connection
            const websocket = appState.get('websocket');
            if (websocket) {
                websocket.close();
            }
            
            // Clear authentication data
            window.CONFIG_UTILS.removeAuthToken();
            window.CONFIG_UTILS.removeUserData();
            
            // Update app state
            appState.setUnauthenticated();
            
            // Update UI
            showSection('welcome');
            showToast('Logged out successfully', 'success');
            
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error during logout', 'error');
        } finally {
            appState.setLoading(false);
        }
    }
    
    /**
     * Verify authentication token
     */
    async verifyToken() {
        const token = window.CONFIG_UTILS.getAuthToken();
        if (!token) {
            return false;
        }
        
        try {
            const verifyUrl = `${this.baseUrl}/api/v1/auth/me`;
            console.log('🔧 Auth verify URL:', verifyUrl);
            
            const response = await fetch(verifyUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                window.CONFIG_UTILS.setUserData(userData);
                appState.setAuthenticated(userData);
                return true;
            } else {
                // Token is invalid
                window.CONFIG_UTILS.removeAuthToken();
                window.CONFIG_UTILS.removeUserData();
                return false;
            }
            
        } catch (error) {
            console.error('Token verification error:', error);
            window.CONFIG_UTILS.removeAuthToken();
            window.CONFIG_UTILS.removeUserData();
            return false;
        }
    }
    
    /**
     * Validate registration form data
     */
    validateRegistrationForm(data) {
        const errors = [];
        
        // Username validation
        if (!data.username || data.username.length < 3) {
            errors.push({ field: 'username', message: 'Username must be at least 3 characters long' });
        } else if (data.username.length > 50) {
            errors.push({ field: 'username', message: 'Username must be less than 50 characters' });
        } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email || !emailRegex.test(data.email)) {
            errors.push({ field: 'email', message: 'Please enter a valid email address' });
        }
        
        // Password validation
        if (!data.password || data.password.length < 8) {
            errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
        }
        
        // Name validation
        if (!data.first_name || data.first_name.trim().length === 0) {
            errors.push({ field: 'first_name', message: 'First name is required' });
        }
        
        if (!data.last_name || data.last_name.trim().length === 0) {
            errors.push({ field: 'last_name', message: 'Last name is required' });
        }
        
        return errors;
    }
    
    /**
     * Handle registration errors
     */
    handleRegistrationError(status, data) {
        if (status === 400) {
            showToast(data.detail || 'Username or email already exists', 'error');
        } else if (status === 422) {
            if (data.detail && Array.isArray(data.detail)) {
                const errors = data.detail.map(err => ({
                    field: err.loc[err.loc.length - 1],
                    message: err.msg
                }));
                this.displayFormErrors(errors);
            } else {
                showToast('Validation error. Please check your input.', 'error');
            }
        } else if (status === 429) {
            showToast('Too many registration attempts. Please try again later.', 'error');
        } else {
            showToast(data.detail || 'Registration failed', 'error');
        }
    }
    
    /**
     * Display form validation errors
     */
    displayFormErrors(errors) {
        clearFormErrors('register-form');
        
        errors.forEach(error => {
            this.showFieldError(error.field, error.message);
        });
    }
    
    /**
     * Show field error
     */
    showFieldError(fieldName, message) {
        const field = document.querySelector(`input[name="${fieldName}"]`);
        if (!field) return;
        
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    /**
     * Set form loading state
     */
    setFormLoading(isLoading, submitButton, loadingText = 'Loading...') {
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <span class="loading-spinner"></span>
                ${loadingText}
            `;
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = submitButton.getAttribute('data-original-text') || 'Submit';
        }
    }
}

// Create and export a singleton instance
const authManager = new AuthManager();

// Export the class for testing/extension
export { AuthManager };

// Export the singleton instance as default
export default authManager; 