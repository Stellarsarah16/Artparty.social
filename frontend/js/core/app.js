/**
 * Core Application Module
 * Handles application initialization and orchestration
 */

import { appState } from './state.js';
import { authService } from '../services/auth.js';
import { canvasService } from '../services/canvas.js';
// Navigation manager is now a global singleton
import { eventManager } from '../utils/events.js';
import { uiUtils } from '../utils/ui.js';

class StellarArtCollabApp {
    constructor() {
        this.initialized = false;
        this.modules = new Map();
        
        // Register core modules
        this.modules.set('state', appState);
        this.modules.set('auth', authService);
        this.modules.set('canvas', canvasService);
        this.modules.set('navigation', window.navigationManager);
        this.modules.set('events', eventManager);
        this.modules.set('ui', uiUtils);
        
        console.log('🚀 StellarArtCollabApp instance created');
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
            await this.waitForDOM();
            
            // Initialize core modules in order
            await this.initializeModules();
            
            // Setup authentication
            await this.initializeAuth();
            
            // Setup UI and event listeners
            this.initializeUI();
            
            // Hide loading screen
            uiUtils.hideLoading();
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            uiUtils.showToast('Failed to initialize application', 'error');
            uiUtils.hideLoading();
        }
    }
    
    /**
     * Wait for DOM to be ready
     */
    async waitForDOM() {
        if (document.readyState === 'loading') {
            console.log('⏳ Waiting for DOM to be ready...');
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        console.log('✅ DOM is ready');
    }
    
    /**
     * Initialize core modules
     */
    async initializeModules() {
        console.log('🔧 Initializing core modules...');
        
        // Initialize state management
        appState.init();
        
        // Initialize navigation
        if (window.navigationManager) {
            window.navigationManager.init();
        }
        
        // Initialize event system
        eventManager.init();
        
        console.log('✅ Core modules initialized');
    }
    
    /**
     * Initialize authentication
     */
    async initializeAuth() {
        console.log('🔧 Initializing authentication...');
        
        // Check if user is already authenticated
        if (CONFIG_UTILS.isAuthenticated()) {
            const userData = CONFIG_UTILS.getUserData();
            if (userData) {
                // User data exists in localStorage
                appState.setUser(userData);
                appState.setAuthenticated(true);
                if (window.navigationManager) {
                    window.navigationManager.showSection('canvas');
                }
                await this.loadCanvases();
            } else {
                // Token exists but no user data, verify with server
                const isValid = await authService.verifyToken();
                if (isValid) {
                    if (window.navigationManager) {
                        window.navigationManager.showSection('canvas');
                    }
                    await this.loadCanvases();
                } else {
                    if (window.navigationManager) {
                        window.navigationManager.showSection('welcome');
                    }
                }
            }
        } else {
            if (window.navigationManager) {
                window.navigationManager.showSection('welcome');
            }
        }
        
        console.log('✅ Authentication initialized');
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        // Initialize color palette
        this.initializeColorPalette();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup event listeners (moved to navigation manager)
        // this.setupEventListeners();
        
        // Setup mobile touch interactions
        this.setupMobileTouchInteractions();
        
        console.log('✅ UI initialized');
    }
    
    /**
     * Setup mobile touch interactions for tools panel
     */
    setupMobileTouchInteractions() {
        // Handle tool button touch interactions
        document.querySelectorAll('.floating-tools-panel .tool-btn').forEach(btn => {
            // Touch start
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('touch-active');
            }, { passive: false });
            
            // Touch end
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                btn.classList.remove('touch-active');
                
                // Trigger the click event
                const tool = btn.id.replace('-tool', '');
                this.selectTool(tool);
            }, { passive: false });
            
            // Touch cancel
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                btn.classList.remove('touch-active');
            }, { passive: false });
        });
        
        // Handle color square touch interactions
        document.querySelectorAll('.floating-tools-panel .color-square').forEach(square => {
            // Touch start
            square.addEventListener('touchstart', (e) => {
                e.preventDefault();
                square.classList.add('touch-active');
            }, { passive: false });
            
            // Touch end
            square.addEventListener('touchend', (e) => {
                e.preventDefault();
                square.classList.remove('touch-active');
                
                // Get the color from the square's background
                const color = square.style.backgroundColor || square.style.background;
                if (color) {
                    this.selectColor(color);
                }
            }, { passive: false });
            
            // Touch cancel
            square.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                square.classList.remove('touch-active');
            }, { passive: false });
        });
        
        // Prevent default touch behaviors on the tools panel
        const toolsPanel = document.getElementById('floating-tools-panel');
        if (toolsPanel) {
            toolsPanel.addEventListener('touchstart', (e) => {
                // Only prevent default if touching interactive elements
                if (e.target.closest('.tool-btn') || e.target.closest('.color-square')) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            toolsPanel.addEventListener('touchmove', (e) => {
                // Prevent scrolling when interacting with tools
                if (e.target.closest('.tool-btn') || e.target.closest('.color-square')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        console.log('✅ Mobile touch interactions initialized');
    }
    
    /**
     * Initialize color palette
     */
    initializeColorPalette() {
        const colorPalette = document.getElementById('color-palette');
        if (!colorPalette) return;
        
        colorPalette.innerHTML = '';
        
        APP_CONFIG.PIXEL_EDITOR.DEFAULT_COLORS.forEach(color => {
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
            appState.setCurrentColor(APP_CONFIG.PIXEL_EDITOR.DEFAULT_COLORS[0]);
        }
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key) {
                case 'Escape':
                    if (window.navigationManager) {
                        window.navigationManager.hideAllModals();
                    }
                    break;
                case 'p':
                    this.selectTool('paint');
                    break;
                case 'e':
                    this.selectTool('eraser');
                    break;
                case 'i':
                    this.selectTool('picker');
                    break;
            }
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Authentication events
        eventManager.on('login:success', (userData) => {
            appState.setUser(userData);
            appState.setAuthenticated(true);
            if (window.navigationManager) {
                window.navigationManager.showSection('canvas');
            }
            this.loadCanvases();
        });
        
        eventManager.on('logout:success', () => {
            appState.setUser(null);
            appState.setAuthenticated(false);
            if (window.navigationManager) {
                window.navigationManager.showSection('welcome');
            }
        });
        
        // Canvas events
        eventManager.on('canvas:selected', (canvas) => {
            this.openCanvas(canvas);
        });
        
        eventManager.on('canvas:created', (canvas) => {
            this.loadCanvases();
        });
        
        // Tool events
        eventManager.on('tool:selected', (tool) => {
            this.selectTool(tool);
        });
        
        eventManager.on('color:selected', (color) => {
            this.selectColor(color);
        });
    }
    
    /**
     * Load canvases from server
     */
    async loadCanvases() {
        try {
            const canvases = await canvasService.getCanvases();
            appState.setCanvases(canvases);
            eventManager.emit('canvases:loaded', canvases);
        } catch (error) {
            console.error('Failed to load canvases:', error);
            uiUtils.showToast('Failed to load canvases', 'error');
        }
    }
    
    /**
     * Open a canvas
     */
    async openCanvas(canvas) {
        try {
            appState.setCurrentCanvas(canvas);
            if (window.navigationManager) {
                window.navigationManager.showSection('editor');
            }
            
            // Load canvas data
            const canvasData = await canvasService.getCanvasData(canvas.id);
            eventManager.emit('canvas:opened', canvasData);
            
        } catch (error) {
            console.error('Failed to open canvas:', error);
            uiUtils.showToast('Failed to open canvas', 'error');
        }
    }
    
    /**
     * Select a tool
     */
    selectTool(tool) {
        appState.setCurrentTool(tool);
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolBtn = document.getElementById(`${tool}-tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
        
        eventManager.emit('tool:changed', tool);
    }
    
    /**
     * Select a color
     */
    selectColor(color) {
        appState.setCurrentColor(color);
        
        // Update UI
        document.querySelectorAll('.color-square').forEach(square => {
            square.classList.remove('active');
        });
        
        const colorSquare = document.querySelector(`[style*="${color}"]`);
        if (colorSquare) {
            colorSquare.classList.add('active');
        }
        
        eventManager.emit('color:changed', color);
    }
    
    /**
     * Get module by name
     */
    getModule(name) {
        return this.modules.get(name);
    }
    
    /**
     * Get current application state
     */
    getState() {
        return appState;
    }
    
    /**
     * Destroy the application
     */
    destroy() {
        console.log('🔄 Destroying application...');
        
        // Cleanup modules
        this.modules.forEach((module, name) => {
            if (module.destroy) {
                module.destroy();
            }
        });
        
        // Clear state
        appState.reset();
        
        this.initialized = false;
        console.log('✅ Application destroyed');
    }
}

// Create singleton instance
const app = new StellarArtCollabApp();

// Export for global access
export default app;
export { StellarArtCollabApp }; 