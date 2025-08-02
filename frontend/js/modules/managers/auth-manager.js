/**
 * Authentication Manager
 * Handles login, registration, and user session management
 */

import appState from '../app-state.js';

export class AuthManager {
    constructor(apiService, eventManager) {
        this.apiService = apiService;
        this.eventManager = eventManager;
        this.setupFormHandlers();
    }

    /**
     * Setup authentication form handlers
     */
    setupFormHandlers() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
        }

        // Create canvas form
        const createCanvasForm = document.getElementById('create-canvas-form');
        if (createCanvasForm) {
            createCanvasForm.addEventListener('submit', (e) => this.handleCreateCanvasSubmit(e));
        }
    }

    /**
     * Handle login form submission
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            console.log('🔄 Attempting login...');
            
            const response = await this.apiService.login(credentials);
            
            // Store user data
            appState.set('currentUser', response.user);
            appState.set('authToken', response.access_token);
            
            // Update UI
            this.updateUserInfo(response.user);
            this.updateNavigation();
            
            // Hide modal and show canvas section
            if (window.modalManager) {
                window.modalManager.hideModal('login');
            }
            
            if (window.navigationManager) {
                window.navigationManager.showSection('canvas');
            }
            
            // Load canvases
            if (window.canvasListManager) {
                window.canvasListManager.loadCanvases();
            }
            
            console.log('✅ Login successful');
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showLoginError('Login failed. Please check your credentials.');
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegisterSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password')
        };

        try {
            console.log('🔄 Attempting registration...');
            
            const response = await this.apiService.register(userData);
            
            // Store user data
            appState.set('currentUser', response.user);
            appState.set('authToken', response.access_token);
            
            // Update UI
            this.updateUserInfo(response.user);
            this.updateNavigation();
            
            // Hide modal and show canvas section
            if (window.modalManager) {
                window.modalManager.hideModal('register');
            }
            
            if (window.navigationManager) {
                window.navigationManager.showSection('canvas');
            }
            
            // Load canvases
            if (window.canvasListManager) {
                window.canvasListManager.loadCanvases();
            }
            
            console.log('✅ Registration successful');
            
        } catch (error) {
            console.error('❌ Registration failed:', error);
            this.showRegisterError('Registration failed. Please try again.');
        }
    }

    /**
     * Handle create canvas form submission
     */
    async handleCreateCanvasSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const canvasData = {
            name: formData.get('name'),
            description: formData.get('description'),
            width: parseInt(formData.get('width')),
            height: parseInt(formData.get('height')),
            max_tiles_per_user: parseInt(formData.get('max_tiles_per_user')),
            palette_type: formData.get('palette_type'),
            collaboration_mode: formData.get('collaboration_mode'),
            is_public: formData.get('is_public') === 'on'
        };

        try {
            console.log('🔄 Creating canvas...');
            
            const response = await window.API.canvas.create(canvasData);
            
            // Hide modal
            if (window.modalManager) {
                window.modalManager.hideModal('create-canvas');
            }
            
            // Show success message
            if (window.UIManager) {
                window.UIManager.showToast('Canvas created successfully!', 'success');
            }
            
            // Refresh canvas list
            if (window.canvasListManager) {
                window.canvasListManager.loadCanvases();
            }
            
            console.log('✅ Canvas created successfully');
            
        } catch (error) {
            console.error('❌ Canvas creation failed:', error);
            this.showCreateCanvasError('Failed to create canvas. Please try again.');
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await this.apiService.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
        
        // Clear user data
        appState.clear();
        
        // Update UI
        this.updateNavigation();
        
        // Show welcome section
        if (window.navigationManager) {
            window.navigationManager.showSection('welcome');
        }
        
        console.log('✅ Logout successful');
    }

    /**
     * Update user information display
     */
    updateUserInfo(user) {
        const usernameElement = document.getElementById('username');
        if (usernameElement) {
            usernameElement.textContent = user.username;
        }
        
        const userInfoElement = document.getElementById('user-info');
        if (userInfoElement) {
            userInfoElement.style.display = 'flex';
        }
    }

    /**
     * Update navigation based on authentication state
     */
    updateNavigation() {
        const isAuthenticated = appState.get('currentUser') !== null;
        
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userInfo = document.getElementById('user-info');
        
        if (isAuthenticated) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    /**
     * Show login error
     */
    showLoginError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Show register error
     */
    showRegisterError(message) {
        const errorElement = document.getElementById('register-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Show create canvas error
     */
    showCreateCanvasError(message) {
        if (window.UIManager) {
            window.UIManager.showToast(message, 'error');
        }
    }
} 