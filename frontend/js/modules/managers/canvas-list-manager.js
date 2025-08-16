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
    }

    /**
     * Load and display all canvases
     */
    async loadCanvases() {
        try {
            console.log('🔄 Loading canvases...');
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
        
        // Stagger the data loading to prevent server overload
        this.staggeredLoadCanvasData(canvases, cardElements);
    }

    /**
     * Load canvas data in a staggered manner to prevent server overload
     */
    async staggeredLoadCanvasData(canvases, cardElements) {
        console.log('🔄 Starting staggered loading for', canvases.length, 'canvases');
        
        // Load data for each canvas with delays
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const cardElement = cardElements[i];
            
            try {
                console.log(`🔄 Loading data for canvas ${i + 1}/${canvases.length}: ${canvas.name}`);
                
                // Load both user tile count and preview concurrently for this canvas
                await Promise.all([
                    this.loadUserTileCountForCanvas(canvas.id, cardElement),
                    this.loadCanvasPreview(canvas, cardElement)
                ]);
                
                console.log(`✅ Completed loading data for canvas: ${canvas.name}`);
                
                // Add a delay between canvases to prevent server overload
                if (i < canvases.length - 1) {
                    const delay = 300; // 300ms delay between each canvas
                    console.log(`⏳ Waiting ${delay}ms before loading next canvas...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to load data for canvas ${canvas.name}:`, error);
                // Continue with next canvas even if this one fails
            }
        }
        
        console.log('✅ Staggered loading completed for all canvases');
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
                if (window.canvasViewerManager) {
                    window.canvasViewerManager.openCanvas(canvasData);
                }
            });
        }

        // Conditionally load data to prevent server overload
        if (loadData) {
            // Load user tile count for this canvas
            this.loadUserTileCountForCanvas(canvas.id, card);
            
            // Load canvas preview
            this.loadCanvasPreview(canvas, card);
        }

        return card;
    }

    /**
     * Load user's tile count for a specific canvas with retry logic
     */
    async loadUserTileCountForCanvas(canvasId, cardElement, retries = 3) {
        const currentUser = appState.get('currentUser');
        if (!currentUser || !currentUser.id) {
            return;
        }

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📊 Loading user tile count for canvas ${canvasId} (attempt ${attempt}/${retries})`);
                
                const tileCount = await this.tileApi.getUserTileCount(currentUser.id, canvasId);
                const tileCountElement = cardElement.querySelector('.user-tiles-count');
                if (tileCountElement) {
                    tileCountElement.textContent = `${tileCount.tile_count} your tiles`;
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
                    const tileCountElement = cardElement.querySelector('.user-tiles-count');
                    if (tileCountElement) {
                        tileCountElement.textContent = '0 your tiles';
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
        const previewCanvas = cardElement.querySelector('.canvas-preview');
        const previewOverlay = cardElement.querySelector('.preview-overlay');
        
        if (!previewCanvas || !previewOverlay) {
            console.warn('Preview canvas elements not found');
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