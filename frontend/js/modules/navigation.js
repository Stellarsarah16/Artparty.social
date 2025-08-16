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
        
        // Wait for API to be available before initializing managers
        this.waitForAPIAndInitialize();
    }
    
    async waitForAPIAndInitialize() {
        // Wait for API to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.API && attempts < maxAttempts) {
            console.log(`⏳ Waiting for API... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.API) {
            console.error('❌ API not available after waiting');
            throw new Error('API not available after waiting');
        }
        
        console.log('✅ API available, initializing managers...');
        
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
        
        // Admin button click event
        const adminBtn = document.getElementById('admin-btn');
        adminBtn?.addEventListener('click', () => {
            console.log('Admin button clicked');
            this.showSection('admin');
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
            'gallery-section',
            'admin-section'
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

            // When showing the viewer, force a resize after a tick to ensure correct initial size
            if (sectionName === 'viewer' && window.CanvasViewer) {
                requestAnimationFrame(() => {
                    try {
                        window.CanvasViewer.resizeCanvas();
                        // Double-tick to catch late layout on mobile browsers
                        setTimeout(() => window.CanvasViewer.resizeCanvas(), 50);
                    } catch (e) {
                        console.warn('Viewer resize after show failed:', e);
                    }
                });
            }
            
            // When showing the admin panel, initialize it
            if (sectionName === 'admin' && this.managers.admin) {
                console.log('🔧 Initializing admin panel...');
                this.managers.admin.init();
                
                // FIXED: Ensure admin panel is ready before showing
                setTimeout(() => {
                    if (this.managers.admin.initialized) {
                        console.log('✅ Admin panel ready, showing dashboard...');
                        this.managers.admin.showView('dashboard');
                    }
                }, 100);
            }
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
        // Initialize pending operations map for potential future use
        this.pendingOperations = new Map();
        
        // For now, we'll rely on the button-level debouncing in CanvasListManager
        // which is more reliable and user-friendly
        console.log('🔧 Async race protection initialized (button-level debouncing active)');
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
    
    /**
     * Clear pending operations (for debugging)
     */
    clearPendingOperations() {
        console.log('🧹 Clearing pending operations:', Array.from(this.pendingOperations.entries()));
        this.pendingOperations.clear();
        console.log('✅ Pending operations cleared');
    }
}

// Create and export singleton instance
let navigationManager = null;
let initializationPromise = null;

// Initialize navigation manager asynchronously
const initializeNavigationManager = async () => {
    // If already initializing, wait for that to complete
    if (initializationPromise) {
        console.log('⏳ Navigation manager already initializing, waiting...');
        return await initializationPromise;
    }
    
    // If already initialized, return the instance
    if (navigationManager) {
        console.log('✅ Navigation manager already initialized, returning existing instance');
        return navigationManager;
    }
    
    // Start initialization
    console.log('🚀 Starting navigation manager initialization...');
    initializationPromise = (async () => {
        try {
            navigationManager = new NavigationManager();
            // Wait for the async initialization to complete
            await navigationManager.waitForAPIAndInitialize();
            
            // Make navigation manager available globally for debugging
            window.navigationManager = navigationManager;
            console.log('✅ Navigation manager fully initialized and available globally');
            return navigationManager;
        } catch (error) {
            console.error('❌ Navigation manager initialization failed:', error);
            // Reset promise so we can retry
            initializationPromise = null;
            throw error;
        }
    })();
    
    return await initializationPromise;
};

// Start initialization immediately
initializeNavigationManager().catch(error => {
    console.error('❌ Failed to initialize navigation manager:', error);
});

// Export the initialization function for external use
export const getNavigationManager = () => navigationManager;

// Export functions for external use
export const showSection = async (sectionName) => {
    const manager = await initializeNavigationManager();
    return manager.showSection(sectionName);
};

export const showModal = async (modalName) => {
    const manager = await initializeNavigationManager();
    return manager.showModal(modalName);
};

export const hideModal = async (modalName) => {
    const manager = await initializeNavigationManager();
    return manager.hideModal(modalName);
};

export const showLoading = async () => {
    const manager = await initializeNavigationManager();
    return manager.showLoading();
};

export const hideLoading = async () => {
    const manager = await initializeNavigationManager();
    return manager.hideLoading();
};

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

window.clearPendingOperations = () => {
    if (window.navigationManager) {
        window.navigationManager.clearPendingOperations();
    } else {
        console.error('Navigation manager not available');
    }
};

console.log('✅ Navigation module loaded'); 