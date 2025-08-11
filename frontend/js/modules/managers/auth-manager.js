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
        this.setupAuthStateMonitoring();
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
     * Setup authentication state monitoring
     */
    setupAuthStateMonitoring() {
        // Listen for token verification events
        if (this.eventManager) {
            this.eventManager.on('token:invalid', () => {
                this.handleAuthFailure('Session expired');
            });
            
            this.eventManager.on('token:error', (error) => {
                this.handleAuthFailure('Authentication error');
            });
        }

        // Monitor network status changes
        window.addEventListener('online', () => {
            this.handleNetworkRestored();
        });

        window.addEventListener('offline', () => {
            this.handleNetworkLost();
        });
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
            
            // Force navigation update after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.updateNavigation();
            }, 100);
            
            // Hide modal and show canvas section
            if (window.modalManager) {
                window.modalManager.hideModal('login');
            }
            
            if (window.navigationManager) {
                window.navigationManager.showSection('canvas');
            }
            
            // Load canvases
            console.log('🔍 Checking canvas list manager availability:', !!window.canvasListManager);
            if (window.canvasListManager) {
                console.log('🔄 Loading canvases after login...');
                await window.canvasListManager.loadCanvases();
            } else {
                console.error('❌ Canvas list manager not available after login');
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
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
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
            console.log('🔍 Checking canvas list manager availability after registration:', !!window.canvasListManager);
            if (window.canvasListManager) {
                console.log('🔄 Loading canvases after registration...');
                await window.canvasListManager.loadCanvases();
            } else {
                console.error('❌ Canvas list manager not available after registration');
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
            palette_type: formData.get('palette_type')
        };

        try {
            console.log('🔄 Creating canvas...');
            
            const response = await this.apiService.createCanvas(canvasData);
            
            // Hide modal
            if (window.modalManager) {
                window.modalManager.hideModal('create-canvas');
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
        appState.setUnauthenticated();
        
        // Close all WebSocket connections
        if (window.webSocketManager) {
            window.webSocketManager.closeAll();
        }
        
        // Update UI
        this.updateNavigation();
        
        // Show welcome section
        if (window.navigationManager) {
            window.navigationManager.showSection('welcome');
        }
        
        console.log('✅ Logout successful');
    }

    /**
     * Handle authentication failure (401, token expired, etc.)
     */
    handleAuthFailure(reason = 'Session expired') {
        console.log('🔐 Authentication failure:', reason);
        
        // Clear user data
        appState.setUnauthenticated();
        
        // Close all WebSocket connections
        if (window.webSocketManager) {
            window.webSocketManager.closeAll();
        }
        
        // Update UI
        this.updateNavigation();
        
        // Show login modal instead of just welcome page
        if (window.navigationManager) {
            window.navigationManager.showSection('welcome');
            // Show login modal after a brief delay to ensure welcome page is loaded
            setTimeout(() => {
                if (window.modalManager) {
                    window.modalManager.showModal('login');
                }
            }, 100);
        }
        
        // Show user-friendly message
        if (window.UIManager) {
            window.UIManager.showToast(`${reason}. Please log in again.`, 'error');
        }
        
        console.log('✅ Auth failure handled - redirected to login');
    }

    /**
     * Handle network restoration
     */
    handleNetworkRestored() {
        console.log('✅ Network connection restored');
        
        // Verify token if user is logged in
        const currentUser = appState.get('currentUser');
        if (currentUser) {
            this.verifyTokenOnNetworkRestore();
        }
    }

    /**
     * Handle network loss
     */
    handleNetworkLost() {
        console.log(' Network connection lost');
        
        // Show warning but don't log out immediately
        if (window.UIManager) {
            window.UIManager.showToast('Connection lost. Some features may be unavailable.', 'warning');
        }
    }

    /**
     * Verify token when network is restored
     */
    async verifyTokenOnNetworkRestore() {
        try {
            const isValid = await this.apiService.verifyToken();
            if (!isValid) {
                this.handleAuthFailure('Session expired during connection loss');
            } else {
                if (window.UIManager) {
                    window.UIManager.showToast('Connection restored', 'success');
                }
            }
        } catch (error) {
            console.error('Token verification failed on network restore:', error);
            this.handleAuthFailure('Session verification failed');
        }
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
            // Remove the 'hidden' class and set display to flex
            userInfoElement.classList.remove('hidden');
            userInfoElement.style.display = 'flex';
        }
    }

    /**
     * Update navigation based on authentication state
     */
    updateNavigation() {
        const isAuthenticated = appState.get('currentUser') !== null;
        const currentUser = appState.get('currentUser');
        
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userInfo = document.getElementById('user-info');
        const adminBtn = document.getElementById('admin-btn');
        
        if (isAuthenticated) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.style.display = 'flex';
            }
            
            // Show admin button for admin/superuser
            if (adminBtn && currentUser && (currentUser.is_admin || currentUser.is_superuser)) {
                adminBtn.style.display = 'block';
                console.log('✅ Admin button shown for admin user');
            } else if (adminBtn) {
                adminBtn.style.display = 'none';
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            if (userInfo) {
                userInfo.classList.add('hidden');
                userInfo.style.display = 'none';
            }
            if (adminBtn) {
                adminBtn.style.display = 'none';
            }
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