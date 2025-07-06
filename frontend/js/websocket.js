/**
 * WebSocket Client for Real-time Collaboration
 * Handles connection, messaging, and real-time updates
 */

class WebSocketClient {
    constructor() {
        this.socket = null;
        this.canvasId = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = WS_CONFIG.RECONNECT_ATTEMPTS;
        this.reconnectDelay = WS_CONFIG.RECONNECT_DELAY;
        this.heartbeatInterval = null;
        this.messageQueue = [];
        this.eventHandlers = {};
        this.connectionPromise = null;
        
        // Connection state
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
        this.lastPongTime = null;
        this.connectionStartTime = null;
        
        // Statistics
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnectCount: 0,
            totalUptime: 0
        };
        
        // Auto-reconnect flag
        this.shouldReconnect = true;
        
        console.log('📡 WebSocket client initialized');
    }
    
    /**
     * Connect to WebSocket server
     * @param {number} canvasId - Canvas ID to connect to
     * @returns {Promise} Connection promise
     */
    async connect(canvasId) {
        if (this.isConnected && this.canvasId === canvasId) {
            console.log('Already connected to canvas', canvasId);
            return Promise.resolve();
        }
        
        // Disconnect from current canvas if different
        if (this.isConnected && this.canvasId !== canvasId) {
            await this.disconnect();
        }
        
        this.canvasId = canvasId;
        this.connectionState = 'connecting';
        this.connectionStartTime = Date.now();
        
        // Get auth token
        const token = CONFIG_UTILS.getAuthToken();
        if (!token) {
            throw new Error('No authentication token available');
        }
        
        // Create connection promise
        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                const wsUrl = CONFIG_UTILS.getWsUrl(canvasId, token);
                console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
                
                this.socket = new WebSocket(wsUrl);
                
                // Connection opened
                this.socket.onopen = () => {
                    this.handleConnectionOpen();
                    resolve();
                };
                
                // Message received
                this.socket.onmessage = (event) => {
                    this.handleMessage(event);
                };
                
                // Connection closed
                this.socket.onclose = (event) => {
                    this.handleConnectionClose(event);
                };
                
                // Connection error
                this.socket.onerror = (error) => {
                    this.handleConnectionError(error);
                    reject(error);
                };
                
                // Connection timeout
                setTimeout(() => {
                    if (this.connectionState === 'connecting') {
                        this.socket?.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000); // 10 second timeout
                
            } catch (error) {
                console.error('WebSocket connection error:', error);
                reject(error);
            }
        });
        
        return this.connectionPromise;
    }
    
    /**
     * Disconnect from WebSocket server
     * @returns {Promise} Disconnection promise
     */
    async disconnect() {
        this.shouldReconnect = false;
        this.connectionState = 'disconnected';
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Close socket
        if (this.socket) {
            this.socket.close(1000, 'User disconnected');
            this.socket = null;
        }
        
        // Update state
        this.isConnected = false;
        this.canvasId = null;
        this.reconnectAttempts = 0;
        
        // Trigger disconnected event
        this.trigger('disconnected');
        
        console.log('📡 WebSocket disconnected');
    }
    
    /**
     * Send message to server
     * @param {Object} message - Message object
     */
    send(message) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected, queueing message:', message);
            this.messageQueue.push(message);
            return;
        }
        
        try {
            const messageStr = JSON.stringify(message);
            this.socket.send(messageStr);
            this.stats.messagesSent++;
            
            console.log('📤 Sent message:', message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
    
    /**
     * Add event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }
    
    /**
     * Remove event handler
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function to remove
     */
    off(event, handler) {
        if (!this.eventHandlers[event]) return;
        
        const index = this.eventHandlers[event].indexOf(handler);
        if (index > -1) {
            this.eventHandlers[event].splice(index, 1);
        }
    }
    
    /**
     * Trigger event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    trigger(event, data) {
        const handlers = this.eventHandlers[event];
        if (!handlers) return;
        
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
    
    /**
     * Handle connection open
     */
    handleConnectionOpen() {
        console.log('✅ WebSocket connection opened');
        
        this.isConnected = true;
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Send queued messages
        this.processMessageQueue();
        
        // Request canvas state
        this.requestCanvasState();
        
        // Trigger connected event
        this.trigger('connected', {
            canvasId: this.canvasId,
            connectionTime: Date.now() - this.connectionStartTime
        });
        
        // Update UI
        this.updateConnectionStatus('connected');
    }
    
    /**
     * Handle message received
     * @param {MessageEvent} event - WebSocket message event
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.stats.messagesReceived++;
            
            console.log('📥 Received message:', message);
            
            // Handle based on message type
            this.handleMessageByType(message);
            
            // Trigger general message event
            this.trigger('message', message);
            
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
    
    /**
     * Handle message by type
     * @param {Object} message - Parsed message object
     */
    handleMessageByType(message) {
        const type = message.type;
        
        switch (type) {
            case WS_CONFIG.MESSAGE_TYPES.PONG:
                this.handlePong(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.CANVAS_STATE:
                this.handleCanvasState(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.USER_JOINED:
                this.handleUserJoined(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.USER_LEFT:
                this.handleUserLeft(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.TILE_CREATED:
                this.handleTileCreated(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.TILE_UPDATED:
                this.handleTileUpdated(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.TILE_DELETED:
                this.handleTileDeleted(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.TILE_LIKED:
                this.handleTileLiked(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.TILE_UNLIKED:
                this.handleTileUnliked(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.USER_TYPING:
                this.handleUserTyping(message);
                break;
                
            case WS_CONFIG.MESSAGE_TYPES.ADMIN_MESSAGE:
                this.handleAdminMessage(message);
                break;
                
            default:
                console.log('Unknown message type:', type);
        }
        
        // Trigger specific event
        this.trigger(type, message);
    }
    
    /**
     * Handle pong response
     * @param {Object} message - Pong message
     */
    handlePong(message) {
        this.lastPongTime = Date.now();
    }
    
    /**
     * Handle canvas state
     * @param {Object} message - Canvas state message
     */
    handleCanvasState(message) {
        // Update online users in UI
        if (window.CanvasViewer) {
            // Update canvas viewer with online users
        }
        
        // Update UI elements
        this.updateOnlineUsers(message.active_users);
        this.updateUserCount(message.user_count);
        
        console.log(`👥 Canvas state: ${message.user_count} users online`);
    }
    
    /**
     * Handle user joined
     * @param {Object} message - User joined message
     */
    handleUserJoined(message) {
        const username = message.username || 'Anonymous';
        
        // Show notification
        if (window.UIManager) {
            window.UIManager.showToast(`${username} joined the canvas`, 'info', { duration: 2000 });
        }
        
        // Update user count
        this.updateUserCount(message.active_users);
        
        console.log(`👋 User joined: ${username}`);
    }
    
    /**
     * Handle user left
     * @param {Object} message - User left message
     */
    handleUserLeft(message) {
        const username = message.username || 'Anonymous';
        
        // Show notification
        if (window.UIManager) {
            window.UIManager.showToast(`${username} left the canvas`, 'info', { duration: 2000 });
        }
        
        // Update user count
        this.updateUserCount(message.active_users);
        
        console.log(`👋 User left: ${username}`);
    }
    
    /**
     * Handle tile created
     * @param {Object} message - Tile created message
     */
    handleTileCreated(message) {
        const tile = message.tile;
        const creator = message.creator_username || 'Anonymous';
        
        // Add tile to canvas viewer
        if (window.CanvasViewer) {
            window.CanvasViewer.addTile(tile, true);
        }
        
        // Show notification
        if (window.UIManager) {
            window.UIManager.showToast(`${creator} created a new tile`, 'success', { duration: 3000 });
        }
        
        // Play sound effect (if enabled)
        this.playSound('tile_created');
        
        console.log(`🎨 Tile created by ${creator}:`, tile);
    }
    
    /**
     * Handle tile updated
     * @param {Object} message - Tile updated message
     */
    handleTileUpdated(message) {
        const tile = message.tile;
        const updater = message.updater_username || 'Anonymous';
        
        // Update tile in canvas viewer
        if (window.CanvasViewer) {
            window.CanvasViewer.addTile(tile, true);
        }
        
        // Show notification
        if (window.UIManager) {
            window.UIManager.showToast(`${updater} updated a tile`, 'info', { duration: 2000 });
        }
        
        console.log(`✏️ Tile updated by ${updater}:`, tile);
    }
    
    /**
     * Handle tile deleted
     * @param {Object} message - Tile deleted message
     */
    handleTileDeleted(message) {
        const tileId = message.tile_id;
        const deleter = message.deleter_username || 'Anonymous';
        
        // Remove tile from canvas viewer
        if (window.CanvasViewer) {
            window.CanvasViewer.removeTile(tileId, true);
        }
        
        // Show notification
        if (window.UIManager) {
            window.UIManager.showToast(`${deleter} deleted a tile`, 'warning', { duration: 2000 });
        }
        
        console.log(`🗑️ Tile deleted by ${deleter}:`, tileId);
    }
    
    /**
     * Handle tile liked
     * @param {Object} message - Tile liked message
     */
    handleTileLiked(message) {
        const tileId = message.tile_id;
        const liker = message.liker_username || 'Anonymous';
        
        // Update tile like count in UI
        this.updateTileLikes(tileId, message.like);
        
        // Show subtle notification
        console.log(`❤️ Tile ${tileId} liked by ${liker}`);
    }
    
    /**
     * Handle tile unliked
     * @param {Object} message - Tile unliked message
     */
    handleTileUnliked(message) {
        const tileId = message.tile_id;
        const unliker = message.unliker_username || 'Anonymous';
        
        // Update tile like count in UI
        this.updateTileLikes(tileId, { like_count: message.new_like_count });
        
        console.log(`💔 Tile ${tileId} unliked by ${unliker}`);
    }
    
    /**
     * Handle user typing indicator
     * @param {Object} message - User typing message
     */
    handleUserTyping(message) {
        const username = message.username || 'Anonymous';
        const position = message.position;
        
        // Show typing indicator in canvas viewer
        if (window.CanvasViewer && position) {
            this.showTypingIndicator(username, position);
        }
        
        console.log(`⌨️ ${username} is working at (${position.x}, ${position.y})`);
    }
    
    /**
     * Handle admin message
     * @param {Object} message - Admin message
     */
    handleAdminMessage(message) {
        // Show admin notification
        if (window.UIManager) {
            window.UIManager.showToast(
                `Admin: ${message.message}`, 
                'info', 
                { duration: 5000 }
            );
        }
        
        console.log('📢 Admin message:', message.message);
    }
    
    /**
     * Handle connection close
     * @param {CloseEvent} event - Close event
     */
    handleConnectionClose(event) {
        console.log('🔌 WebSocket connection closed:', event);
        
        this.isConnected = false;
        this.connectionState = 'disconnected';
        
        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Trigger disconnected event
        this.trigger('disconnected', { code: event.code, reason: event.reason });
        
        // Update UI
        this.updateConnectionStatus('disconnected');
        
        // Attempt reconnection if should reconnect
        if (this.shouldReconnect && event.code !== 1000) { // 1000 = normal closure
            this.attemptReconnection();
        }
    }
    
    /**
     * Handle connection error
     * @param {Event} error - Error event
     */
    handleConnectionError(error) {
        console.error('❌ WebSocket connection error:', error);
        
        this.connectionState = 'disconnected';
        
        // Trigger error event
        this.trigger('error', error);
        
        // Update UI
        this.updateConnectionStatus('error');
    }
    
    /**
     * Attempt reconnection
     */
    async attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            
            // Show error message
            if (window.UIManager) {
                window.UIManager.showToast(
                    'Connection lost. Please refresh the page.', 
                    'error',
                    { duration: 10000 }
                );
            }
            
            return;
        }
        
        this.reconnectAttempts++;
        this.stats.reconnectCount++;
        this.connectionState = 'reconnecting';
        
        console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        // Update UI
        this.updateConnectionStatus('reconnecting');
        
        // Wait before reconnecting (exponential backoff)
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            await this.connect(this.canvasId);
        } catch (error) {
            console.error('Reconnection failed:', error);
            // Will trigger another reconnection attempt on close
        }
    }
    
    /**
     * Start heartbeat ping
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: WS_CONFIG.MESSAGE_TYPES.PING });
                
                // Check if we missed pongs (connection might be dead)
                if (this.lastPongTime && Date.now() - this.lastPongTime > 60000) {
                    console.warn('No pong received for 60 seconds, connection might be dead');
                    this.socket?.close();
                }
            }
        }, WS_CONFIG.HEARTBEAT_INTERVAL);
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }
    
    /**
     * Request canvas state
     */
    requestCanvasState() {
        this.send({ type: WS_CONFIG.MESSAGE_TYPES.REQUEST_CANVAS_STATE });
    }
    
    /**
     * Send typing indicator
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    sendTypingIndicator(x, y) {
        this.send({
            type: WS_CONFIG.MESSAGE_TYPES.TYPING_INDICATOR,
            position: { x, y }
        });
    }
    
    /**
     * Update connection status in UI
     * @param {string} status - Connection status
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `connection-status ${status}`;
        }
        
        // Update favicon or title to indicate connection status
        this.updatePageIndicators(status);
    }
    
    /**
     * Update online users in UI
     * @param {Array} users - Array of online users
     */
    updateOnlineUsers(users) {
        const usersList = document.getElementById('online-users-list');
        if (!usersList) return;
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-chip';
            userElement.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <span>${user.username}</span>
            `;
            usersList.appendChild(userElement);
        });
    }
    
    /**
     * Update user count in UI
     * @param {number} count - User count
     */
    updateUserCount(count) {
        const countElement = document.getElementById('canvas-users');
        if (countElement) {
            countElement.textContent = `${count} users online`;
        }
    }
    
    /**
     * Update tile likes in UI
     * @param {number} tileId - Tile ID
     * @param {Object} likeData - Like data
     */
    updateTileLikes(tileId, likeData) {
        // Update like count in tile display
        const tileElement = document.querySelector(`[data-tile-id="${tileId}"]`);
        if (tileElement) {
            const likeCountElement = tileElement.querySelector('.like-count');
            if (likeCountElement) {
                likeCountElement.textContent = likeData.like_count || 0;
            }
        }
    }
    
    /**
     * Show typing indicator
     * @param {string} username - Username
     * @param {Object} position - Position object
     */
    showTypingIndicator(username, position) {
        // Implementation depends on canvas viewer
        console.log(`User ${username} typing at`, position);
    }
    
    /**
     * Play sound effect
     * @param {string} soundType - Type of sound
     */
    playSound(soundType) {
        // Check if sounds are enabled in preferences
        const preferences = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.PREFERENCES) || '{}');
        if (!preferences.soundEnabled) return;
        
        // Play sound (implementation depends on available audio files)
        console.log(`🔊 Playing sound: ${soundType}`);
    }
    
    /**
     * Update page indicators
     * @param {string} status - Connection status
     */
    updatePageIndicators(status) {
        // Update document title
        const title = document.title;
        const baseTitle = 'StellarArtCollab';
        
        switch (status) {
            case 'connected':
                document.title = `🟢 ${baseTitle}`;
                break;
            case 'connecting':
            case 'reconnecting':
                document.title = `🟡 ${baseTitle}`;
                break;
            case 'disconnected':
            case 'error':
                document.title = `🔴 ${baseTitle}`;
                break;
        }
    }
    
    /**
     * Get connection statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            connectionState: this.connectionState,
            canvasId: this.canvasId,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
        };
    }
}

// Create global instance
const wsClient = new WebSocketClient();

// Export for use in other modules
window.WebSocketClient = wsClient;

// Integration with main app
if (window.StellarArtCollab) {
    // Add WebSocket methods to main app
    window.StellarArtCollab.connectToCanvas = (canvasId) => wsClient.connect(canvasId);
    window.StellarArtCollab.disconnectFromCanvas = () => wsClient.disconnect();
    window.StellarArtCollab.sendMessage = (message) => wsClient.send(message);
    
    // Set up event handlers for app integration
    wsClient.on('connected', (data) => {
        console.log('✅ WebSocket connected to canvas', data.canvasId);
    });
    
    wsClient.on('disconnected', (data) => {
        console.log('🔌 WebSocket disconnected', data);
    });
}

console.log('✅ WebSocket client loaded'); 