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
import { eventManager } from '../../utils/events.js';

// Export all manager classes
export {
    CanvasListManager,
    CanvasViewerManager,
    ModalManager,
    TileEditorManager,
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
    
    const managers = {
        webSocket: new WebSocketManager(eventManager),
        canvasList: new CanvasListManager(window.API.canvas, window.API.tiles, eventManager),
        canvasViewer: new CanvasViewerManager(window.API.canvas, window.API.tiles, managers.webSocket, eventManager),
        modal: new ModalManager(),
        tileEditor: new TileEditorManager(window.API.tiles),
        auth: new AuthManager(window.API.auth, eventManager)
    };
    
    // Make managers available globally for debugging
    window.canvasListManager = managers.canvasList;
    window.canvasViewerManager = managers.canvasViewer;
    window.modalManager = managers.modal;
    window.tileEditorManager = managers.tileEditor;
    window.webSocketManager = managers.webSocket;
    window.authManager = managers.auth;
    
    console.log('✅ All managers created successfully');
    return managers;
}; 