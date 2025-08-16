/**
 * Managers Index
 * Central export point for all manager classes
 */

import { CanvasListManager } from './canvas-list-manager.js';
import { CanvasViewerManager } from './canvas-viewer-manager.js';
import { ModalManager } from './modal-manager.js';
import { TileEditorManager } from './tile-editor-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { AuthManager } from './auth-manager.js';
import { AdminPanelManager } from '../admin/admin-panel.js';
import { eventManager } from '../../utils/events.js';

// Export all manager classes
export {
    CanvasListManager,
    CanvasViewerManager,
    ModalManager,
    TileEditorManager,
    WebSocketManager,
    AuthManager,
    AdminPanelManager
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
        canvasViewer: new CanvasViewerManager(window.API.canvas, window.API.tiles, webSocketManager, eventManager),
        modal: new ModalManager(),
        tileEditor: new TileEditorManager(window.API.tiles, eventManager), // FIXED: Added eventManager
        auth: new AuthManager(window.API.auth, eventManager),
        admin: new AdminPanelManager()
    };
    
    // Make managers available globally for debugging
    window.canvasListManager = managers.canvasList;
    window.canvasViewerManager = managers.canvasViewer;
    window.modalManager = managers.modal;
    window.tileEditorManager = managers.tileEditor;
    window.webSocketManager = managers.webSocket;
    window.authManager = managers.auth;
    window.adminPanelManager = managers.admin;
    
    // Make event manager available globally
    window.eventManager = eventManager;
    
    // Don't auto-initialize admin panel - wait for user authentication
    // The admin panel will be initialized when the user navigates to it
    console.log('⚠️ Admin panel not auto-initialized - waiting for authentication');
    
    console.log('✅ All managers created successfully');
    return managers;
}; 