/**
 * WebSocket Manager
 * Handles WebSocket connections and real-time communication
 */

export class WebSocketManager {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.connections = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Connect to WebSocket for a canvas
     */
    async connect(canvasId) {
        try {
            const token = window.CONFIG_UTILS.getAuthToken();
            const wsUrl = window.CONFIG_UTILS.getWsUrl(canvasId, token);
            console.log('🔌 Connecting to WebSocket:', wsUrl);
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log(`✅ WebSocket connected for canvas ${canvasId}`);
                this.reconnectAttempts = 0;
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', data);
                    
                    // Emit to event manager for other components to handle
                    this.eventManager.emit('websocketMessage', data);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                }
            };
            
            ws.onclose = () => {
                console.log(`WebSocket disconnected for canvas ${canvasId}`);
                this.handleDisconnect(canvasId);
            };
            
            ws.onerror = (error) => {
                console.error(`WebSocket error for canvas ${canvasId}:`, error);
            };
            
            this.connections.set(canvasId, ws);
            return ws;
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            throw error;
        }
    }

    /**
     * Handle WebSocket disconnection
     */
    handleDisconnect(canvasId) {
        this.connections.delete(canvasId);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect(canvasId);
            }, 1000 * this.reconnectAttempts); // Exponential backoff
        } else {
            console.error('Max WebSocket reconnection attempts reached');
            
            // Check if this is an authentication issue
            const token = window.CONFIG_UTILS.getAuthToken();
            if (!token) {
                // No token - redirect to login
                if (window.authManager) {
                    window.authManager.handleAuthFailure('Connection lost - please log in again');
                }
            } else {
                // Has token but connection failed - show generic message
                if (window.UIManager) {
                    window.UIManager.showToast('Connection lost. Please refresh the page.', 'error');
                }
            }
        }
    }

    /**
     * Check if WebSocket is connected for any canvas
     */
    isConnected(canvasId = null) {
        if (canvasId) {
            const ws = this.connections.get(canvasId);
            return ws && ws.readyState === WebSocket.OPEN;
        } else {
            // Check if any connection is open
            for (const [id, ws] of this.connections) {
                if (ws.readyState === WebSocket.OPEN) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Send message to WebSocket (alias for send method)
     */
    sendMessage(message, canvasId = null) {
        // If no canvasId provided, try to get current canvas
        if (!canvasId) {
            canvasId = window.appState?.get('currentCanvas')?.id;
        }
        
        if (canvasId) {
            this.send(canvasId, message);
        } else {
            console.warn('No canvas ID available for WebSocket message');
        }
    }

    /**
     * Send message to WebSocket for specific canvas
     */
    send(canvasId, message) {
        const ws = this.connections.get(canvasId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected for canvas:', canvasId);
        }
    }

    /**
     * Close WebSocket connection
     */
    close(canvasId) {
        const ws = this.connections.get(canvasId);
        if (ws) {
            ws.close();
            this.connections.delete(canvasId);
        }
    }

    /**
     * Close all WebSocket connections
     */
    closeAll() {
        this.connections.forEach((ws, canvasId) => {
            ws.close();
        });
        this.connections.clear();
    }
} 