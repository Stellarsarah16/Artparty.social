/**
 * Canvas Renderer - EXTRACTED FROM CANVAS VIEWER
 * 
 * SAFETY CRITICAL: This manager handles all canvas rendering operations.
 * It uses the EXACT SAME rendering logic as the working canvas viewer.
 * 
 * Key Functions:
 * - Main render loop with performance throttling
 * - Tile rendering with pixel data handling
 * - Grid and overlay rendering
 * - Canvas background and boundary rendering
 * - Debug overlay rendering
 * - Animation support
 */

export class CanvasRenderer {
    constructor(eventManager) {
        console.log('🔧 CanvasRenderer initializing...');
        
        // SAFETY: Validate dependencies
        if (!eventManager) {
            throw new Error('CanvasRenderer requires eventManager');
        }
        
        this.eventManager = eventManager;
        
        // Canvas elements
        this.canvas = null;
        this.ctx = null;
        
        // Canvas data
        this.canvasData = null;
        this.tiles = new Map();
        this.tileSize = null;
        
        // Viewport (will be injected by viewport manager)
        this.viewport = null;
        
        // Performance throttling - EXACT SAME as canvas viewer
        this.renderRequested = false;
        this.lastRenderTime = 0;
        this.renderThrottleDelay = 16; // ~60fps
        
        // Display options - EXACT SAME as canvas viewer
        this.showGrid = true;
        this.showTileOutlines = false;
        this.showUserIndicators = true;
        
        // Animation support
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Performance optimization
        this.visibleTilesCache = null;
        this.visibleTilesCacheKey = null;
        
        // Bound methods for event handlers
        this.boundThrottledRender = this.throttledRender.bind(this);
        
        console.log('✅ CanvasRenderer initialized');
    }
    
    /**
     * SAFETY: Initialize with canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element for rendering
     */
    init(canvas) {
        if (!canvas) {
            throw new Error('CanvasRenderer.init() requires canvas element');
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Disable image smoothing for pixel art - EXACT SAME as canvas viewer
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        console.log('🔧 CanvasRenderer initialized with canvas');
    }
    
    /**
     * Set canvas data - EXACT SAME logic as canvas viewer
     * @param {Object} canvasData - Canvas configuration
     */
    setCanvasData(canvasData) {
        if (!canvasData || typeof canvasData !== 'object') {
            console.error('❌ Invalid canvas data provided:', canvasData);
            return;
        }
        
        this.canvasData = canvasData;
        
        // Update tile size from canvas data
        if (canvasData.tile_size) {
            this.tileSize = canvasData.tile_size;
            console.log(`🎨 Updated tile size: ${this.tileSize}`);
            
            // Clear tile cache when tile size changes
            this.clearVisibleTilesCache();
        } else {
            this.tileSize = 32; // Default fallback
        }
        
        // CRITICAL FIX: Pass canvas data to viewport manager for proper clamping
        if (this.viewport && this.viewport.setCanvasData) {
            this.viewport.setCanvasData(canvasData);
        }
        
        this.requestRender();
    }
    
    /**
     * Load tiles - EXACT SAME logic as canvas viewer
     * @param {Array} tiles - Array of tile data
     */
    loadTiles(tiles) {
        if (!Array.isArray(tiles)) {
            console.error('Invalid tiles data');
            return;
        }
        
        console.log(`🎨 Loading ${tiles.length} tiles for rendering`);
        
        // Clear existing tiles
        this.tiles.clear();
        
        // Add tiles to Map for quick lookup
        tiles.forEach(tile => {
            if (tile && tile.id) {
                this.tiles.set(tile.id, tile);
            }
        });
        
        // Clear cache and request render
        this.clearVisibleTilesCache();
        this.requestRender();
        
        console.log(`✅ Loaded ${this.tiles.size} tiles`);
    }
    
    /**
     * Add/update a single tile - EXACT SAME logic as canvas viewer
     * @param {Object} tile - Tile data
     */
    updateTile(tile) {
        if (!tile || !tile.id) {
            console.warn('⚠️ Invalid tile data for update:', tile);
            return;
        }
        
        // Update the tile in our tiles Map
        this.tiles.set(tile.id, tile);
        
        // Clear visible tiles cache to force re-render
        this.clearVisibleTilesCache();
        
        // Request immediate render to show the update
        this.requestRender();
    }
    
    /**
     * Set viewport reference for coordinate calculations
     * @param {Object} viewport - Viewport manager instance
     */
    setViewport(viewport) {
        this.viewport = viewport;
    }
    
    /**
     * EXACT SAME: Request a render with throttling for performance
     */
    requestRender() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.boundThrottledRender);
        }
    }
    
    /**
     * EXACT SAME: Throttled render function
     */
    throttledRender() {
        try {
            const now = performance.now();
            if (now - this.lastRenderTime >= this.renderThrottleDelay) {
                this.renderDirect();
                this.lastRenderTime = now;
            }
        } catch (error) {
            console.error('Error in throttled render:', error);
        } finally {
            this.renderRequested = false;
        }
    }
    
    /**
     * EXACT SAME: Direct render without throttling (for animations)
     */
    renderDirect() {
        try {
            this.render();
        } catch (error) {
            console.error('Error in render:', error);
        }
    }
    
    /**
     * EXACT SAME: Main render function with error handling
     */
    render() {
        if (!this.canvas || !this.ctx || !this.viewport) return;
        
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw background (outside canvas area) - EXACT SAME as original
            this.ctx.fillStyle = '#e5e7eb';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Exit early if no canvas data
            if (!this.canvasData) {
                // Draw loading message
                this.ctx.fillStyle = '#666';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Loading canvas...', this.canvas.width / 2, this.canvas.height / 2);
                return;
            }
            
            // Save context for viewport transformations
            this.ctx.save();
            
            // Apply viewport transformation - EXACT SAME as canvas viewer
            const viewportState = this.viewport.getViewport();
            this.ctx.translate(-viewportState.x * viewportState.zoom, -viewportState.y * viewportState.zoom);
            this.ctx.scale(viewportState.zoom, viewportState.zoom);
            
            // Draw canvas background (inside canvas area)
            this.drawCanvasBackground();
            
            // Draw canvas boundaries
            this.drawCanvasBoundaries();
            
            // Draw grid if enabled
            if (this.showGrid) {
                this.drawGrid();
            }
            
            // Draw empty tile indicators
            this.drawEmptyTileIndicators();
            
            // Draw tiles
            this.drawTiles();
            
            // Draw tile outlines if enabled
            if (this.showTileOutlines) {
                this.drawTileOutlines();
            }
            
            // Draw user indicators if enabled
            if (this.showUserIndicators) {
                this.drawUserIndicators();
            }
            
            // Restore context
            this.ctx.restore();
            
            // NOTE: Viewport info now handled by dedicated debug manager
            
        } catch (error) {
            console.error('Error in render function:', error);
            // Try to recover by clearing the canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * EXACT SAME: Draw canvas background
     */
    drawCanvasBackground() {
        if (!this.canvasData) return;
        
        // Draw light background for canvas area - EXACT SAME as original
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvasData.width, this.canvasData.height);
        
        // Add subtle texture pattern - EXACT SAME as original
        this.ctx.fillStyle = '#f8fafc';
        const patternSize = 8;
        for (let x = 0; x < this.canvasData.width; x += patternSize * 2) {
            for (let y = 0; y < this.canvasData.height; y += patternSize * 2) {
                this.ctx.fillRect(x, y, patternSize, patternSize);
                this.ctx.fillRect(x + patternSize, y + patternSize, patternSize, patternSize);
            }
        }
    }
    
    /**
     * EXACT SAME: Draw canvas boundaries
     */
    drawCanvasBoundaries() {
        if (!this.canvasData) return;
        
        // Draw border around canvas
        this.ctx.strokeStyle = '#dee2e6';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvasData.width, this.canvasData.height);
    }
    
    /**
     * EXACT SAME: Draw empty tile indicators
     */
    drawEmptyTileIndicators() {
        if (!this.canvasData) return;
        
        const viewportState = this.viewport.getViewport();
        if (viewportState.zoom < 0.5) return; // Only show at reasonable zoom levels
        
        // Validate tileSize is set before drawing empty tile indicators
        if (!this.tileSize) {
            console.error('❌ Cannot draw empty tile indicators: tileSize not set');
            return;
        }
        
        const maxTilesX = Math.floor(this.canvasData.width / this.tileSize);
        const maxTilesY = Math.floor(this.canvasData.height / this.tileSize);
        
        // Calculate visible tile bounds - EXACT SAME as original
        const visibleBounds = this.getVisibleTileBounds();
        const startTileX = Math.max(0, visibleBounds.minX);
        const startTileY = Math.max(0, visibleBounds.minY);
        const endTileX = Math.min(maxTilesX, visibleBounds.maxX + 1);
        const endTileY = Math.min(maxTilesY, visibleBounds.maxY + 1);
        
        // Draw empty tile indicators - EXACT SAME style as original
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 1 / viewportState.zoom;
        this.ctx.globalAlpha = 0.3;
        
        for (let tileX = startTileX; tileX < endTileX; tileX++) {
            for (let tileY = startTileY; tileY < endTileY; tileY++) {
                // Check if tile exists
                const tileExists = Array.from(this.tiles.values()).some(tile => 
                    tile.x === tileX && tile.y === tileY
                );
                
                if (!tileExists) {
                    const x = tileX * this.tileSize;
                    const y = tileY * this.tileSize;
                    
                    // Draw empty tile outline with dashed lines - EXACT SAME as original
                    this.ctx.setLineDash([5 / viewportState.zoom, 5 / viewportState.zoom]);
                    this.ctx.beginPath();
                    this.ctx.rect(x, y, this.tileSize, this.tileSize);
                    this.ctx.stroke();
                    
                    // Draw plus sign in center if zoom is high enough - EXACT SAME as original
                    if (viewportState.zoom > 0.8) {
                        this.ctx.setLineDash([]);
                        this.ctx.strokeStyle = '#9ca3af';
                        this.ctx.lineWidth = 2 / viewportState.zoom;
                        this.ctx.globalAlpha = 0.2;
                        
                        const centerX = x + this.tileSize / 2;
                        const centerY = y + this.tileSize / 2;
                        const plusSize = Math.min(this.tileSize * 0.2, 10 / viewportState.zoom);
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX - plusSize, centerY);
                        this.ctx.lineTo(centerX + plusSize, centerY);
                        this.ctx.moveTo(centerX, centerY - plusSize);
                        this.ctx.lineTo(centerX, centerY + plusSize);
                        this.ctx.stroke();
                        
                        // Reset stroke style for next tile
                        this.ctx.strokeStyle = '#d1d5db';
                        this.ctx.globalAlpha = 0.3;
                    }
                }
            }
        }
        
        // Reset drawing state
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * EXACT SAME: Draw grid
     */
    drawGrid() {
        if (!this.canvasData) return;
        
        // Validate tileSize is set before drawing grid
        if (!this.tileSize) {
            console.error('❌ Cannot draw grid: tileSize not set');
            return;
        }
        
        // Only draw grid within canvas boundaries
        const maxTilesX = Math.floor(this.canvasData.width / this.tileSize);
        const maxTilesY = Math.floor(this.canvasData.height / this.tileSize);
        
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= maxTilesX; x++) {
            const xPos = x * this.tileSize;
            if (xPos <= this.canvasData.width) {
                this.ctx.beginPath();
                this.ctx.moveTo(xPos, 0);
                this.ctx.lineTo(xPos, this.canvasData.height);
                this.ctx.stroke();
            }
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= maxTilesY; y++) {
            const yPos = y * this.tileSize;
            if (yPos <= this.canvasData.height) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, yPos);
                this.ctx.lineTo(this.canvasData.width, yPos);
                this.ctx.stroke();
            }
        }
    }
    
    /**
     * EXACT SAME: Draw tiles
     */
    drawTiles() {
        // Get visible tiles once and reuse
        const visibleTiles = this.getVisibleTiles();
        
        // Limit tile drawing for performance
        const maxTilesToDraw = 500;
        const tilesToDraw = visibleTiles.slice(0, maxTilesToDraw);
        
        if (visibleTiles.length > maxTilesToDraw) {
            console.warn(`Too many tiles to draw (${visibleTiles.length}), limiting to ${maxTilesToDraw}`);
        }
        
        tilesToDraw.forEach(tile => {
            this.drawTile(tile);
        });
    }
    
    /**
     * EXACT SAME: Draw a single tile
     * @param {Object} tile - Tile data
     */
    drawTile(tile) {
        if (!tile.pixel_data) {
            console.log(`🎨 Skipping tile (${tile.x}, ${tile.y}) - no pixel data`);
            return;
        }
        
        // Validate tileSize is set before drawing
        if (!this.tileSize) {
            console.error('❌ Cannot draw tile: tileSize not set. Canvas data may not be loaded yet.');
            return;
        }
        
        try {
            const x = tile.x * this.tileSize;
            const y = tile.y * this.tileSize;
            
            const pixelData = Array.isArray(tile.pixel_data) ? tile.pixel_data : JSON.parse(tile.pixel_data);
            
            // Calculate pixel size based on tile size
            const pixelSize = this.tileSize / pixelData.length;
            
            let pixelsDrawn = 0;
            
            for (let py = 0; py < pixelData.length; py++) {
                for (let px = 0; px < (pixelData[py] ? pixelData[py].length : 0); px++) {
                    const color = pixelData[py] && pixelData[py][px];
                    if (color) {
                        let fillColor = color;
                        
                        // Handle RGBA array format [R,G,B,A] properly
                        if (Array.isArray(color) && color.length >= 3) {
                            const [r, g, b, a = 255] = color;
                            fillColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                        } else if (typeof color === 'string' && color.startsWith('#')) {
                            fillColor = color;
                        } else if (typeof color === 'string' && color !== 'transparent' && color !== 'white') {
                            fillColor = color;
                        }
                        
                        if (fillColor && fillColor !== 'transparent') {
                            this.ctx.fillStyle = fillColor;
                            this.ctx.fillRect(x + (px * pixelSize), y + (py * pixelSize), pixelSize, pixelSize);
                            pixelsDrawn++;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error drawing tile:', error);
            console.error('❌ Tile data:', tile);
        }
    }
    
    /**
     * EXACT SAME: Draw tile outlines
     */
    drawTileOutlines() {
        const visibleTiles = this.getVisibleTiles();
        
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        
        visibleTiles.forEach(tile => {
            const x = tile.x * this.tileSize;
            const y = tile.y * this.tileSize;
            this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        });
    }
    
    /**
     * EXACT SAME: Draw user indicators
     */
    drawUserIndicators() {
        const visibleTiles = this.getVisibleTiles();
        
        visibleTiles.forEach(tile => {
            if (tile.owner_name) {
                const x = tile.x * this.tileSize;
                const y = tile.y * this.tileSize;
                
                // Draw user indicator
                this.ctx.fillStyle = 'rgba(0, 123, 255, 0.3)';
                this.ctx.fillRect(x, y, this.tileSize, 4);
                
                // Draw username if zoom is high enough
                const viewportState = this.viewport.getViewport();
                if (viewportState.zoom > 1) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    this.ctx.font = '10px Arial';
                    this.ctx.fillText(tile.owner_name, x + 2, y + this.tileSize - 2);
                }
            }
        });
    }
    

    
    /**
     * Get visible tiles for rendering optimization
     * @returns {Array} Array of visible tiles
     */
    getVisibleTiles() {
        if (!this.viewport || !this.canvasData || !this.tileSize) {
            return [];
        }
        
        // Create cache key
        const viewportState = this.viewport.getViewport();
        const cacheKey = `${viewportState.x}-${viewportState.y}-${viewportState.zoom}-${this.tiles.size}`;
        
        // Return cached result if available
        if (this.visibleTilesCacheKey === cacheKey && this.visibleTilesCache) {
            return this.visibleTilesCache;
        }
        
        // Calculate visible bounds
        const bounds = this.getVisibleTileBounds();
        
        // Filter tiles within visible bounds
        const visibleTiles = Array.from(this.tiles.values()).filter(tile => {
            return tile.x >= bounds.minX && tile.x <= bounds.maxX &&
                   tile.y >= bounds.minY && tile.y <= bounds.maxY;
        });
        
        // Cache result
        this.visibleTilesCache = visibleTiles;
        this.visibleTilesCacheKey = cacheKey;
        
        return visibleTiles;
    }
    
    /**
     * Get visible tile bounds for optimization
     * @returns {Object} Bounds object with minX, maxX, minY, maxY
     */
    getVisibleTileBounds() {
        if (!this.viewport || !this.canvas || !this.tileSize) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const viewportState = this.viewport.getViewport();
        
        // Calculate visible world bounds
        const viewLeft = viewportState.x;
        const viewRight = viewportState.x + (rect.width / viewportState.zoom);
        const viewTop = viewportState.y;
        const viewBottom = viewportState.y + (rect.height / viewportState.zoom);
        
        // Convert to tile coordinates with padding
        const padding = 1;
        return {
            minX: Math.max(0, Math.floor(viewLeft / this.tileSize) - padding),
            maxX: Math.ceil(viewRight / this.tileSize) + padding,
            minY: Math.max(0, Math.floor(viewTop / this.tileSize) - padding),
            maxY: Math.ceil(viewBottom / this.tileSize) + padding
        };
    }
    
    /**
     * Clear visible tiles cache
     */
    clearVisibleTilesCache() {
        this.visibleTilesCache = null;
        this.visibleTilesCacheKey = null;
    }
    
    /**
     * Set display options
     * @param {Object} options - Display options
     */
    setDisplayOptions(options) {
        if (options.showGrid !== undefined) {
            this.showGrid = options.showGrid;
        }
        if (options.showTileOutlines !== undefined) {
            this.showTileOutlines = options.showTileOutlines;
        }
        if (options.showUserIndicators !== undefined) {
            this.showUserIndicators = options.showUserIndicators;
        }
        
        this.requestRender();
    }
    
    /**
     * Toggle grid display
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
        console.log(`🔧 Grid ${this.showGrid ? 'enabled' : 'disabled'}`);
        this.requestRender();
    }
    
    /**
     * Toggle user indicators
     */
    toggleUserIndicators() {
        this.showUserIndicators = !this.showUserIndicators;
        console.log(`🔧 User indicators ${this.showUserIndicators ? 'enabled' : 'disabled'}`);
        this.requestRender();
    }
    
    /**
     * Remove a tile
     * @param {number} tileId - Tile ID to remove
     * @param {boolean} animate - Whether to animate the removal
     */
    removeTile(tileId, animate = true) {
        if (!tileId) {
            console.error('❌ Invalid tile ID for removal:', tileId);
            return;
        }
        
        if (this.tiles.has(tileId)) {
            this.tiles.delete(tileId);
            console.log(`🔧 Removed tile ${tileId} from renderer`);
            
            // Clear cache and request render
            this.clearVisibleTilesCache();
            this.requestRender();
        } else {
            console.warn(`⚠️ Tile ${tileId} not found for removal`);
        }
    }
    
    /**
     * Emergency reset for error recovery
     */
    emergencyReset() {
        console.log('🚨 Emergency reset in CanvasRenderer');
        
        // Clear all tiles
        this.tiles.clear();
        
        // Reset display options
        this.showGrid = true;
        this.showTileOutlines = false;
        this.showUserIndicators = true;
        
        // Clear cache
        this.clearVisibleTilesCache();
        
        // Reset animation state
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Request render
        this.requestRender();
        
        console.log('✅ CanvasRenderer emergency reset complete');
    }
    
    /**
     * Cleanup method
     */
    cleanup() {
        console.log('🔧 Cleaning up CanvasRenderer...');
        
        // Clear references
        this.canvas = null;
        this.ctx = null;
        this.viewport = null;
        this.canvasData = null;
        this.tiles.clear();
        
        // Clear cache
        this.clearVisibleTilesCache();
        
        // Reset state
        this.renderRequested = false;
        this.isAnimating = false;
        
        console.log('✅ CanvasRenderer cleanup complete');
    }
}

export default CanvasRenderer;
