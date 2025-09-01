/**
 * Managers Index
 * Central export point for all manager classes
 */

// Import all manager classes
import { CanvasListManager } from './canvas-list-manager.js';
import { TileEditorManager } from './tile-editor-manager.js';
import IsolatedDebugManager from './isolated-debug-manager.js';
import { CanvasViewportManager } from './canvas-viewport-manager.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { CanvasInteractionManager } from './canvas-interaction-manager.js';
import { ModalManager } from './modal-manager.js';
import { AuthManager } from './auth-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { ChatManager } from './chat-manager.js';
import { PresenceManager } from './presence-manager.js';
import { eventManager } from '../../utils/events.js';

// Export manager classes
export {
    CanvasListManager,
    ModalManager,
    TileEditorManager,
    IsolatedDebugManager,
    CanvasViewportManager,
    CanvasRenderer,
    CanvasInteractionManager,
    WebSocketManager,
    AuthManager,
    ChatManager,
    PresenceManager
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
    
    // Create chat and presence managers with proper dependencies
    const chatManager = new ChatManager({
        apiService: window.API.chat,
        eventManager: eventManager,
        webSocketManager: webSocketManager
    });
    
    const presenceManager = new PresenceManager({
        apiService: window.API.chat,
        eventManager: eventManager,
        webSocketManager: webSocketManager
    });
    
    const managers = {
        webSocket: webSocketManager,
        chat: chatManager,
        presence: presenceManager,
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
        renderer: (() => {
            console.log('🔧 Creating CanvasRenderer...');
            try {
                const renderer = new CanvasRenderer(eventManager);
                console.log('✅ CanvasRenderer created successfully');
                return renderer;
            } catch (error) {
                console.error('❌ Failed to create CanvasRenderer:', error);
                return null;
            }
        })(),
        interaction: (() => {
            console.log('🔧 Creating CanvasInteractionManager...');
            try {
                const interaction = new CanvasInteractionManager(eventManager);
                console.log('✅ CanvasInteractionManager created successfully');
                return interaction;
            } catch (error) {
                console.error('❌ Failed to create CanvasInteractionManager:', error);
                return null;
            }
        })(),
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
    window.rendererManager = managers.renderer;
    window.interactionManager = managers.interaction;
    window.webSocketManager = managers.webSocket;
    window.authManager = managers.auth;
    window.chatManager = managers.chat;
    window.presenceManager = managers.presence;
    // Don't set window.adminPanelManager here - it will be set when needed
    
    // Make event manager available globally
    window.eventManager = eventManager;
    
    // Make manager classes available globally for legacy compatibility
    window.CanvasListManager = CanvasListManager;
    window.ModalManager = ModalManager;
    window.TileEditorManager = TileEditorManager;
    window.IsolatedDebugManager = IsolatedDebugManager;
    window.CanvasViewportManager = CanvasViewportManager;
    window.CanvasRenderer = CanvasRenderer;
    window.CanvasInteractionManager = CanvasInteractionManager;
    window.WebSocketManager = WebSocketManager;
    window.AuthManager = AuthManager;
    window.ChatManager = ChatManager;
    window.PresenceManager = PresenceManager;
    
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
    console.log('🔍 MANAGER STATUS CHECK:');
    console.log('  - Viewport Manager:', !!window.viewportManager);
    console.log('  - Interaction Manager:', !!window.interactionManager); 
    console.log('  - Renderer Manager:', !!window.rendererManager);
    
    // DEBUG: Make viewport clamping test available globally
    window.testViewportClamping = () => {
        if (window.viewportManager && window.viewportManager.testClamping) {
            window.viewportManager.testClamping();
        } else {
            console.error('❌ Viewport manager or testClamping method not available');
        }
    };
    
    // DEBUG: Test manager availability
    window.testManagerDelegation = () => {
        console.log('🧪 TESTING MANAGER DELEGATION');
        console.log('============================');
        console.log('Viewport Manager:', !!window.viewportManager);
        console.log('Interaction Manager:', !!window.interactionManager);
        console.log('Renderer Manager:', !!window.rendererManager);
        
        if (window.interactionManager) {
            console.log('Interaction Manager Methods:', {
                handleMouseDown: typeof window.interactionManager.handleMouseDown,
                handleMouseMove: typeof window.interactionManager.handleMouseMove,
                handleMouseUp: typeof window.interactionManager.handleMouseUp
            });
        }
        
        if (window.viewportManager) {
            console.log('Viewport Manager Methods:', {
                pan: typeof window.viewportManager.pan,
                clampViewport: typeof window.viewportManager.clampViewport,
                setCanvasData: typeof window.viewportManager.setCanvasData
            });
        }
    };
    
    console.log('✅ Debug functions available: testViewportClamping(), testManagerDelegation()');
    
    // CRITICAL: Make a simple test always available
    window.simpleTest = () => {
        console.log('🧪 SIMPLE TEST - This function is working!');
        return 'Function is available';
    };
    
    // DEBUG: Test viewport manager state
    window.testViewportState = () => {
        console.log('🧪 TESTING VIEWPORT STATE');
        console.log('============================');
        try {
            if (window.viewportManager) {
                console.log('✅ Viewport manager exists');
                
                // Test getViewport method
                if (typeof window.viewportManager.getViewport === 'function') {
                    try {
                        const viewport = window.viewportManager.getViewport();
                        console.log('📍 Viewport:', viewport);
                    } catch (viewportError) {
                        console.error('❌ Error calling getViewport:', viewportError);
                    }
                } else {
                    console.error('❌ getViewport method not found');
                }
                
                // Check canvas element
                console.log('🖼️ Canvas element:', window.viewportManager.canvas);
                
                // Check canvas data
                console.log('📊 Canvas data:', window.viewportManager.canvasData);
                
                // Check properties directly
                console.log('🔍 Direct properties:', {
                    viewportX: window.viewportManager.viewportX,
                    viewportY: window.viewportManager.viewportY,
                    zoom: window.viewportManager.zoom
                });
                
            } else {
                console.error('❌ Viewport manager not available');
            }
        } catch (error) {
            console.error('❌ Error testing viewport state:', error);
        }
    };
    
    return managers;
}; 