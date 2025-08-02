/**
 * Navigation Module (Refactored)
 * Main coordinator that delegates to specialized managers
 * Follows SOLID principles with single responsibility
 */

import appState from './app-state.js';
import { eventManager } from '../utils/events.js';
import { createManagers } from './managers/index.js';

class NavigationManager {
    constructor() {
        console.log('🔧 Initializing NavigationManager...');
        
        // Initialize all specialized managers
        this.managers = createManagers();
        
        // Initialize DOM elements
        this.elements = this.initializeElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup comprehensive state protection
        this.setupBrowserNavigationHandlers();
        this.setupWebSocketStateProtection();
        this.setupAsyncRaceProtection();
        
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
            viewerSection: document.getElementById('viewer-section'),
            editorSection: document.getElementById('editor-section'),
            gallerySection: document.getElementById('gallery-section'),
            
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
            this.managers.modal.showModal('login');
        });
        
        this.elements.registerBtn?.addEventListener('click', () => {
            console.log('Register button clicked');
            this.managers.modal.showModal('register');
        });
        
        // Get Started button click event
        const getStartedBtn = document.getElementById('get-started-btn');
        getStartedBtn?.addEventListener('click', () => {
            console.log('Get Started button clicked');
            this.managers.modal.showModal('register');
        });
        
        // Create Canvas button click event
        const createCanvasBtn = document.getElementById('create-canvas-btn');
        createCanvasBtn?.addEventListener('click', () => {
            console.log('Create Canvas button clicked');
            this.managers.modal.showModal('create-canvas');
        });
        
        // Refresh Canvases button click event
        const refreshCanvasesBtn = document.getElementById('refresh-canvases-btn');
        refreshCanvasesBtn?.addEventListener('click', () => {
            console.log('Refresh Canvases button clicked');
            this.managers.canvasList.loadCanvases();
        });
        
        // Logout button click event
        this.elements.logoutBtn?.addEventListener('click', () => {
            console.log('Logout button clicked');
            this.managers.auth.handleLogout();
        });
        
        // Close modal buttons
        this.elements.closeLoginModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('login');
        });
        
        this.elements.closeRegisterModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('register');
        });
        
        this.elements.closeCreateCanvasModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('create-canvas');
        });
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Show a section by name
     */
    showSection(sectionName) {
        console.log(`🔄 Showing section: ${sectionName}`);
        
        // Hide all sections
        const sections = [
            'welcome-section',
            'canvas-section', 
            'viewer-section',
            'editor-section',
            'gallery-section'
        ];
        
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.classList.add('hidden');
            }
        });
        
        // Show requested section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log(`✅ Section ${sectionName} shown`);
        } else {
            console.error(`❌ Section ${sectionName} not found`);
        }
        
        // Update navigation state
        this.updateNavigation();
    }
    
    /**
     * Open a canvas (delegate to canvas viewer manager)
     */
    async openCanvas(canvas) {
        return this.managers.canvasViewer.openCanvas(canvas);
    }
    
    /**
     * Load canvases (delegate to canvas list manager)
     */
    async loadCanvases() {
        return this.managers.canvasList.loadCanvases();
    }
    
    /**
     * Show modal (delegate to modal manager)
     */
    showModal(modalName) {
        return this.managers.modal.showModal(modalName);
    }
    
    /**
     * Hide modal (delegate to modal manager)
     */
    hideModal(modalName) {
        return this.managers.modal.hideModal(modalName);
    }
    
    /**
     * Show loading (delegate to UI manager)
     */
    showLoading() {
        if (window.UIManager) {
            window.UIManager.showLoading();
        }
    }
    
    /**
     * Hide loading (delegate to UI manager)
     */
    hideLoading() {
        if (window.UIManager) {
            window.UIManager.hideLoading();
        }
    }
    
    /**
     * Update navigation based on current state
     */
    updateNavigation() {
        const currentUser = appState.get('currentUser');
        const isAuthenticated = currentUser !== null;
        
        // Update user info if authenticated
        if (isAuthenticated) {
            this.managers.auth.updateUserInfo(currentUser);
        }
        
        // Update navigation visibility
        this.managers.auth.updateNavigation();
    }
    
    /**
     * Setup browser navigation handlers
     */
    setupBrowserNavigationHandlers() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const section = event.state?.section || 'welcome';
            this.showSection(section);
        });
        
        // Update browser history when navigating
        const originalShowSection = this.showSection.bind(this);
        this.showSection = (sectionName) => {
            originalShowSection(sectionName);
            window.history.pushState({ section: sectionName }, '', `#${sectionName}`);
        };
    }
    
    /**
     * Setup WebSocket state protection
     */
    setupWebSocketStateProtection() {
        // Clean up WebSocket connections when leaving canvas viewer
        const originalShowSection = this.showSection.bind(this);
        this.showSection = (sectionName) => {
            if (sectionName !== 'viewer') {
                this.managers.webSocket.closeAll();
            }
            originalShowSection(sectionName);
        };
    }
    
    /**
     * Setup async race protection
     */
    setupAsyncRaceProtection() {
        // Prevent multiple simultaneous operations
        this.pendingOperations = new Set();
        
        // Add protection to async operations
        const originalOpenCanvas = this.openCanvas.bind(this);
        this.openCanvas = async (canvas) => {
            if (this.pendingOperations.has('openCanvas')) {
                console.warn('Canvas opening already in progress');
                return;
            }
            
            this.pendingOperations.add('openCanvas');
            try {
                await originalOpenCanvas(canvas);
            } finally {
                this.pendingOperations.delete('openCanvas');
            }
        };
    }
    
    /**
     * Clear all canvas state
     */
    clearAllCanvasState() {
        console.log('🧹 Clearing all canvas state...');
        
        // Clear WebSocket connections
        this.managers.webSocket.closeAll();
        
        // Clear any pending operations
        this.pendingOperations.clear();
        
        // Clear app state
        appState.clear();
        
        console.log('✅ Canvas state cleared');
    }
    
    /**
     * Handle error recovery
     */
    handleErrorRecovery(error, operation) {
        console.error(`❌ Error in ${operation}:`, error);
        
        // Clear state and show error
        this.clearAllCanvasState();
        
        if (window.UIManager) {
            window.UIManager.showToast(`Error in ${operation}. Please try again.`, 'error');
        }
        
        // Return to welcome section
        this.showSection('welcome');
    }
    
    /**
     * Emergency state recovery
     */
    emergencyStateRecovery() {
        console.log('🚨 Emergency state recovery initiated...');
        
        // Clear all state
        this.clearAllCanvasState();
        
        // Reset UI
        this.updateNavigation();
        
        // Show welcome section
        this.showSection('welcome');
        
        // Hide all modals
        this.managers.modal.hideAllModals();
        
        console.log('✅ Emergency recovery completed');
    }
    
    /**
     * Test state clearing (for debugging)
     */
    testStateClearing() {
        console.log('🧪 Testing state clearing...');
        this.clearAllCanvasState();
        console.log('✅ State clearing test completed');
    }
}

// Create and export singleton instance
const navigationManager = new NavigationManager();

// Make navigation manager available globally for debugging
window.navigationManager = navigationManager;

// Export functions for external use
export const showSection = (sectionName) => navigationManager.showSection(sectionName);
export const showModal = (modalName) => navigationManager.showModal(modalName);
export const hideModal = (modalName) => navigationManager.hideModal(modalName);
export const showLoading = () => navigationManager.showLoading();
export const hideLoading = () => navigationManager.hideLoading();

// Add global test functions for debugging
window.testStateClearing = () => {
    if (window.navigationManager) {
        window.navigationManager.testStateClearing();
    } else {
        console.error('Navigation manager not available');
    }
};

window.emergencyRecovery = () => {
    if (window.navigationManager) {
        window.navigationManager.emergencyStateRecovery();
    } else {
        console.error('Navigation manager not available');
    }
};

console.log('✅ Navigation module loaded'); 