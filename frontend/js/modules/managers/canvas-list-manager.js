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
     * Render canvas list with cards
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

        canvases.forEach(canvas => {
            const cardElement = this.createCanvasCard(canvas);
            this.canvasListContainer.appendChild(cardElement);
        });
    }

    /**
     * Create a canvas card element
     */
    createCanvasCard(canvas) {
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
                <canvas class="canvas-preview" width="128" height="128" data-canvas-id="${canvas.id}"></canvas>
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

        // Load user tile count for this canvas
        this.loadUserTileCountForCanvas(canvas.id, card);
        
        // Load canvas preview
        this.loadCanvasPreview(canvas, card);

        return card;
    }

    /**
     * Load user's tile count for a specific canvas
     */
    async loadUserTileCountForCanvas(canvasId, cardElement) {
        try {
            const currentUser = appState.get('currentUser');
            if (!currentUser || !currentUser.id) {
                return;
            }

            const tileCount = await this.tileApi.getUserTileCount(currentUser.id, canvasId);
            const tileCountElement = cardElement.querySelector('.user-tiles-count');
            if (tileCountElement) {
                tileCountElement.textContent = `${tileCount.tile_count} your tiles`;
            }
        } catch (error) {
            console.warn('Failed to load user tile count for canvas:', canvasId, error);
            const tileCountElement = cardElement.querySelector('.user-tiles-count');
            if (tileCountElement) {
                tileCountElement.textContent = '0 your tiles';
            }
        }
    }

    /**
     * Load and render canvas preview
     */
    async loadCanvasPreview(canvas, cardElement) {
        try {
            const previewCanvas = cardElement.querySelector('.canvas-preview');
            const previewOverlay = cardElement.querySelector('.preview-overlay');
            
            if (!previewCanvas || !previewOverlay) {
                console.warn('Preview canvas elements not found');
                return;
            }

            // Get tiles for this canvas
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
            
        } catch (error) {
            console.warn('Failed to load canvas preview:', error);
            const previewOverlay = cardElement.querySelector('.preview-overlay');
            if (previewOverlay) {
                previewOverlay.innerHTML = '<span class="preview-error">Preview unavailable</span>';
                previewOverlay.style.display = 'flex';
            }
        }
    }

    /**
     * Render canvas preview on a small canvas element with detailed pixel rendering
     */
    renderCanvasPreview(previewCanvas, canvas, tiles) {
        const ctx = previewCanvas.getContext('2d');
        const canvasWidth = previewCanvas.width; // 128
        const canvasHeight = previewCanvas.height; // 128
        
        // Clear canvas with a subtle background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        if (!tiles || tiles.length === 0) {
            return;
        }

        // Calculate how many tiles we can show (target 4x4 tiles in 128x128 preview)
        const targetTilesPerSide = 4;
        const pixelsPerTile = Math.floor(canvasWidth / targetTilesPerSide); // 32 pixels per tile
        
        // Calculate offset to center the preview
        const totalPreviewWidth = targetTilesPerSide * pixelsPerTile;
        const totalPreviewHeight = targetTilesPerSide * pixelsPerTile;
        const offsetX = (canvasWidth - totalPreviewWidth) / 2;
        const offsetY = (canvasHeight - totalPreviewHeight) / 2;

        // Find the center area of the canvas to show in preview
        const canvasTilesX = Math.floor(canvas.width / canvas.tile_size);
        const canvasTilesY = Math.floor(canvas.height / canvas.tile_size);
        const centerX = Math.floor(canvasTilesX / 2);
        const centerY = Math.floor(canvasTilesY / 2);
        
        // Calculate the range of tiles to show (2x2 around center for 4x4 total)
        const startX = Math.max(0, centerX - 2);
        const endX = Math.min(canvasTilesX, startX + targetTilesPerSide);
        const startY = Math.max(0, centerY - 2);
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
                const previewX = offsetX + (tileX - startX) * pixelsPerTile;
                const previewY = offsetY + (tileY - startY) * pixelsPerTile;
                
                if (tile && tile.pixel_data) {
                    // Render the actual tile pixel data
                    this.renderTileInPreview(ctx, tile, previewX, previewY, pixelsPerTile);
                } else {
                    // Render empty tile background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(previewX, previewY, pixelsPerTile, pixelsPerTile);
                    
                    // Add subtle border for empty tiles
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(previewX + 0.5, previewY + 0.5, pixelsPerTile - 1, pixelsPerTile - 1);
                }
            }
        }
    }

    /**
     * Render a single tile's pixel data in the preview
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

            // Calculate how many pixels to show per pixel data point
            const originalTileSize = pixelData.length; // Assuming square tiles
            const pixelsPerDataPoint = tileSize / originalTileSize;
            
            // Render each pixel in the tile
            for (let row = 0; row < pixelData.length; row++) {
                const pixelRow = pixelData[row];
                if (!Array.isArray(pixelRow)) continue;
                
                for (let col = 0; col < pixelRow.length; col++) {
                    const color = pixelRow[col];
                    if (!color || color === 'transparent') continue;
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        x + col * pixelsPerDataPoint,
                        y + row * pixelsPerDataPoint,
                        Math.ceil(pixelsPerDataPoint),
                        Math.ceil(pixelsPerDataPoint)
                    );
                }
            }
            
        } catch (error) {
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