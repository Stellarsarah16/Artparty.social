/**
 * StellarCollabApp - Main Application Entry Point
 * Clean, modular initialization without debug code
 */

// Import core modules
import app from './core/app.js';

// Application initialization
class StellarCollabApp {
    constructor() {
        this.app = app;
        this.initialized = false;
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
            console.log('🚀 Starting StellarCollabApp...');
            
            // Initialize the core application
            await this.app.init();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            this.initialized = true;
            console.log('✅ StellarCollabApp ready!');
            
        } catch (error) {
            console.error('❌ Failed to initialize StellarCollabApp:', error);
        }
    }
    
    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Handle login button clicks
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.app.getModule('navigation').showModal('login');
        });
        
        // Handle register button clicks
        document.getElementById('register-btn')?.addEventListener('click', () => {
            this.app.getModule('navigation').showModal('register');
        });
        
        // Handle logout button clicks
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.app.getModule('auth').logout();
        });
        
        // Handle get started button
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            const isAuthenticated = this.app.getModule('auth').isAuthenticated();
            if (isAuthenticated) {
                this.app.getModule('navigation').showSection('canvas');
            } else {
                this.app.getModule('navigation').showModal('login');
            }
        });
        
        // Handle create canvas button
        document.getElementById('create-canvas-btn')?.addEventListener('click', () => {
            this.app.getModule('navigation').showModal('create-canvas');
        });
        
        // Handle refresh canvases button
        document.getElementById('refresh-canvases-btn')?.addEventListener('click', () => {
            this.app.loadCanvases();
        });
        
        // Handle back to canvases button
        document.getElementById('back-to-canvases-btn')?.addEventListener('click', () => {
            this.app.getModule('navigation').showSection('canvas');
        });
        
        // Handle form submissions
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            this.app.getModule('auth').handleLoginForm(e);
        });
        
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            this.app.getModule('auth').handleRegisterForm(e);
        });
        
        document.getElementById('create-canvas-form')?.addEventListener('submit', (e) => {
            this.handleCreateCanvasForm(e);
        });
        
        // Handle modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    const modalName = modal.id.replace('-modal', '');
                    this.app.getModule('navigation').hideModal(modalName);
                }
            });
        });
        
        // Handle tool selections
        document.getElementById('paint-tool')?.addEventListener('click', () => {
            this.app.selectTool('paint');
        });
        
        document.getElementById('eraser-tool')?.addEventListener('click', () => {
            this.app.selectTool('eraser');
        });
        
        document.getElementById('picker-tool')?.addEventListener('click', () => {
            this.app.selectTool('picker');
        });
        
        // Handle custom color picker
        document.getElementById('custom-color-picker')?.addEventListener('change', (e) => {
            this.app.selectColor(e.target.value);
        });
    }
    
    /**
     * Handle create canvas form submission
     */
    async handleCreateCanvasForm(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const canvasData = {
            name: formData.get('name'),
            description: formData.get('description'),
            width: parseInt(formData.get('width')),
            height: parseInt(formData.get('height'))
        };
        
        // Validate form
        if (!canvasData.name || canvasData.name.length < 3) {
            this.app.getModule('ui').showToast('Canvas name must be at least 3 characters', 'error');
            return;
        }
        
        if (canvasData.width < 10 || canvasData.width > 200) {
            this.app.getModule('ui').showToast('Canvas width must be between 10 and 200', 'error');
            return;
        }
        
        if (canvasData.height < 10 || canvasData.height > 200) {
            this.app.getModule('ui').showToast('Canvas height must be between 10 and 200', 'error');
            return;
        }
        
        // Set form loading state
        this.app.getModule('ui').setFormLoading(form, true, null, 'Creating canvas...');
        
        try {
            const result = await this.app.getModule('canvas').createCanvas(canvasData);
            
            if (result.success) {
                this.app.getModule('navigation').hideModal('create-canvas');
                form.reset();
                this.app.loadCanvases();
            }
            
        } finally {
            this.app.getModule('ui').setFormLoading(form, false);
        }
    }
    
    /**
     * Get the app instance
     */
    getApp() {
        return this.app;
    }
    
    /**
     * Destroy the application
     */
    destroy() {
        if (this.app) {
            this.app.destroy();
        }
        this.initialized = false;
        console.log('✅ StellarCollabApp destroyed');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Create global app instance
    window.stellarApp = new StellarCollabApp();
    
    // Initialize the application
    await window.stellarApp.init();
});

// Export for modules that need access
export default StellarCollabApp; 