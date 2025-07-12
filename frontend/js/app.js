/**
 * ArtPartySocial - Main Application Entry Point
 */

import Navigation from './modules/navigation.js';
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
        // Initialize modules (all are singleton instances)
        this.modules.appState = AppState;
        this.modules.auth = Auth;
        this.modules.navigation = Navigation;
        
        // All modules are already initialized as singletons
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
        this.modules.navigation.updateNavigation();
        
        console.log('✅ Initial authentication state checked');
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