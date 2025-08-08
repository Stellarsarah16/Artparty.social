/**
 * Canvas Viewer Manager
 * Handles canvas viewing, WebSocket connections, and canvas statistics
 */

import appState from '../app-state.js';

export class CanvasViewerManager {
    constructor(canvasApi, tileApi, webSocketManager, eventManager) {
        this.canvasApi = canvasApi;
        this.tileApi = tileApi;
        this.webSocketManager = webSocketManager;
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
            const canvasData = await this.canvasApi.get(canvas.id);
            
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
        
        // Add palette type and description to the header
        this.updateCanvasHeaderInfo(canvasData);
        
        // Update canvas stats
        await this.updateCanvasStats(canvas);
        
        // Initialize canvas viewer component
        if (window.CanvasViewer) {
            const canvasElement = document.getElementById('canvas-viewer');
            if (canvasElement) {
                window.CanvasViewer.init(canvasElement);
                window.CanvasViewer.setCanvasData(canvasData);
                
                // Set up tile click handler
                window.CanvasViewer.onTileClick = (tile) => {
                    console.log('🎯 Tile clicked, opening editor:', tile);
                    this.openTileEditor(tile);
                };
                
                // Clear any existing tiles first
                window.CanvasViewer.clearAllTiles();
                
                // Load tiles for this canvas
                try {
                    const tiles = await this.tileApi.getForCanvas(canvas.id);
                    if (tiles && Array.isArray(tiles)) {
                        window.CanvasViewer.loadTiles(tiles);
                        console.log(`✅ Loaded ${tiles.length} tiles for canvas`);
                    } else {
                        console.log('✅ No tiles found for canvas');
                    }
                } catch (error) {
                    console.error('❌ Failed to load tiles:', error);
                }
                
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
            console.log('📊 Updating canvas stats for canvas:', canvas.id);
            
            // Get current user
            const currentUser = appState.get('currentUser');
            if (!currentUser) {
                console.warn('⚠️ No current user found for stats update');
                return;
            }
            
            // Get user's tile count for this canvas
            const userTileCount = await this.tileApi.getUserTileCount(currentUser.id, canvas.id);
            console.log(' User tile count:', userTileCount);
            
            // Get total tiles for this canvas
            const allTiles = await this.tileApi.getForCanvas(canvas.id);
            const totalTiles = allTiles.length;
            console.log('📊 Total tiles:', totalTiles);
            
            // FIXED: Update stats display in the designed canvas-stats-bar elements
            console.log('📊 Updating canvas stats bar elements...');
            
            // Update Total Tiles
            const totalTilesElement = document.getElementById('viewer-total-tiles');
            if (totalTilesElement) {
                totalTilesElement.textContent = totalTiles;
                console.log('✅ Updated total tiles:', totalTiles);
            }
            
            // Update User Tiles
            const userTilesElement = document.getElementById('viewer-user-tiles');
            if (userTilesElement) {
                // FIXED: Handle different response formats from getUserTileCount
                const userCount = userTileCount.tile_count || userTileCount.count || 0;
                userTilesElement.textContent = userCount;
                console.log('✅ Updated user tiles:', userCount, 'from response:', userTileCount);
            }
            
            // Update Active Users (will be updated by WebSocket)
            const activeUsersElement = document.getElementById('viewer-active-users');
            if (activeUsersElement) {
                activeUsersElement.textContent = '1'; // At least current user is active
                console.log('✅ Updated active users: 1');
            }
            
            // Remove any old floating stats container if it exists
            const oldStatsContainer = document.querySelector('.canvas-stats');
            if (oldStatsContainer) {
                oldStatsContainer.remove();
                console.log('🧹 Removed old floating stats container');
            }
            
        } catch (error) {
            console.error('❌ Failed to update canvas stats:', error);
        }
    }

    /**
     * FIXED: Refresh canvas display to show new tiles
     */
    async refreshCanvasDisplay() {
        try {
            console.log('🔄 Refreshing canvas display');
            
            if (!this.currentCanvas) {
                console.warn('⚠️ No current canvas to refresh');
                return;
            }
            
            // Reload tiles from server
            const tiles = await this.tileApi.getForCanvas(this.currentCanvas.id);
            console.log('🔄 Loaded tiles for refresh:', tiles.length);
            
            // Update canvas viewer with new tiles
            if (window.CanvasViewer) {
                window.CanvasViewer.loadTiles(tiles);
                console.log('✅ Canvas viewer refreshed with new tiles');
            }
            
            // Update stats
            await this.updateCanvasStats(this.currentCanvas);
            
        } catch (error) {
            console.error('❌ Failed to refresh canvas display:', error);
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
            
            this.webSocket = await this.webSocketManager.connect(canvasId);
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
        // Back to canvases button
        const backBtn = document.getElementById('viewer-back-to-canvases-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                this.showSection('canvas');
            };
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('viewer-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                if (this.currentCanvas) {
                    await this.openCanvas(this.currentCanvas);
                }
            };
        }
        
        // FIXED: Settings button - show for canvas owners
        const settingsBtn = document.getElementById('viewer-settings-btn');
        if (settingsBtn && this.currentCanvas) {
            // Check if current user is the canvas owner
            const currentUser = appState.get('currentUser');
            const isOwner = currentUser && this.currentCanvas.creator_id === currentUser.id;
            
            if (isOwner) {
                // Show the settings button for canvas owners
                settingsBtn.style.display = 'inline-block';
                settingsBtn.onclick = () => {
                    if (window.modalManager) {
                        window.modalManager.showCanvasSettingsModal(this.currentCanvas.id);
                    }
                };
                console.log('✅ Settings button shown for canvas owner');
            } else {
                // Hide the settings button for non-owners
                settingsBtn.style.display = 'none';
                console.log('✅ Settings button hidden for non-owner');
            }
        }
        
        // Zoom fit button
        const zoomFitBtn = document.getElementById('viewer-zoom-fit-btn');
        if (zoomFitBtn && window.CanvasViewer) {
            zoomFitBtn.onclick = () => {
                window.CanvasViewer.zoomFit();
            };
        }
        
        // Zoom in/out buttons
        const zoomInBtn = document.getElementById('viewer-zoom-in-btn');
        if (zoomInBtn && window.CanvasViewer) {
            zoomInBtn.onclick = () => {
                window.CanvasViewer.zoomIn();
            };
        }
        
        const zoomOutBtn = document.getElementById('viewer-zoom-out-btn');
        if (zoomOutBtn && window.CanvasViewer) {
            zoomOutBtn.onclick = () => {
                window.CanvasViewer.zoomOut();
            };
        }
        
        // FIXED: Add refresh button
        const refreshCanvasBtn = document.getElementById('refresh-canvas-btn');
        if (refreshCanvasBtn) {
            refreshCanvasBtn.onclick = () => {
                this.refreshCanvasDisplay();
            };
            console.log('✅ Refresh button setup complete');
        }
        
        // FIXED: Listen for tile events to auto-refresh
        this.eventManager.on('tileCreated', () => {
            console.log('🔄 Auto-refreshing canvas after tile creation');
            setTimeout(() => {
                this.refreshCanvasDisplay();
            }, 1000); // Small delay to ensure server has processed the change
        });
        
        this.eventManager.on('tileUpdated', () => {
            console.log('🔄 Auto-refreshing canvas after tile update');
            setTimeout(() => {
                this.refreshCanvasDisplay();
            }, 1000);
        });
        
        console.log('✅ Viewer controls setup complete');
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
     * Open tile editor for a specific tile
     */
    openTileEditor(tile) {
        try {
            console.log('🎨 Opening tile editor for tile:', tile);
            
            // Store the current tile in app state
            if (window.appState) {
                window.appState.set('currentTile', tile);
            }
            
            // Show the editor section
            this.showSection('editor');
            
            // Initialize the tile editor if available
            if (window.tileEditorManager) {
                window.tileEditorManager.openTileEditor(tile);
            }
            
            console.log('✅ Tile editor opened successfully');
            
        } catch (error) {
            console.error('❌ Failed to open tile editor:', error);
            this.showCanvasError('Failed to open tile editor');
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

    /**
     * Update canvas header with additional info (palette type, description, max tiles)
     */
    updateCanvasHeaderInfo(canvasData) {
        // Get or create the canvas info container
        let canvasInfoContainer = document.querySelector('.viewer-title .canvas-info');
        if (!canvasInfoContainer) {
            canvasInfoContainer = document.createElement('div');
            canvasInfoContainer.className = 'canvas-info';
            const viewerTitle = document.querySelector('.viewer-title');
            if (viewerTitle) {
                viewerTitle.appendChild(canvasInfoContainer);
            }
        }
        
        // Clear existing content and add new info
        canvasInfoContainer.innerHTML = `
            <span id="viewer-canvas-users">0 users online</span>
            <span id="viewer-canvas-dimensions">${canvasData.width}x${canvasData.height}</span>
            <span id="viewer-canvas-palette" class="palette-info">
                <i class="fas fa-palette"></i> ${canvasData.palette_type || 'classic'}
            </span>
            <span id="viewer-canvas-max-tiles" class="max-tiles-info">
                <i class="fas fa-user-lock"></i> Max ${canvasData.max_tiles_per_user || 10} tiles/user
            </span>
            ${canvasData.description ? `<span id="viewer-canvas-description" class="description-info">
                <i class="fas fa-info-circle"></i> ${canvasData.description}
            </span>` : ''}
            <span id="viewer-instructions">Click on a tile to edit it</span>
        `;
    }
} 