/**
 * Canvas Renderer
 * Handles all canvas rendering operations
 */
export class CanvasRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.canvasData = null;
        this.tiles = new Map();
        this.viewportManager = null; // Reference to viewport manager
        
        // Rendering state
        this.isRendering = false;
        this.renderQueue = [];
        this.lastRenderTime = 0;
        
        // Performance
        this.frameCount = 0;
        this.fps = 60;
        this.lastFpsUpdate = Date.now();
        
        // Display options
        this.showGrid = false;
        this.showTileBoundaries = false;
        
        // Event callbacks
        this.onRenderComplete = null;
    }
    
    /**
     * Initialize the renderer
     */
    async init(canvasElement, viewportManager) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.viewportManager = viewportManager;
        
        // Setup canvas properties
        this.setupCanvas();
        
        console.log('✅ Canvas Renderer initialized');
    }
    
    /**
     * Setup canvas properties
     */
    setupCanvas() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas not available in setupCanvas`);
            return;
        }
        
        // Set canvas size
        this.resizeCanvas();
        
        // Fix overlay alignment and visibility
        this.fixOverlayAlignment();
        
        // Add resize listener
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.fixOverlayAlignment(); // Re-fix overlay after resize
        });
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas element not available`);
            return;
        }
        
        const container = this.canvas.parentElement;
        if (!container) {
            console.warn(`⚠️ Canvas container not found`);
            return;
        }
        
        const containerRect = container.getBoundingClientRect();
        const availableWidth = containerRect.width - 20;
        const maxWidth = 1200;
        const canvasWidth = Math.min(maxWidth, Math.max(400, availableWidth));
        const canvasHeight = Math.max(267, Math.floor(canvasWidth * (2 / 3)));
        
        this.canvas.width = Math.floor(canvasWidth);
        this.canvas.height = Math.floor(canvasHeight);
        
        console.log(`🔧 Canvas resized to: ${canvasWidth}x${canvasHeight}`);
        
        // Update viewport to match new canvas size if we have canvas data and viewport manager
        if (this.canvasData && this.viewportManager && this.viewportManager.canvas) {
            console.log(`🔧 Updating viewport after canvas resize to ${canvasWidth}x${canvasHeight}`);
            this.viewportManager.resetToFit(this.canvasData);
        } else {
            console.log(`🔧 Skipping viewport update - not ready:`, {
                hasCanvasData: !!this.canvasData,
                hasViewportManager: !!this.viewportManager,
                viewportManagerReady: !!(this.viewportManager && this.viewportManager.canvas)
            });
        }
        
        // Force a render after resize
        this.requestRender();
    }
    
    /**
     * Fix overlay alignment and visibility
     * ENHANCED: Multiple CSS override strategies to prevent conflicts
     * FIXED: Uses multiple approaches to ensure styles persist
     */
    fixOverlayAlignment() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas not available for overlay fix`);
            return;
        }
        
        const container = this.canvas.parentElement;
        if (!container) {
            console.warn(`⚠️ Canvas container not found for overlay fix`);
            return;
        }
        
        // Find the overlay canvas with multiple selectors for better reliability
        const overlayCanvas = container.querySelector('canvas:not(#canvas-viewer)') || 
                             container.querySelector('canvas[style*="z-index: 1000"]') ||
                             container.querySelector('canvas:last-child');
        
        if (!overlayCanvas) {
            console.log(`🔧 No overlay canvas found to fix`);
            return;
        }
        
        console.log(`✅ Found overlay canvas for fixing`);
        
        // Get actual positions
        const mainRect = this.canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offsetX = mainRect.left - containerRect.left;
        const offsetY = mainRect.top - containerRect.top;
        
        // ENHANCED: Multiple CSS override strategies to prevent conflicts
        try {
            // Strategy 1: Use cssText with !important (most aggressive)
            overlayCanvas.style.cssText = `
                position: absolute !important;
                left: ${offsetX}px !important;
                top: ${offsetY}px !important;
                width: ${this.canvas.width}px !important;
                height: ${this.canvas.height}px !important;
                z-index: 1000 !important;
                opacity: 0.33 !important;
                background-color: transparent !important;
                background: transparent !important;
                pointer-events: none !important;
            `;
            
            // Strategy 2: Backup with setProperty (reinforces the styles)
            overlayCanvas.style.setProperty('position', 'absolute', 'important');
            overlayCanvas.style.setProperty('left', offsetX + 'px', 'important');
            overlayCanvas.style.setProperty('top', offsetY + 'px', 'important');
            overlayCanvas.style.setProperty('width', this.canvas.width + 'px', 'important');
            overlayCanvas.style.setProperty('height', this.canvas.height + 'px', 'important');
            overlayCanvas.style.setProperty('z-index', '1000', 'important');
            overlayCanvas.style.setProperty('opacity', '0.33', 'important');
            overlayCanvas.style.setProperty('background-color', 'transparent', 'important');
            overlayCanvas.style.setProperty('background', 'transparent', 'important');
            overlayCanvas.style.setProperty('pointer-events', 'none', 'important');
            
            // Strategy 3: Force immediate style application
            overlayCanvas.style.display = 'block';
            overlayCanvas.style.visibility = 'visible';
            
            console.log(`✅ Enhanced overlay fix applied - positioned at (${offsetX}, ${offsetY}) with 33% opacity`);
            
        } catch (error) {
            console.error('❌ Error applying enhanced overlay fix:', error);
        }
        
        // Also fix the viewer-overlay div if it exists
        const viewerOverlay = container.querySelector('.viewer-overlay');
        if (viewerOverlay) {
            try {
                // Apply the same multi-strategy approach
                viewerOverlay.style.cssText = `
                    position: absolute !important;
                    left: 0px !important;
                    top: 0px !important;
                    width: 100% !important;
                    height: 100% !important;
                    background-color: transparent !important;
                    background: transparent !important;
                    pointer-events: none !important;
                `;
                
                console.log(`✅ Viewer overlay also fixed with enhanced approach`);
            } catch (error) {
                console.error('❌ Error fixing viewer overlay:', error);
            }
        }
    }
    
    /**
     * Set canvas data and tiles
     */
    async setCanvasData(canvasData, tiles) {
        this.canvasData = canvasData;
        this.tiles.clear();
        
        // Debug: Log what we're receiving
        console.log(`🔧 Renderer setCanvasData called with:`, {
            canvasData: canvasData,
            tilesArray: tiles,
            tilesLength: tiles.length,
            tilesType: Array.isArray(tiles) ? 'Array' : typeof tiles
        });
        
        // Build tile map
        tiles.forEach(tile => {
            const key = `${tile.x},${tile.y}`;
            this.tiles.set(key, tile);
            console.log(`🔧 Added tile to map: ${key} ->`, {
                x: tile.x,
                y: tile.y,
                tileSize: tile.tile_size || canvasData.tile_size,
                hasPixelData: !!tile.pixel_data
            });
        });
        
        console.log(`✅ Loaded ${this.tiles.size} tiles into renderer`);
        console.log(`🔧 Tile map keys:`, Array.from(this.tiles.keys()));
        
        // FIX: Fix overlay alignment after canvas data is loaded
        // Use setTimeout to ensure DOM elements are ready
        setTimeout(() => {
            this.fixOverlayAlignment();
        }, 100); // Small delay to ensure overlay canvas exists
        
        this.requestRender();
    }
    
    /**
     * Update a specific tile
     */
    updateTile(tileData) {
        if (!tileData || !tileData.x || !tileData.y) {
            console.warn(`⚠️ Invalid tile data:`, tileData);
            return;
        }
        
        const key = `${tileData.x},${tileData.y}`;
        this.tiles.set(key, tileData);
        
        this.requestRender();
    }
    
    /**
     * Clear all tiles
     */
    clearAllTiles() {
        this.tiles.clear();
        this.requestRender();
    }
    
    /**
     * Set viewport
     */
    setViewport(viewport) {
        // Don't store viewport locally - use the one from viewport manager
        this.requestRender();
    }
    
    /**
     * Request a render update
     */
    requestRender() {
        if (this.isRendering) {
            return; // Already rendering
        }
        
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            this.render();
        });
    }
    
    /**
     * Update viewport information
     */
    updateViewport(viewport) {
        if (!this.viewportManager) {
            console.warn('⚠️ No viewport manager available for viewport update');
            return;
        }
        
        // Update the viewport manager's viewport
        this.viewportManager.setViewport(viewport.x, viewport.y, viewport.zoom);
        
        // Request a render to show the changes
        this.requestRender();
        
        console.log('🔧 Viewport updated and render requested:', viewport);
    }
    
    /**
     * Main render method
     */
    render() {
        if (!this.canvas || !this.ctx) {
            console.warn(`⚠️ Canvas or context not available:`, { canvas: !!this.canvas, ctx: !!this.ctx });
            return;
        }
        
        console.log(`🔧 Render: ${this.canvas.width}x${this.canvas.height}, ${this.tiles.size} tiles`);
        
        const startTime = performance.now();
        this.isRendering = true;
        
        try {
            // Clear canvas
            this.clearCanvas();
            
            // Apply viewport transform
            this.applyViewportTransform();
            
            // Render tiles
            this.renderTiles();
            
            // Render grid and overlays
            this.renderOverlays();
            
            // Update performance metrics
            this.updatePerformanceMetrics(startTime);
            
        } catch (error) {
            console.error('❌ Render error:', error);
        } finally {
            this.isRendering = false;
        }
    }
    
    /**
     * Clear the canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Apply viewport transform
     */
    applyViewportTransform() {
        const viewport = this.viewportManager?.getViewport();
        
        if (!viewport) {
            console.warn(`⚠️ No viewport available, skipping transform`);
            return;
        }
        
        console.log(`🔧 applyViewportTransform:`, {
            viewportX: viewport.x,
            viewportY: viewport.y,
            viewportZoom: viewport.zoom,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height
        });
        
        this.ctx.save();
        this.ctx.translate(viewport.x, viewport.y);
        this.ctx.scale(viewport.zoom, viewport.zoom);
    }
    
    /**
     * Render all visible tiles
     */
    renderTiles() {
        if (!this.canvasData || !this.tiles.size) {
            console.warn(`⚠️ No canvas data or tiles:`, { canvasData: !!this.canvasData, tilesSize: this.tiles.size });
            return;
        }
        
        const tileSize = this.canvasData.tile_size;
        console.log(`🔧 Rendering tiles with tile size: ${tileSize}`);
        
        const visibleTiles = this.getVisibleTiles(tileSize);
        console.log(`🔧 Visible tiles: ${visibleTiles.length} out of ${this.tiles.size} total`);
        
        if (visibleTiles.length === 0) {
            console.warn(`⚠️ No tiles are visible! This suggests a viewport or visibility calculation issue.`);
            console.log(`🔧 Current viewport:`, this.viewportManager?.getViewport());
            console.log(`🔧 Canvas dimensions:`, { width: this.canvas.width, height: this.canvas.height });
            
            // Debug: show all tiles regardless of visibility
            console.log(`🔧 Debug: Rendering ALL tiles to check if it's a visibility issue`);
            this.tiles.forEach(tile => {
                this.renderTile(tile, tileSize);
            });
            return;
        }
        
        visibleTiles.forEach(tile => {
            this.renderTile(tile, tileSize);
        });
        
        console.log(`✅ Rendered ${visibleTiles.length} tiles`);
    }
    
    /**
     * Get visible tiles based on viewport
     */
    getVisibleTiles(tileSize) {
        
        const visibleTiles = [];
        
        this.tiles.forEach(tile => {
            const tileX = tile.x * tileSize;
            const tileY = tile.y * tileSize;
            
            // Check if tile is visible in viewport
            if (this.isTileVisible(tileX, tileY, tileSize)) {
                visibleTiles.push(tile);
            }
        });
        
        console.log(`🔍 Found ${visibleTiles.length} visible tiles`);
        return visibleTiles;
    }
    
    /**
     * Check if tile is visible in viewport
     * FIXED: Use correct viewport bounds calculation
     */
    isTileVisible(tileX, tileY, tileSize) {
        const viewport = this.viewportManager?.getViewport();
        if (!viewport) {
            console.warn(`⚠️ No viewport available for visibility check`);
            return false;
        }
        
        // FIXED: Use correct viewport bounds calculation
        // The viewport shows world area from viewport.x to viewport.x + (canvas.width / zoom)
        const viewportLeft = viewport.x;
        const viewportTop = viewport.y;
        const viewportRight = viewport.x + (this.canvas.width / viewport.zoom);
        const viewportBottom = viewport.y + (this.canvas.height / viewport.zoom);
        
        const isVisible = !(tileX + tileSize < viewportLeft || 
                tileX > viewportRight || 
                tileY + tileSize < viewportTop || 
                tileY > viewportBottom);
        
        // Debug logging for first few tiles
        if (this.debugTileCount === undefined) {
            this.debugTileCount = 0;
        }
        if (this.debugTileCount < 3) {
            console.log(`🔍 Tile visibility check ${this.debugTileCount + 1}:`, {
                tile: { x: tileX, y: tileY, size: tileSize },
                viewport: { left: viewportLeft, top: viewportTop, right: viewportRight, bottom: viewportBottom },
                isVisible
            });
            this.debugTileCount++;
        }
        
        return isVisible;
    }
    
    /**
     * Render a single tile
     */
    renderTile(tile, tileSize) {
        if (!tile.pixel_data) {
            console.warn(`⚠️ Tile ${tile.x},${tile.y} has no pixel data`);
            return;
        }
        
        const x = tile.x * tileSize;
        const y = tile.y * tileSize;
        
        try {
            const pixelData = typeof tile.pixel_data === 'string' 
                ? JSON.parse(tile.pixel_data) 
                : tile.pixel_data;
            
            if (!Array.isArray(pixelData)) {
                console.warn(`⚠️ Tile ${tile.x},${tile.y} pixel data is not an array:`, pixelData);
                return;
            }
            
            const actualTileSize = pixelData.length;
            const pixelSize = tileSize / actualTileSize;
            
            for (let row = 0; row < actualTileSize; row++) {
                for (let col = 0; col < actualTileSize; col++) {
                    const color = pixelData[row]?.[col];
                    if (!color || color === 'transparent') continue;
                    
                    this.renderPixel(x + col * pixelSize, y + row * pixelSize, pixelSize, color);
                }
            }
            
            // Tile rendered successfully
            
        } catch (error) {
            console.error('❌ Error rendering tile:', error);
        }
    }
    
    /**
     * Render a single pixel
     */
    renderPixel(x, y, size, color) {
        let fillColor = color;
        
        if (Array.isArray(color) && color.length >= 3) {
            const [r, g, b, a = 255] = color;
            fillColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        }
        
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, size, size);
    }
    
    /**
     * Render grid and overlays
     */
    renderOverlays() {
        // Restore context after viewport transform
        this.ctx.restore();
        
        // Render grid if enabled
        if (this.showGrid) {
            this.renderGrid();
        }
        
        // Render tile boundaries if enabled
        if (this.showTileBoundaries) {
            this.renderTileBoundaries();
        }
    }
    
    /**
     * Render grid
     */
    renderGrid() {
        if (!this.canvasData) {
            console.warn(`⚠️ No canvas data available for grid rendering`);
            return;
        }
        
        const tileSize = this.canvasData.tile_size;
        const gridSize = 1024 / tileSize;
        
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= gridSize; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * tileSize, 0);
            this.ctx.lineTo(x * tileSize, 1024);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= gridSize; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * tileSize);
            this.ctx.lineTo(1024, y * tileSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * Render tile boundaries
     */
    renderTileBoundaries() {
        if (!this.canvasData) {
            console.warn(`⚠️ No canvas data available for tile boundary rendering`);
            return;
        }
        
        const tileSize = this.canvasData.tile_size;
        const gridSize = 1024 / tileSize;
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        
        // Draw tile boundaries
        for (let x = 0; x <= gridSize; x++) {
            for (let y = 0; y <= gridSize; y++) {
                this.ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(startTime) {
        const renderTime = performance.now() - startTime;
        this.lastRenderTime = renderTime;
        this.frameCount++;
        
        // Update FPS every second
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
        
        // Emit render complete event
        if (this.onRenderComplete) {
            this.onRenderComplete(renderTime);
        }
        
        // Debug: log performance data
        console.log(`🔧 Render performance: FPS=${this.fps}, Time=${renderTime.toFixed(2)}ms`);
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * Use the viewport manager's method for consistency
     */
    screenToWorld(screenX, screenY) {
        if (!this.viewportManager) {
            console.warn(`⚠️ Viewport manager not available for coordinate conversion`);
            return { x: screenX, y: screenY };
        }
        
        // Delegate to viewport manager for consistency
        return this.viewportManager.screenToWorld(screenX, screenY);
    }
    
    /**
     * Zoom to fit canvas
     */
    zoomFit() {
        if (!this.canvasData) {
            console.warn(`⚠️ No canvas data available for zoom fit`);
            return;
        }
        
        // Calculate zoom to fit canvas
        const scaleX = this.canvas.width / this.canvasData.width;
        const scaleY = this.canvas.height / this.canvasData.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        // Center the canvas
        const scaledWidth = this.canvasData.width * scale;
        const scaledHeight = this.canvasData.height * scale;
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;
        
        this.setViewport({ x, y, zoom: scale });
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        const viewport = this.viewportManager?.getViewport();
        if (!viewport) {
            console.warn(`⚠️ No viewport available for zoom in`);
            return;
        }
        
        const newZoom = Math.min(10, viewport.zoom * 1.2);
        
        this.setViewport({ ...viewport, zoom: newZoom });
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        const viewport = this.viewportManager?.getViewport();
        if (!viewport) {
            console.warn(`⚠️ No viewport available for zoom out`);
            return;
        }
        
        const newZoom = Math.max(0.1, viewport.zoom / 1.2);
        
        this.setViewport({ ...viewport, zoom: newZoom });
    }
    
    /**
     * Emergency reset
     */
    emergencyReset() {
        // Clear all data
        this.canvasData = null;
        this.tiles.clear();
        // Don't reset viewport - let viewport manager handle it
        
        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear tiles
        this.tiles.clear();
        
        // Clear canvas data
        this.canvasData = null;
        
        // Don't clear viewport - let viewport manager handle it
        
        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
