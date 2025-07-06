/**
 * Main Application Entry Point - Refactored with SOLID Principles
 * This file orchestrates the various modules and initializes the application
 */

// Import focused modules
import appState from './modules/app-state.js';
import authManager from './modules/auth.js';
import navigationManager, { showSection, hideLoading } from './modules/navigation.js';
import uiUtils, { showToast } from './modules/ui-utils.js';

// Import existing modules (will be refactored next)
import './config.js';
import './form-validation.js';

/**
 * Application class that orchestrates all modules
 */
class StellarArtCollabApp {
    constructor() {
        this.initialized = false;
        this.modules = {
            appState,
            authManager,
            navigationManager,
            uiUtils
        };
    }
    
    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }
        
        try {
            console.log('🚀 Initializing StellarArtCollab...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize core modules
            await this.initializeCore();
            
            // Setup authentication
            await this.initializeAuth();
            
            // Setup event listeners
            this.initializeEventListeners();
            
            // Initialize UI components
            this.initializeUI();
            
            // Hide loading screen
            hideLoading();
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            showToast('Failed to initialize application', 'error');
            hideLoading();
        }
    }
    
    /**
     * Initialize core application functionality
     */
    async initializeCore() {
        // Initialize color palette
        this.initializeColorPalette();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✅ Core modules initialized');
    }
    
    /**
     * Initialize authentication and check current status
     */
    async initializeAuth() {
        // Check if user is already authenticated
        if (CONFIG_UTILS.isAuthenticated()) {
            const userData = CONFIG_UTILS.getUserData();
            if (userData) {
                // User data exists in localStorage
                appState.setAuthenticated(userData);
                showSection('canvas');
                await this.loadCanvases();
            } else {
                // Token exists but no user data, verify with server
                const isValid = await authManager.verifyToken();
                if (isValid) {
                    showSection('canvas');
                    await this.loadCanvases();
                } else {
                    showSection('welcome');
                }
            }
        } else {
            showSection('welcome');
        }
        
        console.log('✅ Authentication initialized');
    }
    
    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Navigation events
        document.getElementById('login-btn')?.addEventListener('click', () => navigationManager.showModal('login'));
        document.getElementById('register-btn')?.addEventListener('click', () => navigationManager.showModal('register'));
        document.getElementById('logout-btn')?.addEventListener('click', () => authManager.logout());
        
        // Welcome section events
        document.getElementById('get-started-btn')?.addEventListener('click', this.handleGetStarted.bind(this));
        
        // Canvas section events
        document.getElementById('create-canvas-btn')?.addEventListener('click', () => navigationManager.showModal('create-canvas'));
        document.getElementById('refresh-canvases-btn')?.addEventListener('click', this.loadCanvases.bind(this));
        document.getElementById('back-to-canvases-btn')?.addEventListener('click', () => showSection('canvas'));
        
        // Form events
        document.getElementById('login-form')?.addEventListener('submit', authManager.handleLogin.bind(authManager));
        document.getElementById('register-form')?.addEventListener('submit', authManager.handleRegister.bind(authManager));
        document.getElementById('create-canvas-form')?.addEventListener('submit', this.handleCreateCanvas.bind(this));
        
        // Tool events (these will be moved to a ToolManager module later)
        document.getElementById('paint-tool')?.addEventListener('click', () => this.selectTool('paint'));
        document.getElementById('eraser-tool')?.addEventListener('click', () => this.selectTool('eraser'));
        document.getElementById('picker-tool')?.addEventListener('click', () => this.selectTool('picker'));
        
        // Window events
        window.addEventListener('popstate', navigationManager.handlePopState.bind(navigationManager));
        
        console.log('✅ Event listeners initialized');
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        // Initialize form validation
        if (window.initializeFormValidation) {
            window.initializeFormValidation();
        }
        
        console.log('✅ UI components initialized');
    }
    
    /**
     * Initialize color palette
     */
    initializeColorPalette() {
        const colorPalette = document.getElementById('color-palette');
        if (!colorPalette) return;
        
        colorPalette.innerHTML = '';
        
        const defaultColors = [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
            '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080'
        ];
        
        defaultColors.forEach(color => {
            const colorSquare = document.createElement('div');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = color;
            colorSquare.title = color;
            colorSquare.addEventListener('click', () => this.selectColor(color));
            colorPalette.appendChild(colorSquare);
        });
        
        // Set first color as active
        const firstColor = colorPalette.firstElementChild;
        if (firstColor) {
            firstColor.classList.add('active');
            appState.setCurrentColor(defaultColors[0]);
        }
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key) {
                case 'p':
                case 'P':
                    this.selectTool('paint');
                    break;
                case 'e':
                case 'E':
                    this.selectTool('eraser');
                    break;
                case 'i':
                case 'I':
                    this.selectTool('picker');
                    break;
                case 'Escape':
                    navigationManager.hideAllModals();
                    break;
            }
        });
    }
    
    /**
     * Handle get started button click
     */
    async handleGetStarted() {
        if (appState.get('isAuthenticated')) {
            showSection('canvas');
            await this.loadCanvases();
        } else {
            navigationManager.showModal('register');
        }
    }
    
    /**
     * Load canvases (placeholder - will be moved to CanvasManager)
     */
    async loadCanvases() {
        // This is a placeholder - the actual implementation will be in CanvasManager
        console.log('Loading canvases...');
        // TODO: Implement canvas loading
    }
    
    /**
     * Handle create canvas form submission (placeholder)
     */
    async handleCreateCanvas(e) {
        e.preventDefault();
        console.log('Creating canvas...');
        // TODO: Implement canvas creation
    }
    
    /**
     * Select a tool (placeholder - will be moved to ToolManager)
     */
    selectTool(tool) {
        console.log(`Selected tool: ${tool}`);
        appState.setCurrentTool(tool);
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolBtn = document.getElementById(`${tool}-tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
    }
    
    /**
     * Select a color (placeholder - will be moved to ToolManager)
     */
    selectColor(color) {
        console.log(`Selected color: ${color}`);
        appState.setCurrentColor(color);
        
        // Update UI
        document.querySelectorAll('.color-square').forEach(square => {
            square.classList.remove('active');
        });
        
        const colorSquare = document.querySelector(`[style*="${color}"]`);
        if (colorSquare) {
            colorSquare.classList.add('active');
        }
    }
    
    /**
     * Get application state
     */
    getState() {
        return appState.getState();
    }
    
    /**
     * Get specific module
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
}

// Create application instance
const app = new StellarArtCollabApp();

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for global access
window.StellarArtCollab = app;

// Export for module usage
export default app; 