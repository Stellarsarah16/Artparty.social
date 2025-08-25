/**
 * Artparty.social - Main Application Entry Point
 * Copyright (c) 2025 Artparty.social. All rights reserved.
 * 
 * This file is part of Artparty.social, a collaborative pixel art platform.
 * Unauthorized copying, modification, or distribution is prohibited.
 */

import { showSection } from './modules/navigation.js';
import Auth from './modules/auth.js';
import AppState from './modules/app-state.js';

class ArtPartySocial {
    constructor() {
        this.initialized = false;
        this.modules = {
            navigation: null,
            auth: null,
            appState: null
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting ArtPartySocial...');
            
            // Initialize core modules
            await this.initializeModules();
            
            // Check initial authentication state
            await this.checkInitialAuthState();
            
            // Set up event listeners (moved to navigation manager)
            // this.setupEventListeners();
            
            // Set up dynamic tile sizing
            this.setupDynamicTileSizing();
            
            this.initialized = true;
            console.log('✅ ArtPartySocial ready!');
            
        } catch (error) {
            console.error('❌ Failed to initialize ArtPartySocial:', error);
            
            // Ensure loading screen is hidden even on error
            this.hideLoadingScreen();
            
            // Show error message to user
            this.showErrorState('Failed to initialize application. Please refresh the page.');
            
            throw error;
        }
    }

    async initializeModules() {
        // Initialize modules (all are singleton instances)
        this.modules.appState = AppState;
        this.modules.auth = Auth;
        
        // Wait for navigation manager to be fully initialized
        console.log('⏳ Waiting for navigation manager to initialize...');
        
        // Wait for the navigation manager to be available
        let attempts = 0;
        const maxAttempts = 150; // Increase wait (15s) for slower mobile devices
        
        while (!window.navigationManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.navigationManager && window.navigationManager.managers) {
            this.modules.navigation = window.navigationManager;
            console.log('✅ Navigation manager initialized');
        } else {
            console.warn('⚠️ Navigation manager not fully ready. Proceeding with deferred init.');
            // Defer navigation setup; try once more shortly to avoid hard failure on mobile
            setTimeout(() => {
                if (!this.modules.navigation && window.navigationManager && window.navigationManager.managers) {
                    this.modules.navigation = window.navigationManager;
                    console.log('✅ Navigation manager initialized (deferred)');
                }
            }, 500);
        }
        
        console.log('✅ All modules initialized');
    }

    async checkInitialAuthState() {
        console.log('🔍 Checking initial authentication state...');
        
        // Check if user is authenticated based on stored tokens
        const isAuthenticated = CONFIG_UTILS.isAuthenticated();
        const userData = CONFIG_UTILS.getUserData();
        
        if (isAuthenticated && userData) {
            // User has valid authentication data
            console.log('✅ User is authenticated, showing canvas section');
            this.modules.appState.setAuthenticated(userData);
            this.modules.navigation.showSection('canvas');
        } else {
            // User is not authenticated, show welcome/login section
            console.log('ℹ️ User not authenticated, showing welcome section');
            this.modules.appState.setUnauthenticated();
            this.modules.navigation.showSection('welcome');
        }
        
        // Update navigation UI
        if (window.navigationManager) {
            window.navigationManager.updateNavigation();
        }
        
        // Hide loading screen now that initialization is complete
        this.hideLoadingScreen();
        
        console.log('✅ Initial authentication state checked');
    }

    /**
     * Hide the loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            console.log('✅ Loading screen hidden');
        } else {
            console.warn('⚠️ Loading screen element not found');
        }
    }

    /**
     * Show error state to user
     */
    showErrorState(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3 style="color: #e74c3c; margin-top: 0;">Application Error</h3>
            <p style="margin: 10px 0;">${message}</p>
            <button onclick="window.location.reload()" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Refresh Page
            </button>
        `;
        document.body.appendChild(errorDiv);
    }

    setupEventListeners() {
        // Handle global app events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Handle authentication state changes
        document.addEventListener('auth:stateChanged', (event) => {
            this.handleAuthStateChange(event.detail);
        });
        
        // Handle navigation events
        document.addEventListener('nav:changed', (event) => {
            this.handleNavigationChange(event.detail);
        });
    }

    handleAuthStateChange(authState) {
        if (authState.isAuthenticated) {
            // User logged in
            this.modules.appState.setAuthenticated(authState.user);
            this.modules.navigation.updateNavigation();
            this.modules.navigation.showSection('canvas');
        } else {
            // User logged out
            this.modules.appState.setUnauthenticated();
            this.modules.navigation.updateNavigation();
            this.modules.navigation.showSection('welcome');
        }
    }

    handleNavigationChange(navData) {
        // Update app state based on navigation
        this.modules.appState.setCurrentSection(navData.section);
    }

    // Public API methods
    showSection(sectionId) {
        if (this.modules.navigation) {
            this.modules.navigation.showSection(sectionId);
        }
    }

    updateNavigation() {
        if (this.modules.navigation) {
            this.modules.navigation.updateNavigation();
        }
    }

    getCurrentUser() {
        return this.modules.appState?.get('currentUser');
    }

    isAuthenticated() {
        return this.modules.appState?.get('isAuthenticated') || false;
    }

    async login(username, password) {
        if (this.modules.auth) {
            // Note: Auth module primarily handles form events, not direct API calls
            // Use the API directly or create a login event
            return await this.modules.auth.verifyToken();
        }
        return false;
    }

    async logout() {
        if (this.modules.auth) {
            return await this.modules.auth.logout();
        }
        return false;
    }

    async register(userData) {
        if (this.modules.auth) {
            // Note: Auth module primarily handles form events, not direct API calls
            // For direct registration, use the API module
            return false;
        }
        return false;
    }

    setupDynamicTileSizing() {
        // Apply initial tile sizing on load
        if (typeof adjustTileSize === 'function') {
            adjustTileSize();
            
            // Apply on window resize
            window.addEventListener('resize', adjustTileSize);
            window.addEventListener('orientationchange', () => {
                // Small delay to allow orientation change to complete
                setTimeout(adjustTileSize, 100);
            });
            
            console.log('🎨 Dynamic tile sizing system initialized');
        } else {
            console.warn('⚠️ adjustTileSize function not found - tile sizing may be static');
        }
    }

    // Lifecycle methods
    cleanup() {
        // Clean up modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.cleanup === 'function') {
                module.cleanup();
            }
        });
        
        // Remove event listeners
        window.removeEventListener('beforeunload', this.cleanup);
        document.removeEventListener('auth:stateChanged', this.handleAuthStateChange);
        document.removeEventListener('nav:changed', this.handleNavigationChange);
        
        this.initialized = false;
        console.log('✅ ArtPartySocial destroyed');
    }
}

// Initialize the app when DOM is ready
console.log('🔧 App.js loaded, setting up DOMContentLoaded listener...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded fired, initializing ArtPartySocial...');
    try {
        window.artPartyApp = new ArtPartySocial();
        console.log('✅ ArtPartySocial instance created');
    } catch (error) {
        console.error('❌ Failed to create ArtPartySocial instance:', error);
    }
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
} else {
    console.log('✅ DOM already loaded, initializing immediately...');
    try {
        window.artPartyApp = new ArtPartySocial();
        console.log('✅ ArtPartySocial instance created (immediate)');
    } catch (error) {
        console.error('❌ Failed to create ArtPartySocial instance (immediate):', error);
    }
}

// Export for module usage
export default ArtPartySocial; 