/**
 * Presence Manager
 * Handles user presence tracking and tile editing status
 * Follows the Manager Pattern for StellarCollabApp
 */

export class PresenceManager {
    constructor(dependencies) {
        // Store dependencies
        this.apiService = dependencies.apiService;
        this.eventManager = dependencies.eventManager;
        this.webSocketManager = dependencies.webSocketManager;
        
        // State management
        this.currentPresence = null;
        this.canvasUsers = new Map(); // canvas_id -> user presence array
        this.userTileEditing = new Map(); // user_id -> {tileX, tileY, timestamp}
        this.presenceUpdateQueue = new Set(); // Queued presence updates
        this.isInitialized = false;
        
        // Presence tracking settings
        this.presenceUpdateInterval = 30000; // Update every 30 seconds
        this.presenceTimer = null;
        this.editingTimeout = 10000; // Consider editing stopped after 10 seconds
        this.editingTimers = new Map(); // user_id -> timeout
        
        console.log('👥 PresenceManager initialized');
    }

    // ========================================================================
    // LIFECYCLE MANAGEMENT
    // ========================================================================

    async initialize() {
        // Initialize the presence manager
        if (this.isInitialized) {
            console.warn('👥 PresenceManager already initialized');
            return;
        }

        try {
            console.log('👥 Initializing PresenceManager...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start presence update timer
            this.startPresenceTimer();
            
            this.isInitialized = true;
            console.log('✅ PresenceManager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize PresenceManager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Set up event listeners
        // Canvas events
        this.eventManager.on('canvasChanged', (canvasData) => this.handleCanvasChange(canvasData));
        this.eventManager.on('tileEditingStarted', (data) => this.handleTileEditingStarted(data));
        this.eventManager.on('tileEditingStopped', (data) => this.handleTileEditingStopped(data));
        
        // User events
        this.eventManager.on('userAuthenticated', (userData) => this.handleUserAuthenticated(userData));
        this.eventManager.on('userLoggedOut', () => this.handleUserLoggedOut());
        
        // WebSocket events
        this.eventManager.on('websocketMessage', (data) => this.handleWebSocketMessage(data));
        
        // Browser events
        window.addEventListener('beforeunload', () => this.handlePageUnload());
        window.addEventListener('focus', () => this.handleWindowFocus());
        window.addEventListener('blur', () => this.handleWindowBlur());
        
        // Activity detection
        this.setupActivityDetection();
    }

    setupActivityDetection() {
        // Set up user activity detection
        let activityTimeout = null;
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const updateActivity = () => {
            this.updateUserActivity();
            
            // Reset activity timeout
            if (activityTimeout) {
                clearTimeout(activityTimeout);
            }
            
            // Set user as away after 5 minutes of inactivity
            activityTimeout = setTimeout(() => {
                this.updatePresenceStatus('away');
            }, 300000); // 5 minutes
        };
        
        // Attach activity listeners
        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
    }

    cleanup() {
        // Clean up resources and timers
        console.log('👥 Cleaning up PresenceManager...');
        
        // Clear timers
        if (this.presenceTimer) {
            clearInterval(this.presenceTimer);
            this.presenceTimer = null;
        }
        
        this.editingTimers.forEach(timer => clearTimeout(timer));
        this.editingTimers.clear();
        
        // Clear state
        this.currentPresence = null;
        this.canvasUsers.clear();
        this.userTileEditing.clear();
        this.presenceUpdateQueue.clear();
        
        // Set user as offline before cleanup
        this.updatePresenceStatus('offline');
        
        // Remove event listeners
        this.eventManager.off('canvasChanged', this.handleCanvasChange);
        this.eventManager.off('tileEditingStarted', this.handleTileEditingStarted);
        this.eventManager.off('tileEditingStopped', this.handleTileEditingStopped);
        this.eventManager.off('userAuthenticated', this.handleUserAuthenticated);
        this.eventManager.off('userLoggedOut', this.handleUserLoggedOut);
        this.eventManager.off('websocketMessage', this.handleWebSocketMessage);
        
        this.isInitialized = false;
        console.log('✅ PresenceManager cleaned up');
    }

    // ========================================================================
    // PRESENCE MANAGEMENT
    // ========================================================================

    async updatePresenceStatus(status = 'online', canvasId = null) {
        // Update user presence status
        try {
            const presenceData = {
                status: status,
                canvas_id: canvasId,
                current_tile_x: null,
                current_tile_y: null,
                is_editing_tile: false
            };
            
            // Include current editing tile if user is editing
            const currentUser = window.appState.get('currentUser');
            if (currentUser && this.userTileEditing.has(currentUser.id)) {
                const editingData = this.userTileEditing.get(currentUser.id);
                presenceData.current_tile_x = editingData.tileX;
                presenceData.current_tile_y = editingData.tileY;
                presenceData.is_editing_tile = true;
            }
            
            console.log('👥 Updating presence status:', presenceData);
            
            // Send via WebSocket if available
            if (this.webSocketManager && this.webSocketManager.isConnected() && this.currentCanvasId) {
                this.webSocketManager.send(this.currentCanvasId, {
                    type: 'user_presence',
                    presence_type: 'status_change',
                    ...presenceData
                });
            }
            
            // Also update via API for persistence
            const response = await this.apiService.updatePresence(presenceData);
            
            if (response) {
                this.currentPresence = response;
                console.log('✅ Presence updated successfully');
                
                // Emit event
                this.eventManager.emit('presenceUpdated', {
                    userId: currentUser?.id,
                    status: status,
                    canvasId: canvasId
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to update presence:', error);
        }
    }

    async updateTileEditing(tileX, tileY, isEditing = true, canvasId = null) {
        // Update tile editing status
        try {
            const currentUser = window.appState.get('currentUser');
            if (!currentUser) {
                return;
            }
            
            console.log(`👥 User ${isEditing ? 'started' : 'stopped'} editing tile ${tileX},${tileY}`);
            
            if (isEditing) {
                // Track editing start
                this.userTileEditing.set(currentUser.id, {
                    tileX: tileX,
                    tileY: tileY,
                    timestamp: Date.now()
                });
                
                // Set timeout to auto-stop editing if no updates
                if (this.editingTimers.has(currentUser.id)) {
                    clearTimeout(this.editingTimers.get(currentUser.id));
                }
                
                const editingTimer = setTimeout(() => {
                    console.log('👥 Auto-stopping tile editing due to timeout');
                    this.updateTileEditing(tileX, tileY, false, canvasId);
                }, this.editingTimeout);
                
                this.editingTimers.set(currentUser.id, editingTimer);
                
            } else {
                // Stop editing
                this.userTileEditing.delete(currentUser.id);
                
                if (this.editingTimers.has(currentUser.id)) {
                    clearTimeout(this.editingTimers.get(currentUser.id));
                    this.editingTimers.delete(currentUser.id);
                }
            }
            
            // Send presence update via WebSocket
            if (this.webSocketManager && this.webSocketManager.isConnected() && this.currentCanvasId) {
                this.webSocketManager.send(this.currentCanvasId, {
                    type: 'user_presence',
                    presence_type: 'editing_tile',
                    tile_x: isEditing ? tileX : null,
                    tile_y: isEditing ? tileY : null,
                    is_editing: isEditing
                });
            }
            
            // Emit event for UI updates
            this.eventManager.emit('userTileEditingChanged', {
                userId: currentUser.id,
                username: currentUser.username,
                tileX: tileX,
                tileY: tileY,
                isEditing: isEditing
            });
            
        } catch (error) {
            console.error('❌ Failed to update tile editing status:', error);
        }
    }

    updateUserActivity() {
        // Update user activity timestamp
        if (this.currentPresence && this.currentPresence.status === 'away') {
            // User became active again
            this.updatePresenceStatus('online', this.currentPresence.canvas_id);
        }
    }

    startPresenceTimer() {
        // Start periodic presence updates
        this.presenceTimer = setInterval(() => {
            this.sendPeriodicPresenceUpdate();
        }, this.presenceUpdateInterval);
        
        console.log('👥 Started presence update timer');
    }

    async sendPeriodicPresenceUpdate() {
        // Send periodic presence update to keep session alive
        if (!this.currentPresence) {
            return;
        }
        
        try {
            // Send heartbeat via WebSocket
            if (this.webSocketManager && this.webSocketManager.isConnected() && this.currentCanvasId) {
                this.webSocketManager.send(this.currentCanvasId, {
                    type: 'user_presence',
                    presence_type: 'heartbeat',
                    status: this.currentPresence.status
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to send presence heartbeat:', error);
        }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    async handleCanvasChange(canvasData) {
        // Handle canvas change event
        console.log('👥 Canvas changed, updating presence:', canvasData);
        
        if (canvasData && canvasData.id) {
            this.currentCanvasId = canvasData.id; // Store current canvas ID
            await this.updatePresenceStatus('online', canvasData.id);
            await this.loadCanvasUsers(canvasData.id);
        } else {
            this.currentCanvasId = null;
            await this.updatePresenceStatus('offline');
            this.canvasUsers.clear();
        }
    }

    handleUserAuthenticated(userData) {
        // Handle user authentication
        console.log('👥 User authenticated, initializing presence:', userData);
        this.updatePresenceStatus('online');
    }

    handleUserLoggedOut() {
        // Handle user logout
        console.log('👥 User logged out, cleaning up presence');
        this.cleanup();
    }

    handleTileEditingStarted(data) {
        // Handle when user starts editing a tile
        console.log('👥 Tile editing started:', data);
        this.updateTileEditing(data.tileX, data.tileY, true, data.canvasId);
    }

    handleTileEditingStopped(data) {
        // Handle when user stops editing a tile
        console.log('👥 Tile editing stopped:', data);
        this.updateTileEditing(data.tileX, data.tileY, false, data.canvasId);
    }

    handleWebSocketMessage(data) {
        // Handle WebSocket messages related to presence
        const { type } = data;
        
        switch (type) {
            case 'user_presence_update':
                this.handlePresenceUpdate(data);
                break;
            case 'user_joined':
            case 'user_left':
                this.handleUserJoinLeave(data);
                break;
            default:
                // Not a presence-related message
                break;
        }
    }

    handlePresenceUpdate(data) {
        // Handle user presence update from WebSocket
        console.log('👥 Received presence update:', data);
        
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return;
        }
        
        // Update user in canvas users list
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        const userIndex = canvasUsers.findIndex(u => u.user_id === data.user_id);
        
        if (userIndex >= 0) {
            // Update existing user
            canvasUsers[userIndex] = {
                ...canvasUsers[userIndex],
                current_tile_x: data.tile_x,
                current_tile_y: data.tile_y,
                is_editing_tile: data.is_editing,
                last_activity: new Date().toISOString()
            };
        } else {
            // Add new user
            canvasUsers.push({
                user_id: data.user_id,
                username: data.username,
                display_name: data.display_name,
                status: 'online',
                current_tile_x: data.tile_x,
                current_tile_y: data.tile_y,
                is_editing_tile: data.is_editing,
                last_activity: new Date().toISOString()
            });
        }
        
        this.canvasUsers.set(this.currentPresence.canvas_id, canvasUsers);
        
        // Update UI overlays for tile editing
        this.updateTileEditingOverlays();
        
        // Emit event for other components
        this.eventManager.emit('userPresenceChanged', {
            userId: data.user_id,
            username: data.username,
            tileX: data.tile_x,
            tileY: data.tile_y,
            isEditing: data.is_editing
        });
    }

    handleUserJoinLeave(data) {
        // Handle user join/leave events
        console.log('👥 User join/leave event:', data);
        
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return;
        }
        
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        
        if (data.type === 'user_joined') {
            // Add user if not already present
            const userExists = canvasUsers.some(u => u.user_id === data.user_id);
            if (!userExists) {
                canvasUsers.push({
                    user_id: data.user_id,
                    username: data.username,
                    display_name: data.display_name,
                    status: 'online',
                    current_tile_x: null,
                    current_tile_y: null,
                    is_editing_tile: false,
                    last_activity: new Date().toISOString()
                });
            }
        } else if (data.type === 'user_left') {
            // Remove user
            const userIndex = canvasUsers.findIndex(u => u.user_id === data.user_id);
            if (userIndex >= 0) {
                canvasUsers.splice(userIndex, 1);
            }
        }
        
        this.canvasUsers.set(this.currentPresence.canvas_id, canvasUsers);
        this.updateTileEditingOverlays();
    }

    handleWindowFocus() {
        // Handle window focus event
        console.log('👥 Window focused, updating presence to online');
        if (this.currentPresence) {
            this.updatePresenceStatus('online', this.currentPresence.canvas_id);
        }
    }

    handleWindowBlur() {
        // Handle window blur event
        console.log('👥 Window blurred, updating presence to away');
        if (this.currentPresence) {
            this.updatePresenceStatus('away', this.currentPresence.canvas_id);
        }
    }

    handlePageUnload() {
        // Handle page unload event
        console.log('👥 Page unloading, setting presence offline');
        this.updatePresenceStatus('offline');
    }

    // ========================================================================
    // CANVAS USER MANAGEMENT
    // ========================================================================

    async loadCanvasUsers(canvasId) {
        // Load active users for a canvas
        try {
            console.log(`👥 Loading active users for canvas ${canvasId}...`);
            
            const response = await this.apiService.getCanvasUsers(canvasId);
            
            if (response) {
                this.canvasUsers.set(canvasId, Array.isArray(response) ? response : []);
                this.updateTileEditingOverlays();
                
                const users = Array.isArray(response) ? response : [];
                console.log(`✅ Loaded ${users.length} active users for canvas ${canvasId}`);
                
                // Emit event
                this.eventManager.emit('canvasUsersLoaded', {
                    canvasId: canvasId,
                    users: users
                });
                
            } else {
                throw new Error(response.error || 'Failed to load canvas users');
            }
            
        } catch (error) {
            console.error('❌ Failed to load canvas users:', error);
        }
    }

    updateTileEditingOverlays() {
        // Update tile editing visual overlays
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return;
        }
        
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        const editingUsers = canvasUsers.filter(user => user.is_editing_tile);
        
        // Emit event for canvas viewer to update overlays
        this.eventManager.emit('updateTileEditingOverlays', {
            editingUsers: editingUsers.map(user => ({
                userId: user.user_id,
                username: user.username,
                tileX: user.current_tile_x,
                tileY: user.current_tile_y
            }))
        });
        
        console.log(`👥 Updated tile editing overlays for ${editingUsers.length} users`);
    }

    // ========================================================================
    // TILE EDITING TRACKING
    // ========================================================================

    startTileEditing(tileX, tileY, canvasId) {
        // Start tracking tile editing for current user
        const currentUser = window.appState.get('currentUser');
        if (!currentUser) {
            return;
        }
        
        console.log(`👥 Starting tile editing tracking: ${tileX},${tileY}`);
        
        // Update local tracking
        this.userTileEditing.set(currentUser.id, {
            tileX: tileX,
            tileY: tileY,
            timestamp: Date.now()
        });
        
        // Update presence
        this.updateTileEditing(tileX, tileY, true, canvasId);
        
        // Emit event
        this.eventManager.emit('tileEditingStarted', {
            userId: currentUser.id,
            username: currentUser.username,
            tileX: tileX,
            tileY: tileY,
            canvasId: canvasId
        });
    }

    stopTileEditing(tileX, tileY, canvasId) {
        // Stop tracking tile editing for current user
        const currentUser = window.appState.get('currentUser');
        if (!currentUser) {
            return;
        }
        
        console.log(`👥 Stopping tile editing tracking: ${tileX},${tileY}`);
        
        // Clear local tracking
        this.userTileEditing.delete(currentUser.id);
        
        // Clear timer
        if (this.editingTimers.has(currentUser.id)) {
            clearTimeout(this.editingTimers.get(currentUser.id));
            this.editingTimers.delete(currentUser.id);
        }
        
        // Update presence
        this.updateTileEditing(tileX, tileY, false, canvasId);
        
        // Emit event
        this.eventManager.emit('tileEditingStopped', {
            userId: currentUser.id,
            username: currentUser.username,
            tileX: tileX,
            tileY: tileY,
            canvasId: canvasId
        });
    }

    async updateTileEditing(tileX, tileY, isEditing, canvasId) {
        // Update tile editing presence
        try {
            const presenceData = {
                status: 'online',
                canvas_id: canvasId,
                current_tile_x: isEditing ? tileX : null,
                current_tile_y: isEditing ? tileY : null,
                is_editing_tile: isEditing
            };
            
            // Send via WebSocket for real-time updates
            if (this.webSocketManager && this.webSocketManager.isConnected() && this.currentCanvasId) {
                this.webSocketManager.send(this.currentCanvasId, {
                    type: 'user_presence',
                    presence_type: 'editing_tile',
                    tile_x: tileX,
                    tile_y: tileY,
                    is_editing: isEditing
                });
            }
            
            // Update via API for persistence
            const response = await this.apiService.updatePresence(presenceData);
            
            if (response) {
                this.currentPresence = response;
                console.log(`✅ Tile editing ${isEditing ? 'started' : 'stopped'} for tile ${tileX},${tileY}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to update tile editing presence:', error);
        }
    }

    // ========================================================================
    // PUBLIC API METHODS
    // ========================================================================

    getCanvasUsers(canvasId) {
        // Get active users for a canvas
        return this.canvasUsers.get(canvasId) || [];
    }

    getCurrentPresence() {
        // Get current user presence
        return this.currentPresence;
    }

    isUserEditingTile(userId, tileX, tileY) {
        // Check if a user is editing a specific tile
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return false;
        }
        
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        const user = canvasUsers.find(u => u.user_id === userId);
        
        return user && 
               user.is_editing_tile && 
               user.current_tile_x === tileX && 
               user.current_tile_y === tileY;
    }

    getUsersEditingTiles() {
        // Get all users currently editing tiles
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return [];
        }
        
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        return canvasUsers.filter(user => user.is_editing_tile);
    }

    getTileEditor(tileX, tileY) {
        // Get user currently editing a specific tile
        if (!this.currentPresence || !this.currentPresence.canvas_id) {
            return null;
        }
        
        const canvasUsers = this.canvasUsers.get(this.currentPresence.canvas_id) || [];
        return canvasUsers.find(user => 
            user.is_editing_tile && 
            user.current_tile_x === tileX && 
            user.current_tile_y === tileY
        );
    }

    // ========================================================================
    // INTEGRATION METHODS
    // ========================================================================

    notifyTileClicked(tileX, tileY, canvasId) {
        // Notify that user clicked on a tile (for presence tracking)
        // Don't start editing tracking immediately on click
        // Wait for actual editing to begin
        console.log(`👥 Tile clicked: ${tileX},${tileY}`);
    }

    notifyTileEditorOpened(tileX, tileY, canvasId) {
        // Notify that tile editor was opened
        this.startTileEditing(tileX, tileY, canvasId);
    }

    notifyTileEditorClosed(tileX, tileY, canvasId) {
        // Notify that tile editor was closed
        this.stopTileEditing(tileX, tileY, canvasId);
    }

    notifyTileSaved(tileX, tileY, canvasId) {
        // Notify that tile was saved
        // Keep editing status but refresh timestamp
        const currentUser = window.appState.get('currentUser');
        if (currentUser && this.userTileEditing.has(currentUser.id)) {
            const editingData = this.userTileEditing.get(currentUser.id);
            editingData.timestamp = Date.now();
        }
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    formatUserStatus(status) {
        // Format user status for display
        const statusMap = {
            'online': '🟢 Online',
            'away': '🟡 Away',
            'offline': '⚫ Offline'
        };
        
        return statusMap[status] || status;
    }

    calculateUserActivityTime(lastActivity) {
        // Calculate time since last user activity
        const now = new Date();
        const activityTime = new Date(lastActivity);
        const diffMinutes = Math.floor((now - activityTime) / (1000 * 60));
        
        if (diffMinutes < 1) {
            return 'just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else {
            const diffHours = Math.floor(diffMinutes / 60);
            return `${diffHours}h ago`;
        }
    }

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    handleError(error, context = '') {
        // Handle and log errors
        console.error(`👥 PresenceManager error ${context}:`, error);
        
        // Emit error event
        this.eventManager.emit('presenceError', {
            error: error.message || error,
            context: context,
            timestamp: new Date().toISOString()
        });
    }
}

// ========================================================================
// EXPORT AND GLOBAL REGISTRATION
// ========================================================================

// Export for module usage
export default PresenceManager;

// Global registration for legacy compatibility
if (typeof window !== 'undefined') {
    window.PresenceManager = PresenceManager;
}
