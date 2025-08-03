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
     * Send message to WebSocket
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