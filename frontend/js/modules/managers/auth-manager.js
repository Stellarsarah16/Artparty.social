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
        
        // Set up event-based admin panel initialization
        this.setupEventBasedAdminPanelInit();
        
        // Make debug method available globally
        window.debugAdminStatus = () => this.debugAdminStatus();
        window.forceRetryAdminPanelInit = () => this.forceRetryAdminPanelInit();
        window.scheduleAdminPanelInit = (user) => this.scheduleAdminPanelInitialization(user);
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
            
            // Emit authentication events
            if (window.eventManager) {
                window.eventManager.emit('userLogin', response.user);
                window.eventManager.emit('authStateChanged', response.user);
            }
            
            // Update UI
            this.updateUserInfo(response.user);
            this.updateNavigation();
            
            // Use event-based admin panel initialization instead of timing-based
            if (response.user.is_admin || response.user.is_superuser) {
                console.log('🔧 User is admin, triggering event-based admin panel initialization...');
                // The event-based system will handle this automatically
                if (window.eventManager) {
                    window.eventManager.emit('authStateChanged', response.user);
                }
            }
            
            // Hide modal and show canvas section
            if (window.modalManager) {
                window.modalManager.hideModal('login');
            }
            
            if (window.navigationManager) {
                window.navigationManager.showSection('canvas');
            }
            
            // Force navigation update after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.updateNavigation();
            }, 100);
            
            // REMOVED: Duplicate canvas loading - navigation manager handles this
            // The showSection('canvas') call above already triggers canvas loading
            // in navigation.js line 307, so we don't need to do it again here
            console.log('✅ Login complete, navigation manager will handle canvas loading');
            
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
            
            // Emit authentication events
            if (window.eventManager) {
                window.eventManager.emit('userLogin', response.user);
                window.eventManager.emit('authStateChanged', response.user);
            }
            
            // Update UI
            this.updateUserInfo(response.user);
            this.updateNavigation();
            
            // Use event-based admin panel initialization instead of timing-based
            if (response.user.is_admin || response.user.is_superuser) {
                console.log('🔧 User is admin, triggering event-based admin panel initialization...');
                // The event-based system will handle this automatically
                if (window.eventManager) {
                    window.eventManager.emit('authStateChanged', response.user);
                }
            }
            
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
            palette_type: formData.get('palette_type'),
            tile_size: parseInt(formData.get('tile_size'))  // Make sure this is included
        };

        // 🚨 DEBUG: Log the exact data being sent
        console.log('🔍 Canvas data being sent:', canvasData);
        console.log('🔍 Form values:', {
            name: formData.get('name'),
            description: formData.get('description'),
            width: formData.get('width'),
            height: formData.get('height'),
            palette_type: formData.get('palette_type'),
            tile_size: formData.get('tile_size')
        });
        console.log('🔍 Parsed values:', {
            name: canvasData.name,
            description: canvasData.description,
            width: canvasData.width,
            height: canvasData.height,
            palette_type: canvasData.palette_type,
            tile_size: canvasData.tile_size
        });

        try {
            console.log('🔄 Creating canvas...');
            
            const response = await window.API.canvas.create(canvasData);
            
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
            
            // 🚨 DEBUG: Log the full error response
            if (error.response) {
                try {
                    const errorData = await error.response.text();
                    console.error('🔍 Full error response:', errorData);
                } catch (e) {
                    console.error('🔍 Could not read error response:', e);
                }
            }
            
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
        
        // Emit logout events
        if (window.eventManager) {
            window.eventManager.emit('userLogout');
            window.eventManager.emit('authStateChanged', null);
        }
        
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
        
        // Emit logout events
        if (window.eventManager) {
            window.eventManager.emit('userLogout');
            window.eventManager.emit('authStateChanged', null);
        }
        
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
        
        console.log('🔧 updateNavigation called:', { isAuthenticated, currentUser });
        console.log('🔧 Current user details:', {
            id: currentUser?.id,
            username: currentUser?.username,
            is_admin: currentUser?.is_admin,
            is_superuser: currentUser?.is_superuser,
            admin_permissions: currentUser?.admin_permissions
        });
        
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userInfo = document.getElementById('user-info');
        const adminBtn = document.getElementById('admin-btn');
        
        console.log('🔧 DOM elements found:', {
            loginBtn: !!loginBtn,
            registerBtn: !!registerBtn,
            userInfo: !!userInfo,
            adminBtn: !!adminBtn
        });
        
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
                console.log('✅ Admin button shown for admin user:', {
                    is_admin: currentUser.is_admin,
                    is_superuser: currentUser.is_superuser,
                    user: currentUser
                });
            } else if (adminBtn) {
                adminBtn.style.display = 'none';
                console.log('⚠️ Admin button hidden - user not admin:', {
                    hasAdminBtn: !!adminBtn,
                    hasCurrentUser: !!currentUser,
                    is_admin: currentUser?.is_admin,
                    is_superuser: currentUser?.is_superuser
                });
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
     * Schedule admin panel initialization with proper timing and retry logic
     */
    scheduleAdminPanelInitialization(user) {
        // Clear any existing initialization attempts
        if (this.adminPanelInitTimeout) {
            clearTimeout(this.adminPanelInitTimeout);
        }
        
        // Set initialization state
        this.adminPanelInitAttempts = 0;
        this.maxAdminPanelInitAttempts = 5;
        this.adminPanelInitDelay = 500; // Start with 500ms delay
        
        console.log('🔧 Scheduling admin panel initialization...');
        
        // Schedule the first attempt
        this.adminPanelInitTimeout = setTimeout(() => {
            this.attemptAdminPanelInitialization(user);
        }, this.adminPanelInitDelay);
    }
    
    /**
     * Attempt to initialize the admin panel with retry logic
     */
    async attemptAdminPanelInitialization(user) {
        this.adminPanelInitAttempts++;
        
        console.log(`🔧 Admin panel initialization attempt ${this.adminPanelInitAttempts}/${this.maxAdminPanelInitAttempts}`);
        
        try {
            // Check if navigation manager is available
            if (!window.navigationManager || !window.navigationManager.managers) {
                throw new Error('Navigation manager not available');
            }
            
            // Check if DOM is ready
            const adminBtn = document.getElementById('admin-btn');
            if (!adminBtn) {
                throw new Error('Admin button element not found in DOM');
            }
            
            // Attempt to initialize admin panel
            await window.navigationManager.managers.initializeAdminPanel(user);
            
            // Verify initialization was successful
            if (window.adminPanelManager && window.adminPanelManager.initialized) {
                console.log('✅ Admin panel initialized successfully');
                
                // Update navigation to show admin button
                this.updateNavigation();
                
                // Emit admin panel ready event
                if (window.eventManager) {
                    window.eventManager.emit('adminPanelReady', user);
                }
                
                return true;
            } else {
                throw new Error('Admin panel initialization failed - manager not properly initialized');
            }
            
        } catch (error) {
            console.warn(`⚠️ Admin panel initialization attempt ${this.adminPanelInitAttempts} failed:`, error.message);
            
            // Check if we should retry
            if (this.adminPanelInitAttempts < this.maxAdminPanelInitAttempts) {
                // Exponential backoff: increase delay with each attempt
                const nextDelay = this.adminPanelInitDelay * Math.pow(1.5, this.adminPanelInitAttempts);
                
                console.log(`🔄 Retrying admin panel initialization in ${nextDelay}ms...`);
                
                this.adminPanelInitTimeout = setTimeout(() => {
                    this.attemptAdminPanelInitialization(user);
                }, nextDelay);
                
            } else {
                console.error('❌ Admin panel initialization failed after all attempts');
                
                // Emit failure event
                if (window.eventManager) {
                    window.eventManager.emit('adminPanelInitFailed', {
                        user: user,
                        attempts: this.adminPanelInitAttempts,
                        error: error.message
                    });
                }
                
                // Still update navigation in case the button should be shown
                this.updateNavigation();
            }
        }
    }
    
    /**
     * Force retry admin panel initialization (for debugging/testing)
     */
    forceRetryAdminPanelInit() {
        const currentUser = appState.get('currentUser');
        if (currentUser && (currentUser.is_admin || currentUser.is_superuser)) {
            console.log('🔄 Force retrying admin panel initialization...');
            this.scheduleAdminPanelInitialization(currentUser);
        } else {
            console.warn('⚠️ Cannot retry admin panel init - user is not admin');
        }
    }
    
    /**
     * Event-based admin panel initialization system
     * This ensures the admin panel is initialized when all required components are ready
     */
    setupEventBasedAdminPanelInit() {
        console.log('🔧 Setting up event-based admin panel initialization...');
        
        // Track initialization state
        this.adminPanelInitState = {
            userAuthenticated: false,
            navigationReady: false,
            domReady: false,
            adminPanelReady: false
        };
        
        // Listen for authentication events
        if (window.eventManager) {
            window.eventManager.on('userLogin', (userData) => {
                console.log('🔐 User login event received for admin panel init:', userData);
                this.adminPanelInitState.userAuthenticated = true;
                this.checkAdminPanelInitReadiness(userData);
            });
            
            window.eventManager.on('authStateChanged', (userData) => {
                console.log('🔐 Auth state change event received for admin panel init:', userData);
                if (userData && (userData.is_admin || userData.is_superuser)) {
                    this.adminPanelInitState.userAuthenticated = true;
                    this.checkAdminPanelInitReadiness(userData);
                }
            });
            
            // Listen for navigation manager ready event
            window.eventManager.on('navigationManagerReady', () => {
                console.log('🧭 Navigation manager ready event received');
                this.adminPanelInitState.navigationReady = true;
                this.checkAdminPanelInitReadiness();
            });
            
            // Listen for DOM ready event
            window.eventManager.on('domReady', () => {
                console.log('🌐 DOM ready event received');
                this.adminPanelInitState.domReady = true;
                this.checkAdminPanelInitReadiness();
            });
        }
        
        // Check if components are already ready
        if (window.navigationManager && window.navigationManager.managers) {
            this.adminPanelInitState.navigationReady = true;
        }
        
        if (document.readyState === 'complete') {
            this.adminPanelInitState.domReady = true;
        }
        
        // Check current user
        const currentUser = appState.get('currentUser');
        if (currentUser && (currentUser.is_admin || currentUser.is_superuser)) {
            this.adminPanelInitState.userAuthenticated = true;
        }
        
        // Initial readiness check
        this.checkAdminPanelInitReadiness(currentUser);
    }
    
    /**
     * Check if all conditions are met for admin panel initialization
     */
    checkAdminPanelInitReadiness(userData = null) {
        const currentUser = userData || appState.get('currentUser');
        
        console.log('🔍 Checking admin panel init readiness:', {
            userAuthenticated: this.adminPanelInitState.userAuthenticated,
            navigationReady: this.adminPanelInitState.navigationReady,
            domReady: this.adminPanelInitState.domReady,
            adminPanelReady: this.adminPanelInitState.adminPanelReady,
            currentUser: currentUser ? {
                id: currentUser.id,
                username: currentUser.username,
                is_admin: currentUser.is_admin,
                is_superuser: currentUser.is_superuser
            } : null
        });
        
        // Check if user is admin
        const isAdmin = currentUser && (currentUser.is_admin || currentUser.is_superuser);
        
        if (!isAdmin) {
            console.log('❌ User is not admin, skipping admin panel init');
            return;
        }
        
        // Check if all components are ready
        if (this.adminPanelInitState.userAuthenticated && 
            this.adminPanelInitState.navigationReady && 
            this.adminPanelInitState.domReady && 
            !this.adminPanelInitState.adminPanelReady) {
            
            console.log('✅ All conditions met for admin panel initialization');
            this.adminPanelInitState.adminPanelReady = true;
            
            // Initialize admin panel immediately
            this.initializeAdminPanelNow(currentUser);
        } else {
            console.log('⏳ Waiting for components to be ready:', {
                userAuthenticated: this.adminPanelInitState.userAuthenticated,
                navigationReady: this.adminPanelInitState.navigationReady,
                domReady: this.adminPanelInitState.domReady,
                adminPanelReady: this.adminPanelInitState.adminPanelReady
            });
        }
    }
    
    /**
     * Initialize admin panel immediately when all conditions are met
     */
    async initializeAdminPanelNow(user) {
        try {
            console.log('🚀 Initializing admin panel now...');
            
            // Initialize admin panel through navigation manager
            if (window.navigationManager && window.navigationManager.managers) {
                await window.navigationManager.managers.initializeAdminPanel(user);
            }
            
            // Update navigation to show admin button
            this.updateNavigation();
            
            // Emit success event
            if (window.eventManager) {
                window.eventManager.emit('adminPanelReady', user);
            }
            
            console.log('✅ Admin panel initialized successfully via event system');
            
        } catch (error) {
            console.error('❌ Admin panel initialization failed:', error);
            
            // Emit failure event
            if (window.eventManager) {
                window.eventManager.emit('adminPanelInitFailed', {
                    user: user,
                    error: error.message
                });
            }
        }
    }

    /**
     * Debug method to check admin status and force show admin button
     */
    debugAdminStatus() {
        const currentUser = appState.get('currentUser');
        const adminBtn = document.getElementById('admin-btn');
        
        console.log('🔍 DEBUG: Admin Status Check');
        console.log('Current user:', currentUser);
        console.log('Admin button element:', adminBtn);
        console.log('User is_admin:', currentUser?.is_admin);
        console.log('User is_superuser:', currentUser?.is_superuser);
        console.log('Admin button display:', adminBtn?.style.display);
        
        if (currentUser && (currentUser.is_admin || currentUser.is_superuser)) {
            console.log('✅ User should have admin access');
            if (adminBtn) {
                adminBtn.style.display = 'block';
                console.log('✅ Admin button forced to show');
            } else {
                console.log('❌ Admin button element not found');
            }
        } else {
            console.log('❌ User does not have admin access');
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