/**
 * Canvas Viewer Manager
 * Handles canvas viewing, WebSocket connections, and canvas statistics
 */

import appState from '../app-state.js';

export class CanvasViewerManager {
    constructor(apiService, webSocketService, eventManager) {
        this.apiService = apiService;
        this.webSocketService = webSocketService;
        this.eventManager = eventManager;
        this.currentCanvas = null;
        this.webSocket = null;
    }

    /**
     * Open a canvas for viewing
     */
    async openCanvas(canvas) {
        try {
            console.log('🔄 Opening canvas:', canvas.id);
            
            // Show loading
            this.showLoading();
            
            // Get full canvas data
            const canvasData = await this.apiService.get(canvas.id);
            
            // Initialize viewer
            await this.initializeCanvasViewer(canvas, canvasData);
            
            // Show viewer section
            this.showSection('viewer');
            
            // Connect WebSocket
            await this.connectWebSocket(canvas.id);
            
            console.log('✅ Canvas opened successfully');
            
        } catch (error) {
            console.error('❌ Failed to open canvas:', error);
            this.showCanvasError('Failed to open canvas');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Initialize canvas viewer with data
     */
    async initializeCanvasViewer(canvas, canvasData) {
        this.currentCanvas = canvas;
        
        // Update canvas info
        const canvasTitle = document.getElementById('viewer-canvas-title');
        if (canvasTitle) {
            canvasTitle.textContent = canvas.name;
        }
        
        const canvasDimensions = document.getElementById('viewer-canvas-dimensions');
        if (canvasDimensions) {
            canvasDimensions.textContent = `${canvas.width}x${canvas.height}`;
        }
        
        // Update canvas stats
        await this.updateCanvasStats(canvas);
        
        // Initialize canvas viewer component
        if (window.CanvasViewer) {
            const canvasElement = document.getElementById('canvas-viewer');
            if (canvasElement) {
                window.CanvasViewer.init(canvasElement);
                window.CanvasViewer.setCanvasData(canvasData);
                console.log('✅ Canvas viewer initialized with canvas element');
            } else {
                console.error('❌ Canvas viewer element not found');
            }
        } else {
            console.error('❌ CanvasViewer not available');
        }
        
        // Setup viewer controls
        this.setupViewerControls();
    }

    /**
     * Update canvas statistics display
     */
    async updateCanvasStats(canvas) {
        try {
            // Update total tiles
            const totalTiles = document.getElementById('viewer-total-tiles');
            if (totalTiles) {
                totalTiles.textContent = canvas.total_tiles || canvas.tile_count || 0;
            }
            
            // Update active users
            const activeUsers = document.getElementById('viewer-active-users');
            if (activeUsers) {
                activeUsers.textContent = Math.max(1, canvas.user_count || 0);
            }
            
            // Update user's tile count
            const userTiles = document.getElementById('viewer-user-tiles');
            if (userTiles) {
                const currentUser = appState.get('currentUser');
                if (currentUser && currentUser.id) {
                    const tileCount = await this.apiService.getUserTileCount(currentUser.id, canvas.id);
                    userTiles.textContent = tileCount.tile_count.toString();
                } else {
                    userTiles.textContent = '0';
                }
            }
        } catch (error) {
            console.error('Failed to update canvas stats:', error);
        }
    }

    /**
     * Connect WebSocket for real-time updates
     */
    async connectWebSocket(canvasId) {
        try {
            if (this.webSocket) {
                this.webSocket.close();
            }
            
            this.webSocket = await this.webSocketService.connect(canvasId);
            this.setupWebSocketHandlers();
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.showWebSocketError();
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        if (!this.webSocket) return;
        
        this.webSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.webSocket.onclose = () => {
            console.log('WebSocket connection closed');
        };
        
        this.webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'user_count_update':
                this.updateUserCountFromWebSocket(data.user_count, data.active_users);
                break;
            case 'tile_update':
                this.handleTileUpdate(data.tile);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    /**
     * Update user count from WebSocket
     */
    updateUserCountFromWebSocket(userCount, activeUsers = null) {
        const activeUsersElement = document.getElementById('viewer-active-users');
        if (activeUsersElement) {
            activeUsersElement.textContent = userCount || 1;
        }
        
        // Update online users list
        const usersList = document.getElementById('viewer-users-list');
        if (usersList && activeUsers) {
            usersList.innerHTML = activeUsers.map(user => `
                <div class="user-item">
                    <i class="fas fa-circle online"></i>
                    <span>${user.username}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Handle tile updates from WebSocket
     */
    handleTileUpdate(tile) {
        if (window.CanvasViewer) {
            window.CanvasViewer.updateTile(tile);
        }
    }

    /**
     * Setup viewer controls
     */
    setupViewerControls() {
        // Add any viewer-specific controls here
        const settingsBtn = document.getElementById('viewer-settings-btn');
        if (settingsBtn && this.currentCanvas) {
            settingsBtn.onclick = () => {
                if (window.modalManager) {
                    window.modalManager.showCanvasSettingsModal(this.currentCanvas.id);
                }
            };
        }
    }

    /**
     * Show WebSocket error
     */
    showWebSocketError() {
        if (window.UIManager) {
            window.UIManager.showToast('Connection lost. Trying to reconnect...', 'warning');
        }
    }

    /**
     * Show canvas error
     */
    showCanvasError(message) {
        if (window.UIManager) {
            window.UIManager.showToast(message, 'error');
        }
    }

    /**
     * Show loading
     */
    showLoading() {
        if (window.UIManager) {
            window.UIManager.updateLoadingState(true, 'Loading canvas...');
        }
    }

    /**
     * Hide loading
     */
    hideLoading() {
        if (window.UIManager) {
            window.UIManager.updateLoadingState(false);
        }
    }

    /**
     * Show section
     */
    showSection(sectionName) {
        if (window.navigationManager) {
            window.navigationManager.showSection(sectionName);
        }
    }
} 