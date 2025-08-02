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
    const managers = {
        canvasList: new CanvasListManager(window.API.canvas, window.API.tiles, eventManager),
        canvasViewer: new CanvasViewerManager(window.API.canvas, window.API.websocket, eventManager),
        modal: new ModalManager(),
        tileEditor: new TileEditorManager(window.API.tiles),
        webSocket: new WebSocketManager(eventManager),
        auth: new AuthManager(window.API.auth, eventManager)
    };
    
    // Make managers available globally for debugging
    window.canvasListManager = managers.canvasList;
    window.canvasViewerManager = managers.canvasViewer;
    window.modalManager = managers.modal;
    window.tileEditorManager = managers.tileEditor;
    window.webSocketManager = managers.webSocket;
    window.authManager = managers.auth;
    
    return managers;
}; 