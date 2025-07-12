/**
 * Navigation Module
 * Handles section navigation and modal management
 */

import appState from './app-state.js';

class NavigationManager {
    constructor() {
        console.log('🔧 Initializing NavigationManager...');
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.setupFormHandlers();
        console.log('✅ NavigationManager initialized');
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        console.log('🔧 Initializing DOM elements...');
        const elements = {
            // Navigation
            navbar: document.getElementById('navbar'),
            loginBtn: document.getElementById('login-btn'),
            registerBtn: document.getElementById('register-btn'),
            userInfo: document.getElementById('user-info'),
            username: document.getElementById('username'),
            profileBtn: document.getElementById('profile-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            
            // Sections
            welcomeSection: document.getElementById('welcome-section'),
            canvasSection: document.getElementById('canvas-section'),
            editorSection: document.getElementById('editor-section'),
            gallerySection: document.getElementById('gallery-section'),
            
            // Modals
            loginModal: document.getElementById('login-modal'),
            registerModal: document.getElementById('register-modal'),
            createCanvasModal: document.getElementById('create-canvas-modal'),
            
            // Modal controls
            closeLoginModal: document.getElementById('close-login-modal'),
            closeRegisterModal: document.getElementById('close-register-modal'),
            closeCreateCanvasModal: document.getElementById('close-create-canvas-modal')
        };
        
        console.log('📋 DOM elements found:', Object.keys(elements).filter(key => elements[key] !== null));
        console.log('❌ DOM elements missing:', Object.keys(elements).filter(key => elements[key] === null));
        
        return elements;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Login and Register button click events
        this.elements.loginBtn?.addEventListener('click', () => {
            console.log('Login button clicked');
            this.showModal('login');
        });
        
        this.elements.registerBtn?.addEventListener('click', () => {
            console.log('Register button clicked');
            this.showModal('register');
        });
        
        // Get Started button click event
        const getStartedBtn = document.getElementById('get-started-btn');
        getStartedBtn?.addEventListener('click', () => {
            console.log('Get Started button clicked');
            this.showModal('register');
        });
        
        // Logout button click event
        this.elements.logoutBtn?.addEventListener('click', async () => {
            console.log('Logout button clicked');
            await this.handleLogout();
        });
        
        // Modal close events
        this.elements.closeLoginModal?.addEventListener('click', () => this.hideModal('login'));
        this.elements.closeRegisterModal?.addEventListener('click', () => this.hideModal('register'));
        this.elements.closeCreateCanvasModal?.addEventListener('click', () => this.hideModal('create-canvas'));
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(this.getModalName(e.target));
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        // Subscribe to authentication state changes
        appState.subscribe('isAuthenticated', (isAuthenticated) => {
            this.updateNavigation();
        });
        
        appState.subscribe('currentUser', (user) => {
            this.updateUserInfo(user);
        });
        
        console.log('✅ Event listeners set up');
    }

    /**
     * Setup form submission handlers
     */
    setupFormHandlers() {
        console.log('🔧 Setting up form handlers...');
        
        // Login form submission
        const loginForm = document.getElementById('login-form');
        loginForm?.addEventListener('submit', this.handleLoginSubmit.bind(this));
        
        // Register form submission
        const registerForm = document.getElementById('register-form');
        registerForm?.addEventListener('submit', this.handleRegisterSubmit.bind(this));
        
        console.log('✅ Form handlers set up');
    }

    /**
     * Handle login form submission
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        console.log('Login form submitted');
        
        const form = event.target;
        const formData = new FormData(form);
        
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        console.log('Login credentials:', { username: credentials.username, password: '[HIDDEN]' });
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
            
            // Make API call
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('Login successful:', data);
                
                // Store authentication data
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                
                // Update app state
                appState.setAuthenticated(data.user);
                
                // Update navigation
                this.updateNavigation();
                this.updateUserInfo(data.user);
                
                // Hide modal and show canvas
                this.hideModal('login');
                this.showSection('canvas');
                
                // Reset form
                form.reset();
                
                console.log('✅ Login completed successfully');
                
            } else {
                console.error('Login failed:', data);
                // Show error message
                this.showLoginError(data.detail || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Network error. Please try again.');
        } finally {
            // Restore button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegisterSubmit(event) {
        event.preventDefault();
        console.log('Register form submitted');
        
        const form = event.target;
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            password: formData.get('password'),
            confirm_password: formData.get('confirm_password')
        };
        
        console.log('Register data:', { ...userData, password: '[HIDDEN]', confirm_password: '[HIDDEN]' });
        
        // Basic validation
        if (userData.password !== userData.confirm_password) {
            this.showRegisterError('Passwords do not match');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Creating account...';
            submitButton.disabled = true;
            
            // Make API call
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('Registration successful:', data);
                
                // Store authentication data
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                
                // Update app state
                appState.setAuthenticated(data.user);
                
                // Update navigation
                this.updateNavigation();
                this.updateUserInfo(data.user);
                
                // Hide modal and show canvas
                this.hideModal('register');
                this.showSection('canvas');
                
                // Reset form
                form.reset();
                
                console.log('✅ Registration completed successfully');
                
            } else {
                console.error('Registration failed:', data);
                // Show error message
                this.showRegisterError(data.detail || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegisterError('Network error. Please try again.');
        } finally {
            // Restore button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Show login error message
     */
    showLoginError(message) {
        console.error('Login error:', message);
        // You can implement a proper error display here
        alert(`Login Error: ${message}`);
    }

    /**
     * Show register error message
     */
    showRegisterError(message) {
        console.error('Register error:', message);
        // You can implement a proper error display here
        alert(`Registration Error: ${message}`);
    }
    
    /**
     * Show a section and hide others
     */
    showSection(sectionName) {
        console.log(`Showing section: ${sectionName}`);
        
        // Hide all sections by adding hidden class
        Object.values(this.elements).forEach(element => {
            if (element && element.id && element.id.endsWith('-section')) {
                element.classList.add('hidden');
            }
        });
        
        // Show requested section by removing hidden class
        const section = this.elements[`${sectionName}Section`];
        if (section) {
            section.classList.remove('hidden');
            appState.setCurrentSection(sectionName);
            
            // Update URL without triggering page reload
            history.pushState({ section: sectionName }, '', `#${sectionName}`);
            console.log(`Section shown: ${sectionName}`);
        } else {
            console.warn(`Section not found: ${sectionName}`);
        }
    }
    
    /**
     * Show a modal
     */
    showModal(modalName) {
        console.log(`Showing modal: ${modalName}`);
        
        // Handle different modal naming conventions
        let modal;
        
        if (modalName === 'create-canvas') {
            modal = this.elements.createCanvasModal;
        } else if (modalName === 'login') {
            modal = this.elements.loginModal;
        } else if (modalName === 'register') {
            modal = this.elements.registerModal;
        } else {
            // Fallback to direct DOM lookup
            modal = document.getElementById(`${modalName}-modal`);
        }
        
        if (modal) {
            // Show modal using CSS classes and inline styles
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            
            // Focus first input in modal
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log(`Modal opened: ${modalName}`);
        } else {
            console.error(`Modal not found: ${modalName}`);
        }
    }
    
    /**
     * Hide a modal
     */
    hideModal(modalName) {
        console.log(`Hiding modal: ${modalName}`);
        
        let modal;
        
        if (modalName === 'create-canvas') {
            modal = this.elements.createCanvasModal;
        } else if (modalName === 'login') {
            modal = this.elements.loginModal;
        } else if (modalName === 'register') {
            modal = this.elements.registerModal;
        } else {
            // Fallback to direct DOM lookup
            modal = document.getElementById(`${modalName}-modal`);
        }
        
        if (modal) {
            // Remove active class and hide
            modal.classList.remove('active');
            // Wait for CSS transition to complete before hiding
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
            
            document.body.classList.remove('modal-open');
            console.log(`Modal closed: ${modalName}`);
        } else {
            console.warn(`Modal not found for hiding: ${modalName}`);
        }
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        console.log('Hiding all modals...');
        
        // Hide using CSS classes
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        });
        
        document.body.classList.remove('modal-open');
        
        console.log('All modals hidden');
    }
    
    /**
     * Get modal name from element
     */
    getModalName(modalElement) {
        const id = modalElement.id;
        return id.replace('-modal', '');
    }
    
    /**
     * Update navigation based on authentication state
     */
    updateNavigation() {
        const isAuthenticated = appState.get('isAuthenticated');
        console.log(`Updating navigation, authenticated: ${isAuthenticated}`);
        
        if (isAuthenticated) {
            // Show authenticated navigation
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'none';
            }
            if (this.elements.registerBtn) {
                this.elements.registerBtn.style.display = 'none';
            }
            if (this.elements.userInfo) {
                this.elements.userInfo.classList.remove('hidden');
                this.elements.userInfo.style.display = 'flex';
            }
        } else {
            // Show unauthenticated navigation
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'inline-block';
            }
            if (this.elements.registerBtn) {
                this.elements.registerBtn.style.display = 'inline-block';
            }
            if (this.elements.userInfo) {
                this.elements.userInfo.classList.add('hidden');
                this.elements.userInfo.style.display = 'none';
            }
        }
    }
    
    /**
     * Update user info display
     */
    updateUserInfo(user) {
        if (user && this.elements.username) {
            this.elements.username.textContent = user.username;
            console.log(`User info updated: ${user.username}`);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            // Clear authentication data
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            
            // Update app state
            appState.setUnauthenticated();
            
            // Update navigation
            this.updateNavigation();
            
            // Show welcome section
            this.showSection('welcome');
            
            console.log('✅ User logged out successfully');
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    /**
     * Handle browser back/forward navigation
     */
    handlePopState(event) {
        const section = event.state?.section || 'welcome';
        this.showSection(section);
    }
    
    /**
     * Navigate to section with browser history
     */
    navigateTo(sectionName) {
        this.showSection(sectionName);
    }
    
    /**
     * Get current section
     */
    getCurrentSection() {
        return appState.get('currentSection');
    }
    
    /**
     * Show loading screen
     */
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Create singleton instance
const navigationManager = new NavigationManager();

// Export methods for external use
export const showSection = (sectionName) => navigationManager.showSection(sectionName);
export const showModal = (modalName) => navigationManager.showModal(modalName);
export const hideModal = (modalName) => navigationManager.hideModal(modalName);
export const showLoading = () => navigationManager.showLoading();
export const hideLoading = () => navigationManager.hideLoading();

export default navigationManager; 