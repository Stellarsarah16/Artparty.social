/**
 * Canvas List Manager
 * Handles canvas list display, user tile counts, and canvas card interactions
 */

import appState from '../app-state.js';

export class CanvasListManager {
    constructor(canvasApi, tileApi, eventManager) {
        console.log('🔧 CanvasListManager constructor called with:', {
            canvasApi: canvasApi,
            canvasApiType: typeof canvasApi,
            canvasApiMethods: canvasApi ? Object.getOwnPropertyNames(Object.getPrototypeOf(canvasApi)) : 'null',
            tileApi: tileApi,
            eventManager: eventManager
        });
        
        this.canvasApi = canvasApi;
        this.tileApi = tileApi;
        this.eventManager = eventManager;
        this.canvasListContainer = document.getElementById('canvas-grid');
        
        console.log('🔧 CanvasListManager initialized with canvasApi methods:', 
            this.canvasApi ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.canvasApi)) : 'null');
        
        // Add loading state tracking
        this.isLoadingCanvases = false;
        this.isLoadingStaggeredData = false;
    }

    /**
     * Add this method to check backend readiness
     */
    async checkBackendReadiness() {
        try {
            // Get the API base URL from the global config
            const baseURL = window.API_CONFIG?.BASE_URL || window.location.origin;
            const readyURL = `${baseURL}/ready`;
            
            console.log('🔧 Checking backend readiness at:', readyURL);
            
            const response = await fetch(readyURL);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Backend readiness check response:', data);
                return data.status === 'ready';
            }
            console.warn('⚠️ Backend readiness check failed - response not ok:', response.status, response.statusText);
            return false;
        } catch (error) {
            console.warn('⚠️ Backend readiness check failed:', error);
            return false;
        }
    }

    /**
     * Load and display all canvases
     */
    async loadCanvases() {
        // Prevent multiple simultaneous loading operations
        if (this.isLoadingCanvases) {
            console.log('⏭️ Canvas loading already in progress, skipping duplicate request');
            return;
        }
        
        this.isLoadingCanvases = true;
        
        try {
            console.log('🔄 Loading canvases...');
            
            // ✅ Check backend readiness first - TEMPORARILY DISABLED due to HTML response issue
            // const isReady = await this.checkBackendReadiness();
            // if (!isReady) {
            //     console.log('⏳ Backend not ready, waiting...');
            //     // Wait and retry
            //     setTimeout(() => this.loadCanvases(), 2000);
            //     return;
            // }
            
            console.log('🔧 this.canvasApi:', this.canvasApi);
            console.log('🔧 this.canvasApi.list:', this.canvasApi?.list);
            console.log('🔧 typeof this.canvasApi.list:', typeof this.canvasApi?.list);
            
            if (!this.canvasApi || typeof this.canvasApi.list !== 'function') {
                throw new Error(`CanvasAPI not properly initialized. canvasApi: ${this.canvasApi}, list: ${this.canvasApi?.list}`);
            }
            
            const canvases = await this.canvasApi.list();
            this.renderCanvasList(canvases);
            console.log(`✅ Loaded ${canvases.length} canvases`);
        } catch (error) {
            console.error('❌ Failed to load canvases:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to load canvases', 'error');
            }
        } finally {
            this.isLoadingCanvases = false;
        }
    }

    /**
     * Render canvas list with cards and staggered loading
     */
    renderCanvasList(canvases) {
        if (!this.canvasListContainer) {
            console.error('Canvas list container not found');
            return;
        }

        this.canvasListContainer.innerHTML = '';
        
        if (canvases.length === 0) {
            this.canvasListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-palette"></i>
                    <h3>No canvases yet</h3>
                    <p>Create your first canvas to get started!</p>
                    <button class="btn btn-primary" onclick="navigationManager.showModal('create-canvas')">
                        Create Canvas
                    </button>
                </div>
            `;
            return;
        }

        // Create all cards first (without loading data)
        const cardElements = canvases.map(canvas => this.createCanvasCard(canvas, false)); // false = don't load data yet
        cardElements.forEach(cardElement => {
            this.canvasListContainer.appendChild(cardElement);
        });
        
        console.log(`🔍 Debug: Created ${cardElements.length} card elements for ${canvases.length} canvases`);
        console.log(`🔍 Debug: Canvases:`, canvases.map(c => c.id));
        console.log(`🔍 Debug: Card elements:`, cardElements.map(c => c ? 'valid' : 'undefined'));
        
        // Stagger the data loading to prevent server overload
        this.staggeredLoadCanvasData(canvases, cardElements);
    }

// Update the staggeredLoadCanvasData method
async staggeredLoadCanvasData(canvases, cardElements) {
    // Prevent multiple simultaneous staggered loading operations
    if (this.isLoadingStaggeredData) {
        console.log('⏭️ Staggered loading already in progress, skipping duplicate request');
        return;
    }
    
    this.isLoadingStaggeredData = true;

    console.log(`🔍 staggeredLoadCanvasData: Received ${canvases.length} canvases and ${cardElements.length} card elements`);
    console.log(`🔍 Canvases IDs:`, canvases.map(c => c.id));
    console.log(`🔍 Card elements valid:`, cardElements.map(c => c ? 'valid' : 'undefined'));
    
    try {
        // Process canvases in smaller batches to avoid overwhelming backend
        const batchSize = 2; // Process 2 canvases at a time
        const batchDelay = 500; // 500ms between batches
        const requestDelay = 250; // 250ms between requests within batch
        
        for (let batchStart = 0; batchStart < canvases.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, canvases.length);
            console.log(`🔍 Processing batch ${Math.floor(batchStart/batchSize) + 1}: canvases ${batchStart} to ${batchEnd - 1}`);
            
            // Process this batch
            for (let i = batchStart; i < batchEnd; i++) {
                const canvas = canvases[i];
                const cardElement = cardElements[i];
                
                console.log(`🔍 Processing canvas ${canvas.id} at index ${i}, cardElement:`, cardElement ? 'valid' : 'undefined');
                
                try {
                    // Longer delay between requests to reduce database pressure
                    if (i > batchStart) {
                        await new Promise(resolve => setTimeout(resolve, requestDelay));
                    }
                    
                    // Load user tile count
                    await this.loadUserTileCountForCanvas(canvas.id, cardElement);
                    
                    // Add delay before preview
                    await new Promise(resolve => setTimeout(resolve, requestDelay));
                    
                    // Load canvas preview
                    await this.loadCanvasPreview(canvas, cardElement);
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to load data for canvas ${canvas.id}:`, error);
                    // Continue with other canvases instead of failing completely
                    continue;
                }
            }
            
            // Delay between batches (except for last batch)
            if (batchEnd < canvases.length) {
                console.log(`⏱️ Waiting ${batchDelay}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, batchDelay));
            }
        }
    } catch (error) {
        console.error('❌ Error in staggered data loading:', error);
    } finally {
        this.isLoadingStaggeredData = false;
    }
}

    /**
     * Create a canvas card element
     */
    createCanvasCard(canvas, loadData = true) {
        const currentUser = appState.get('currentUser');
        const isOwner = currentUser && canvas.creator_id === currentUser.id;
        
        const card = document.createElement('div');
        card.className = 'canvas-card';
        card.innerHTML = `
            <div class="canvas-card-header">
                <h3>${canvas.name}</h3>
                ${isOwner ? '<button class="canvas-settings-btn" title="Edit Canvas Settings"><i class="fas fa-cog"></i></button>' : ''}
            </div>
            <div class="canvas-preview-container">
                <!-- FIXED: Changed to landscape 2:3 ratio (192x128) for better tile visibility -->
                <canvas class="canvas-preview" width="192" height="128" data-canvas-id="${canvas.id}"></canvas>
                <div class="preview-overlay">
                    <span class="preview-loading">Loading preview...</span>
                </div>
            </div>
            <div class="canvas-card-body">
                <div class="canvas-info">
                    <div class="info-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${canvas.width} × ${canvas.height}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${canvas.user_count || 0} users</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-th"></i>
                        <span>${canvas.total_tiles || 0} tiles</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-palette"></i>
                        <span>${canvas.palette_type || 'classic'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user-lock"></i>
                        <span>Max ${canvas.max_tiles_per_user || 10} tiles/user</span>
                    </div>
                </div>
                <div class="user-tiles-info">
                    <span class="user-tiles-count">Loading...</span>
                </div>
            </div>
            <div class="canvas-card-footer">
                <button class="btn btn-primary open-canvas-btn" data-canvas='${JSON.stringify(canvas)}'>
                    Open Canvas
                </button>
            </div>
        `;

        // Add settings button event listener
        const settingsBtn = card.querySelector('.canvas-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showCanvasSettingsModal(canvas.id);
            });
        }

        // Add open canvas button event listener
        const openBtn = card.querySelector('.open-canvas-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const canvasData = JSON.parse(openBtn.dataset.canvas);
                console.log('🔄 Open Canvas button clicked for:', canvasData);
                
                // Call the navigation manager's openCanvas method to handle both opening and section switching
                if (window.navigationManager) {
                    console.log('✅ Navigation manager found, calling openCanvas...');
                    window.navigationManager.openCanvas(canvasData);
                } else {
                    console.error('❌ Navigation manager not found, falling back to direct canvas viewer');
                    // Fallback to direct call if navigation manager isn't available
                    if (window.CanvasViewer) {
                        console.log('🔄 Loading tiles for canvas in fallback mode...');
                        
                        // Initialize CanvasViewer if not already initialized
                        if (!window.CanvasViewer.isInitialized()) {
                            console.log('🔄 Initializing CanvasViewer with canvas element...');
                            const canvasElement = document.getElementById('canvas-viewer');
                            if (canvasElement) {
                                window.CanvasViewer.init(canvasElement);
                                console.log('✅ CanvasViewer initialized');
                            } else {
                                console.error('❌ Canvas viewer element not found');
                                return;
                            }
                        }
                        
                        // Set up tile click callback to open tile editor
                        if (window.CanvasViewer && window.tileEditorManager) {
                            console.log('🔄 Setting up tile click callback in fallback mode...');
                            window.CanvasViewer.onTileClick = (tile) => {
                                console.log('🎯 Tile clicked, opening tile editor:', tile);
                                window.tileEditorManager.openTileEditor(tile);
                            };
                            console.log('✅ Tile click callback configured in fallback mode');
                        }
                        
                        // Set canvas data first
                        window.CanvasViewer.setCanvasData(canvasData);
                        
                        // Load tiles for this canvas
                        this.tileApi.getForCanvas(canvasData.id).then(tiles => {
                            if (tiles && tiles.length > 0) {
                                console.log(`📦 Loaded ${tiles.length} tiles for canvas`);
                                window.CanvasViewer.loadTiles(tiles);
                            } else {
                                console.log('📦 No tiles found for canvas');
                            }
                        }).catch(error => {
                            console.error('❌ Failed to load tiles for canvas:', error);
                        });
                    }
                }
            });
        }

        // Conditionally load data to prevent server overload
        if (loadData) {
            console.log(`🔍 Creating canvas card for canvas ${canvas.id}, card element:`, card);
            console.log(`🔍 Card element type:`, typeof card);
            console.log(`🔍 Card element querySelector available:`, typeof card?.querySelector === 'function');
            
            // Load user tile count for this canvas
            this.loadUserTileCountForCanvas(canvas.id, card);
            
            // Load canvas preview
            this.loadCanvasPreview(canvas, card);
        }

        console.log(`🔍 createCanvasCard: Returning card for canvas ${canvas.id}:`, card ? 'valid' : 'undefined');
        return card;
    }

    /**
     * Load user's tile count for a specific canvas with retry logic
     */
    async loadUserTileCountForCanvas(canvasId, cardElement, retries = 3) {
        const currentUser = appState.get('currentUser');
        if (!currentUser || !currentUser.id) {
            console.warn('❌ No current user found, skipping user tile count load');
            return;
        }

        // Defensive check for cardElement
        if (!cardElement) {
            console.error('❌ Card element is undefined, cannot load user tile count for canvas', canvasId);
            return;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📊 Loading user tile count for canvas ${canvasId} (attempt ${attempt}/${retries})`);
                
                const tileCount = await this.tileApi.getUserTileCount(currentUser.id, canvasId);
                
                // Defensive check before using querySelector
                if (!cardElement || typeof cardElement.querySelector !== 'function') {
                    console.error('❌ Card element is invalid or querySelector not available for canvas', canvasId);
                    return;
                }
                
                const tileCountElement = cardElement.querySelector('.user-tiles-count');
                if (tileCountElement) {
                    tileCountElement.textContent = `${tileCount.tile_count} your tiles`;
                } else {
                    console.warn(`⚠️ User tiles count element not found for canvas ${canvasId}`);
                }
                
                console.log(`✅ Successfully loaded user tile count for canvas ${canvasId}`);
                return; // Success - exit retry loop
                
            } catch (error) {
                console.warn(`❌ User tile count attempt ${attempt}/${retries} failed for canvas ${canvasId}:`, {
                    error: error.message,
                    status: error.status
                });
                
                if (attempt === retries) {
                    // Final attempt failed
                    console.error(`❌ All ${retries} user tile count attempts failed for canvas ${canvasId}`);
                    
                    // Defensive check before using querySelector
                    if (cardElement && typeof cardElement.querySelector === 'function') {
                        const tileCountElement = cardElement.querySelector('.user-tiles-count');
                        if (tileCountElement) {
                            tileCountElement.textContent = '0 your tiles';
                        }
                    }
                } else {
                    // Wait before retrying
                    const delay = Math.min(500 * attempt, 2000);
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    /**
     * Load and render canvas preview with retry logic
     */
    async loadCanvasPreview(canvas, cardElement, retries = 3) {
        // Defensive check for cardElement
        if (!cardElement) {
            console.error('❌ Card element is undefined, cannot load canvas preview for canvas', canvas?.id || 'unknown');
            return;
        }

        // Defensive check before using querySelector
        if (typeof cardElement.querySelector !== 'function') {
            console.error('❌ Card element querySelector not available for canvas', canvas?.id || 'unknown');
            return;
        }

        const previewCanvas = cardElement.querySelector('.canvas-preview');
        const previewOverlay = cardElement.querySelector('.preview-overlay');
        
        if (!previewCanvas || !previewOverlay) {
            console.warn('Preview canvas elements not found for canvas', canvas?.id || 'unknown');
            return;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🖼️ Loading preview for canvas ${canvas.name} (attempt ${attempt}/${retries})`);

                // Get tiles for this canvas with retry
                const tiles = await this.tileApi.getForCanvas(canvas.id);
            
                if (!tiles || tiles.length === 0) {
                    // No tiles - show empty canvas
                    previewOverlay.innerHTML = '<span class="preview-empty">Empty canvas</span>';
                    previewOverlay.style.display = 'flex';
                    return;
                }

                // Render preview
                this.renderCanvasPreview(previewCanvas, canvas, tiles);
                
                // Hide overlay
                previewOverlay.style.display = 'none';
                
                console.log(`✅ Successfully loaded preview for canvas ${canvas.name}`);
                return; // Success - exit retry loop
                
            } catch (error) {
                console.warn(`❌ Preview load attempt ${attempt}/${retries} failed for canvas ${canvas.name}:`, {
                    error: error.message,
                    status: error.status,
                    canvasId: canvas.id
                });
                
                if (attempt === retries) {
                    // Final attempt failed
                    console.error(`❌ All ${retries} preview load attempts failed for canvas ${canvas.name}`);
                    previewOverlay.innerHTML = '<span class="preview-error">Preview unavailable</span>';
                    previewOverlay.style.display = 'flex';
                } else {
                    // Wait before retrying (exponential backoff)
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    }

    /**
     * Render canvas preview on a landscape canvas element with smart tile scaling
     */
    renderCanvasPreview(previewCanvas, canvas, tiles) {
        const ctx = previewCanvas.getContext('2d');
        const canvasWidth = previewCanvas.width; // 192
        const canvasHeight = previewCanvas.height; // 128
        
        // Clear canvas with a subtle background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        if (!tiles || tiles.length === 0) {
            return;
        }

        // FIXED: Calculate optimal tile display based on canvas tile size
        const tileSize = canvas.tile_size; // 32, 64, or 128
        const canvasTilesX = Math.floor(canvas.width / tileSize); // Total tiles across
        const canvasTilesY = Math.floor(canvas.height / tileSize); // Total tiles down
        
        // FIXED: Smart preview calculation - show more tiles for smaller tile sizes
        let targetTilesPerSide;
        if (tileSize <= 32) {
            targetTilesPerSide = 6; // Show 6x6 for 32x32 tiles
        } else if (tileSize <= 64) {
            targetTilesPerSide = 4; // Show 4x4 for 64x64 tiles
        } else {
            targetTilesPerSide = 3; // Show 3x3 for 128x128 tiles
        }
        
        // FIXED: Calculate tile size in preview to fit within canvas bounds
        const maxTilePreviewSize = Math.min(
            Math.floor(canvasWidth / targetTilesPerSide),
            Math.floor(canvasHeight / targetTilesPerSide)
        );
        
        // FIXED: Calculate offset to center the preview area
        const totalPreviewWidth = targetTilesPerSide * maxTilePreviewSize;
        const totalPreviewHeight = targetTilesPerSide * maxTilePreviewSize;
        const offsetX = (canvasWidth - totalPreviewWidth) / 2;
        const offsetY = (canvasHeight - totalPreviewHeight) / 2;

        // Find the center area of the canvas to show in preview
        const centerX = Math.floor(canvasTilesX / 2);
        const centerY = Math.floor(canvasTilesY / 2);
        
        // Calculate the range of tiles to show around center
        const startX = Math.max(0, centerX - Math.floor(targetTilesPerSide / 2));
        const endX = Math.min(canvasTilesX, startX + targetTilesPerSide);
        const startY = Math.max(0, centerY - Math.floor(targetTilesPerSide / 2));
        const endY = Math.min(canvasTilesY, startY + targetTilesPerSide);

        // Create a map of tiles by position for quick lookup
        const tileMap = new Map();
        tiles.forEach(tile => {
            tileMap.set(`${tile.x},${tile.y}`, tile);
        });

        // Render each tile position in the preview area
        for (let tileY = startY; tileY < endY; tileY++) {
            for (let tileX = startX; tileX < endX; tileX++) {
                const tile = tileMap.get(`${tileX},${tileY}`);
                
                // Calculate position in preview
                const previewX = offsetX + (tileX - startX) * maxTilePreviewSize;
                const previewY = offsetY + (tileY - startY) * maxTilePreviewSize;
                
                if (tile && tile.pixel_data) {
                    // Render the actual tile pixel data
                    this.renderTileInPreview(ctx, tile, previewX, previewY, maxTilePreviewSize);
                } else {
                    // Render empty tile background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(previewX, previewY, maxTilePreviewSize, maxTilePreviewSize);
                    
                    // Add subtle border for empty tiles
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(previewX + 0.5, previewY + 0.5, maxTilePreviewSize - 1, maxTilePreviewSize - 1);
                }
            }
        }
    }

    /**
     * Render a single tile's pixel data in the preview with proper scaling
     */
    renderTileInPreview(ctx, tile, x, y, tileSize) {
        try {
            // Parse pixel data
            const pixelData = typeof tile.pixel_data === 'string' 
                ? JSON.parse(tile.pixel_data) 
                : tile.pixel_data;
            
            if (!Array.isArray(pixelData) || pixelData.length === 0) {
                // Fallback to solid color
                ctx.fillStyle = '#cccccc';
                ctx.fillRect(x, y, tileSize, tileSize);
                return;
            }

            // FIXED: Calculate pixel size to fit tile data perfectly within preview space
            const originalTileSize = pixelData.length; // Actual tile size (32, 64, 128)
            const pixelsPerDataPoint = tileSize / originalTileSize;
            
            // FIXED: Ensure we don't have fractional pixels that cause overlap
            const pixelWidth = Math.max(1, Math.floor(pixelsPerDataPoint));
            const pixelHeight = Math.max(1, Math.floor(pixelsPerDataPoint));
            
            // FIXED: Calculate total rendered size and center it within the preview tile
            const totalRenderedWidth = originalTileSize * pixelWidth;
            const totalRenderedHeight = originalTileSize * pixelHeight;
            const offsetX = x + (tileSize - totalRenderedWidth) / 2;
            const offsetY = y + (tileSize - totalRenderedHeight) / 2;
            
            // Render each pixel in the tile
            for (let row = 0; row < originalTileSize; row++) {
                const pixelRow = pixelData[row];
                if (!Array.isArray(pixelRow)) continue;
                
                for (let col = 0; col < originalTileSize; col++) {
                    const color = pixelRow[col];
                    if (!color || color === 'transparent') continue;
                    
                    // FIXED: Handle different color formats properly
                    let fillColor = color;
                    if (Array.isArray(color) && color.length >= 3) {
                        const [r, g, b, a = 255] = color;
                        fillColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                    } else if (typeof color === 'string' && color.startsWith('#')) {
                        fillColor = color;
                    } else if (typeof color === 'string' && color !== 'transparent' && color !== 'white') {
                        fillColor = color;
                    }
                    
                    if (fillColor && fillColor !== 'transparent') {
                        ctx.fillStyle = fillColor;
                        ctx.fillRect(
                            offsetX + col * pixelWidth,
                            offsetY + row * pixelHeight,
                            pixelWidth,
                            pixelHeight
                        );
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error rendering tile preview:', error);
            // Fallback to a default color if parsing fails
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    /**
     * Show canvas settings modal
     */
    showCanvasSettingsModal(canvasId) {
        if (window.modalManager) {
            window.modalManager.showCanvasSettingsModal(canvasId);
        }
    }
} 