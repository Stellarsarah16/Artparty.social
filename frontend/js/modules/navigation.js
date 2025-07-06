/**
 * Navigation Module
 * Handles section navigation and modal management
 */

import appState from './app-state.js';

class NavigationManager {
    constructor() {
        this.elements = this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        return {
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
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
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
    }
    
    /**
     * Show a specific section
     */
    showSection(sectionName) {
        // Hide all sections
        Object.values(this.elements).forEach(element => {
            if (element && element.id && element.id.endsWith('-section')) {
                element.style.display = 'none';
            }
        });
        
        // Show requested section
        const section = this.elements[`${sectionName}Section`];
        if (section) {
            section.style.display = 'block';
            appState.setCurrentSection(sectionName);
            
            // Update URL without triggering page reload
            history.pushState({ section: sectionName }, '', `#${sectionName}`);
        } else {
            console.warn(`Section not found: ${sectionName}`);
        }
    }
    
    /**
     * Show a modal
     */
    showModal(modalName) {
        const modal = this.elements[`${modalName}Modal`];
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // Focus first input in modal
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        } else {
            console.warn(`Modal not found: ${modalName}`);
        }
    }
    
    /**
     * Hide a modal
     */
    hideModal(modalName) {
        const modal = this.elements[`${modalName}Modal`];
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        Object.values(this.elements).forEach(element => {
            if (element && element.id && element.id.endsWith('-modal')) {
                element.style.display = 'none';
            }
        });
        document.body.classList.remove('modal-open');
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
        
        if (isAuthenticated) {
            // Show authenticated navigation
            if (this.elements.loginBtn) this.elements.loginBtn.style.display = 'none';
            if (this.elements.registerBtn) this.elements.registerBtn.style.display = 'none';
            if (this.elements.userInfo) this.elements.userInfo.style.display = 'flex';
        } else {
            // Show unauthenticated navigation
            if (this.elements.loginBtn) this.elements.loginBtn.style.display = 'inline-block';
            if (this.elements.registerBtn) this.elements.registerBtn.style.display = 'inline-block';
            if (this.elements.userInfo) this.elements.userInfo.style.display = 'none';
        }
    }
    
    /**
     * Update user info display
     */
    updateUserInfo(user) {
        if (user && this.elements.username) {
            this.elements.username.textContent = user.username;
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
        appState.setLoading(true);
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        appState.setLoading(false);
    }
}

// Create singleton instance
const navigationManager = new NavigationManager();

// Export functions for backwards compatibility
export const showSection = (sectionName) => navigationManager.showSection(sectionName);
export const showModal = (modalName) => navigationManager.showModal(modalName);
export const hideModal = (modalName) => navigationManager.hideModal(modalName);
export const showLoading = () => navigationManager.showLoading();
export const hideLoading = () => navigationManager.hideLoading();

export default navigationManager; 