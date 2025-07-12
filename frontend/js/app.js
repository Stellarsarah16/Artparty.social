/**
 * ArtPartySocial - Main Application Entry Point
 */

import * as Navigation from './modules/navigation.js';
import * as Auth from './modules/auth.js';
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
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ ArtPartySocial ready!');
            
        } catch (error) {
            console.error('❌ Failed to initialize ArtPartySocial:', error);
            throw error;
        }
    }

    async initializeModules() {
        // Initialize app state first (singleton instance)
        this.modules.appState = AppState;
        
        // Initialize authentication
        this.modules.auth = new Auth.AuthManager();
        await this.modules.auth.init();
        
        // Initialize navigation
        this.modules.navigation = new Navigation.NavigationManager();
        await this.modules.navigation.init();
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
            this.modules.navigation.showAuthenticatedView();
        } else {
            // User logged out
            this.modules.appState.setUnauthenticated();
            this.modules.navigation.showUnauthenticatedView();
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
        return this.modules.auth?.isAuthenticated() || false;
    }

    async login(username, password) {
        if (this.modules.auth) {
            return await this.modules.auth.login(username, password);
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
            return await this.modules.auth.register(userData);
        }
        return false;
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
document.addEventListener('DOMContentLoaded', () => {
    window.artPartyApp = new ArtPartySocial();
});

// Export for module usage
export default ArtPartySocial; 