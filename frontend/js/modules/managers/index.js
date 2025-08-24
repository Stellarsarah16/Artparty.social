/**
 * Managers Index
 * Central export point for all manager classes
 */

// Import all manager classes
import { CanvasListManager } from './canvas-list-manager.js';
import { TileEditorManager } from './tile-editor-manager.js';
import IsolatedDebugManager from './isolated-debug-manager.js';
import { CanvasViewportManager } from './canvas-viewport-manager.js';
import { ModalManager } from './modal-manager.js';
import { AuthManager } from './auth-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { eventManager } from '../../utils/events.js';

// Export manager classes
export {
    CanvasListManager,
    ModalManager,
    TileEditorManager,
    IsolatedDebugManager,
    CanvasViewportManager,
    WebSocketManager,
    AuthManager
};

// Create and export manager instances
export const createManagers = () => {
    // Ensure API is available before creating managers
    if (!window.API) {
        console.error('❌ API not available when creating managers');
        throw new Error('API not available when creating managers');
    }
    
    console.log('🔧 Creating managers with API:', {
        canvas: !!window.API.canvas,
        tiles: !!window.API.tiles,
        auth: !!window.API.auth,
        websocket: !!window.API.websocket
    });
    
    // Create managers in dependency order
    // Initialize event manager
    eventManager.init();
    
    const webSocketManager = new WebSocketManager(eventManager);
    
    const managers = {
        webSocket: webSocketManager,
        canvasList: new CanvasListManager(window.API.canvas, window.API.tiles, eventManager),
        modal: new ModalManager(),
        tileEditor: new TileEditorManager(window.API.tiles, eventManager), // FIXED: Added eventManager
        debug: (() => {
            console.log('🔧 Creating IsolatedDebugManager...');
            const debugManager = new IsolatedDebugManager(eventManager);
            console.log('✅ IsolatedDebugManager created:', debugManager);
            return debugManager;
        })(),
        viewport: new CanvasViewportManager(eventManager),
        auth: new AuthManager(window.API.auth, eventManager),
        // Admin panel manager will be created on-demand, not here
        adminPanel: null
    };
    
    // Make managers available globally for debugging
    window.canvasListManager = managers.canvasList;
    window.modalManager = managers.modal;
    window.tileEditorManager = managers.tileEditor;
    window.debugManager = managers.debug;
    window.viewportManager = managers.viewport;
    window.webSocketManager = managers.webSocket;
    window.authManager = managers.auth;
    // Don't set window.adminPanelManager here - it will be set when needed
    
    // Make event manager available globally
    window.eventManager = eventManager;
    
    // Make manager classes available globally for legacy compatibility
    window.CanvasListManager = CanvasListManager;
    window.ModalManager = ModalManager;
    window.TileEditorManager = TileEditorManager;
    window.IsolatedDebugManager = IsolatedDebugManager;
    window.CanvasViewportManager = CanvasViewportManager;
    window.WebSocketManager = WebSocketManager;
    window.AuthManager = AuthManager;
    
    // Add admin panel initialization methods to the managers object
    managers.createAdminPanelManager = async function() {
        if (!this.adminPanel) {
            try {
                // Dynamic import to avoid loading admin panel code unnecessarily
                // FIXED: Correct path to admin panel module
                const { AdminPanelManager } = await import('../admin/admin-panel.js');
                this.adminPanel = new AdminPanelManager();
                // Set it globally when created
                window.adminPanelManager = this.adminPanel;
                console.log('✅ Admin panel manager created on-demand');
            } catch (error) {
                console.warn('⚠️ Could not create admin panel manager:', error);
            }
        }
        return this.adminPanel;
    };
    
    managers.initializeAdminPanel = async function(user) {
        if (user && (user.is_admin || user.is_superuser)) {
            console.log('🔧 User is admin, creating and initializing admin panel...');
            try {
                const adminPanel = await this.createAdminPanelManager();
                if (adminPanel) {
                    adminPanel.init();
                    console.log('✅ Admin panel initialized successfully');
                }
            } catch (error) {
                console.error('❌ Failed to initialize admin panel:', error);
            }
        }
    };
    
    // Don't auto-initialize admin panel - wait for user authentication
    console.log('⚠️ Admin panel not auto-initialized - waiting for authentication');
    
    // Emit navigation manager ready event
    if (window.eventManager) {
        window.eventManager.emit('navigationManagerReady');
        console.log('🧭 Navigation manager ready event emitted');
    }
    
    // Emit DOM ready event if document is already loaded
    if (document.readyState === 'complete') {
        if (window.eventManager) {
            window.eventManager.emit('domReady');
            console.log('🌐 DOM ready event emitted');
        }
    } else {
        // Listen for DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            if (window.eventManager) {
                window.eventManager.emit('domReady');
                console.log('🌐 DOM ready event emitted');
            }
        });
    }
    
    console.log('✅ All managers created and available globally');
    
    return managers;
}; 