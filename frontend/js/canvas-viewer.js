/**
 * Canvas Viewer for displaying shared collaborative canvas
 * Shows all user tiles with real-time updates
 */

class CanvasViewer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.miniMap = null;
        this.miniMapCtx = null;
        this.canvasData = null;
        this.tiles = new Map(); // Map of tile_id -> tile data
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.tileSize = 32;
        this.gridSize = 32;
        this.showGrid = true;
        this.showTileOutlines = true;
        this.showUserIndicators = true;
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Event handlers
        this.onTileClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
    }
    
    /**
     * Initialize the canvas viewer
     * @param {HTMLCanvasElement} canvas - Main canvas element
     * @param {HTMLCanvasElement} miniMap - Mini map canvas element
     */
    init(canvas, miniMap) {
        if (!canvas) {
            console.error('Canvas element not provided');
            return;
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        if (miniMap) {
            this.miniMap = miniMap;
            this.miniMapCtx = miniMap.getContext('2d');
        }
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        if (this.miniMap) {
            this.miniMap.width = 200;
            this.miniMap.height = 150;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial render
        this.render();
        
        console.log('✅ Canvas viewer initialized');
    }
    
    /**
     * Setup event listeners for canvas interactions
     */
    setupEventListeners() {
        // Mouse events for panning and zooming
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Mini map events
        if (this.miniMap) {
            this.miniMap.addEventListener('click', this.handleMiniMapClick.bind(this));
        }
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        if (e.button === 0) { // Left mouse button
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.viewportX -= deltaX / this.zoom;
            this.viewportY -= deltaY / this.zoom;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.render();
            this.updateMiniMap();
            
            if (this.onViewportChange) {
                this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
            }
        } else {
            // Handle tile hover
            const tile = this.getTileAtPosition(e.clientX, e.clientY);
            if (tile && this.onTileHover) {
                this.onTileHover(tile);
            }
        }
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        if (e.button === 0) { // Left mouse button
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
            
            // Handle tile click
            const tile = this.getTileAtPosition(e.clientX, e.clientY);
            if (tile && this.onTileClick) {
                this.onTileClick(tile);
            }
        }
    }
    
    /**
     * Handle mouse leave event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseLeave(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }
    
    /**
     * Handle wheel event for zooming
     * @param {WheelEvent} e - Wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * delta));
        
        if (newZoom !== this.zoom) {
            // Zoom towards mouse position
            const worldX = (mouseX / this.zoom) + this.viewportX;
            const worldY = (mouseY / this.zoom) + this.viewportY;
            
            this.zoom = newZoom;
            
            this.viewportX = worldX - (mouseX / this.zoom);
            this.viewportY = worldY - (mouseY / this.zoom);
            
            this.render();
            this.updateMiniMap();
            this.updateZoomIndicator();
            
            if (this.onViewportChange) {
                this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
            }
        }
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0
            });
            this.handleMouseDown(mouseEvent);
        }
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        }
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        const mouseEvent = new MouseEvent('mouseup', {
            button: 0
        });
        this.handleMouseUp(mouseEvent);
    }
    
    /**
     * Handle mini map click
     * @param {MouseEvent} e - Mouse event
     */
    handleMiniMapClick(e) {
        if (!this.miniMap || !this.canvasData) return;
        
        const rect = this.miniMap.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Convert mini map coordinates to world coordinates
        const scaleX = this.canvasData.width / this.miniMap.width;
        const scaleY = this.canvasData.height / this.miniMap.height;
        
        const worldX = clickX * scaleX;
        const worldY = clickY * scaleY;
        
        // Center viewport on clicked position
        this.viewportX = worldX - (this.canvas.width / this.zoom / 2);
        this.viewportY = worldY - (this.canvas.height / this.zoom / 2);
        
        this.render();
        this.updateMiniMap();
        
        if (this.onViewportChange) {
            this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
        }
    }
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Only handle shortcuts when canvas is focused
        if (document.activeElement !== this.canvas) return;
        
        switch (e.key) {
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
                e.preventDefault();
                this.zoomOut();
                break;
            case '0':
                e.preventDefault();
                this.resetZoom();
                break;
            case 'Home':
                e.preventDefault();
                this.centerView();
                break;
            case 'g':
                e.preventDefault();
                this.toggleGrid();
                break;
            case 'o':
                e.preventDefault();
                this.toggleTileOutlines();
                break;
            case 'u':
                e.preventDefault();
                this.toggleUserIndicators();
                break;
        }
    }
    
    /**
     * Set canvas data
     * @param {Object} canvasData - Canvas configuration
     */
    setCanvasData(canvasData) {
        this.canvasData = canvasData;
        this.centerView();
        this.render();
        this.updateMiniMap();
    }
    
    /**
     * Add or update a tile
     * @param {Object} tile - Tile data
     * @param {boolean} animate - Whether to animate the addition
     */
    addTile(tile, animate = true) {
        const tileId = tile.id;
        const existingTile = this.tiles.get(tileId);
        
        this.tiles.set(tileId, tile);
        
        if (animate) {
            if (existingTile) {
                this.animateTileUpdate(tile);
            } else {
                this.animateTileCreation(tile);
            }
        } else {
            this.render();
        }
    }
    
    /**
     * Remove a tile
     * @param {number} tileId - Tile ID
     * @param {boolean} animate - Whether to animate the removal
     */
    removeTile(tileId, animate = true) {
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        if (animate) {
            this.animateTileRemoval(tile);
        } else {
            this.tiles.delete(tileId);
            this.render();
        }
    }
    
    /**
     * Load multiple tiles
     * @param {Array} tiles - Array of tile data
     */
    loadTiles(tiles) {
        this.tiles.clear();
        
        tiles.forEach(tile => {
            this.tiles.set(tile.id, tile);
        });
        
        this.render();
        this.updateMiniMap();
    }
    
    /**
     * Get tile at screen position
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object|null} Tile data or null
     */
    getTileAtPosition(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        // Convert to world coordinates
        const worldX = (canvasX / this.zoom) + this.viewportX;
        const worldY = (canvasY / this.zoom) + this.viewportY;
        
        // Convert to tile coordinates
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        // Find tile at position
        for (const [tileId, tile] of this.tiles) {
            if (tile.x === tileX && tile.y === tileY) {
                return tile;
            }
        }
        
        return null;
    }
    
    /**
     * Render the canvas
     */
    render() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set background
        this.ctx.fillStyle = APP_CONFIG.CANVAS.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply viewport transformation
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.viewportX, -this.viewportY);
        
        // Draw grid if enabled
        if (this.showGrid) {
            this.drawGrid();
        }
        
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
        
        // Restore context state
        this.ctx.restore();
        
        // Draw viewport info
        this.drawViewportInfo();
    }
    
    /**
     * Draw grid
     */
    drawGrid() {
        if (!this.canvasData) return;
        
        this.ctx.strokeStyle = APP_CONFIG.CANVAS.GRID_COLOR;
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.globalAlpha = 0.3;
        
        const startX = Math.floor(this.viewportX / this.tileSize) * this.tileSize;
        const startY = Math.floor(this.viewportY / this.tileSize) * this.tileSize;
        const endX = this.viewportX + (this.canvas.width / this.zoom);
        const endY = this.viewportY + (this.canvas.height / this.zoom);
        
        // Draw vertical lines
        for (let x = startX; x <= endX; x += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.viewportY);
            this.ctx.lineTo(x, this.viewportY + (this.canvas.height / this.zoom));
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = startY; y <= endY; y += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.viewportX, y);
            this.ctx.lineTo(this.viewportX + (this.canvas.width / this.zoom), y);
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw all tiles
     */
    drawTiles() {
        // Only draw tiles visible in viewport
        const visibleTiles = this.getVisibleTiles();
        
        visibleTiles.forEach(tile => {
            this.drawTile(tile);
        });
    }
    
    /**
     * Draw a single tile
     * @param {Object} tile - Tile data
     */
    drawTile(tile) {
        if (!tile.pixel_data) return;
        
        const x = tile.x * this.tileSize;
        const y = tile.y * this.tileSize;
        
        try {
            // Parse pixel data
            const pixelData = typeof tile.pixel_data === 'string' 
                ? JSON.parse(tile.pixel_data) 
                : tile.pixel_data;
            
            // Draw each pixel
            const pixelSize = this.tileSize / 32; // 32x32 pixel grid
            
            for (let py = 0; py < 32; py++) {
                for (let px = 0; px < 32; px++) {
                    const color = pixelData[py] && pixelData[py][px];
                    if (color && color !== 'transparent') {
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(
                            x + (px * pixelSize),
                            y + (py * pixelSize),
                            pixelSize,
                            pixelSize
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error drawing tile:', error);
            
            // Draw placeholder
            this.ctx.fillStyle = '#f0f0f0';
            this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
            
            this.ctx.fillStyle = '#999';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Error', x + this.tileSize/2, y + this.tileSize/2);
        }
    }
    
    /**
     * Draw tile outlines
     */
    drawTileOutlines() {
        const visibleTiles = this.getVisibleTiles();
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2 / this.zoom;
        this.ctx.globalAlpha = 0.5;
        
        visibleTiles.forEach(tile => {
            const x = tile.x * this.tileSize;
            const y = tile.y * this.tileSize;
            
            this.ctx.beginPath();
            this.ctx.rect(x, y, this.tileSize, this.tileSize);
            this.ctx.stroke();
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw user indicators
     */
    drawUserIndicators() {
        const visibleTiles = this.getVisibleTiles();
        
        visibleTiles.forEach(tile => {
            if (tile.creator_username) {
                const x = tile.x * this.tileSize;
                const y = tile.y * this.tileSize;
                
                // Draw user indicator
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(x, y, 60, 16);
                
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(tile.creator_username, x + 2, y + 12);
            }
        });
    }
    
    /**
     * Get tiles visible in current viewport
     * @returns {Array} Array of visible tiles
     */
    getVisibleTiles() {
        const visibleTiles = [];
        
        const startX = Math.floor(this.viewportX / this.tileSize);
        const startY = Math.floor(this.viewportY / this.tileSize);
        const endX = Math.ceil((this.viewportX + (this.canvas.width / this.zoom)) / this.tileSize);
        const endY = Math.ceil((this.viewportY + (this.canvas.height / this.zoom)) / this.tileSize);
        
        for (const [tileId, tile] of this.tiles) {
            if (tile.x >= startX && tile.x <= endX && 
                tile.y >= startY && tile.y <= endY) {
                visibleTiles.push(tile);
            }
        }
        
        return visibleTiles;
    }
    
    /**
     * Draw viewport info
     */
    drawViewportInfo() {
        // Draw zoom level
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 80, 20);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Zoom: ${Math.round(this.zoom * 100)}%`, 15, 25);
        
        // Draw tile count
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 35, 100, 20);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Tiles: ${this.tiles.size}`, 15, 50);
    }
    
    /**
     * Update mini map
     */
    updateMiniMap() {
        if (!this.miniMap || !this.miniMapCtx || !this.canvasData) return;
        
        // Clear mini map
        this.miniMapCtx.clearRect(0, 0, this.miniMap.width, this.miniMap.height);
        
        // Draw mini map background
        this.miniMapCtx.fillStyle = APP_CONFIG.CANVAS.BACKGROUND_COLOR;
        this.miniMapCtx.fillRect(0, 0, this.miniMap.width, this.miniMap.height);
        
        // Calculate scale
        const scaleX = this.miniMap.width / this.canvasData.width;
        const scaleY = this.miniMap.height / this.canvasData.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Draw tiles on mini map
        this.miniMapCtx.fillStyle = '#6366f1';
        for (const [tileId, tile] of this.tiles) {
            const x = tile.x * this.tileSize * scale;
            const y = tile.y * this.tileSize * scale;
            const size = this.tileSize * scale;
            
            this.miniMapCtx.fillRect(x, y, Math.max(1, size), Math.max(1, size));
        }
        
        // Draw viewport indicator
        const viewportX = this.viewportX * scale;
        const viewportY = this.viewportY * scale;
        const viewportWidth = (this.canvas.width / this.zoom) * scale;
        const viewportHeight = (this.canvas.height / this.zoom) * scale;
        
        this.miniMapCtx.strokeStyle = '#ff4444';
        this.miniMapCtx.lineWidth = 2;
        this.miniMapCtx.beginPath();
        this.miniMapCtx.rect(viewportX, viewportY, viewportWidth, viewportHeight);
        this.miniMapCtx.stroke();
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom * 1.2);
        this.render();
        this.updateMiniMap();
        this.updateZoomIndicator();
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.render();
        this.updateMiniMap();
        this.updateZoomIndicator();
    }
    
    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        this.zoom = 1;
        this.render();
        this.updateMiniMap();
        this.updateZoomIndicator();
    }
    
    /**
     * Center view on canvas
     */
    centerView() {
        if (!this.canvasData) return;
        
        this.viewportX = (this.canvasData.width - (this.canvas.width / this.zoom)) / 2;
        this.viewportY = (this.canvasData.height - (this.canvas.height / this.zoom)) / 2;
        
        this.render();
        this.updateMiniMap();
    }
    
    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.render();
        console.log(`Grid ${this.showGrid ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle tile outlines
     */
    toggleTileOutlines() {
        this.showTileOutlines = !this.showTileOutlines;
        this.render();
        console.log(`Tile outlines ${this.showTileOutlines ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle user indicators
     */
    toggleUserIndicators() {
        this.showUserIndicators = !this.showUserIndicators;
        this.render();
        console.log(`User indicators ${this.showUserIndicators ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update zoom indicator in UI
     */
    updateZoomIndicator() {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }
    
    /**
     * Animate tile creation
     * @param {Object} tile - Tile data
     */
    animateTileCreation(tile) {
        this.animationQueue.push({
            type: 'create',
            tile: tile,
            progress: 0,
            duration: 500
        });
        
        this.startAnimation();
    }
    
    /**
     * Animate tile update
     * @param {Object} tile - Tile data
     */
    animateTileUpdate(tile) {
        this.animationQueue.push({
            type: 'update',
            tile: tile,
            progress: 0,
            duration: 300
        });
        
        this.startAnimation();
    }
    
    /**
     * Animate tile removal
     * @param {Object} tile - Tile data
     */
    animateTileRemoval(tile) {
        this.animationQueue.push({
            type: 'remove',
            tile: tile,
            progress: 0,
            duration: 400
        });
        
        this.startAnimation();
    }
    
    /**
     * Start animation loop
     */
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationLoop();
    }
    
    /**
     * Animation loop
     */
    animationLoop() {
        const deltaTime = 16; // ~60fps
        
        // Update animations
        this.animationQueue = this.animationQueue.filter(animation => {
            animation.progress += deltaTime;
            
            if (animation.progress >= animation.duration) {
                // Animation complete
                if (animation.type === 'remove') {
                    this.tiles.delete(animation.tile.id);
                }
                return false;
            }
            
            return true;
        });
        
        // Render with animations
        this.render();
        
        // Continue animation loop
        if (this.animationQueue.length > 0) {
            requestAnimationFrame(() => this.animationLoop());
        } else {
            this.isAnimating = false;
        }
    }
    
    /**
     * Get canvas statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            tileCount: this.tiles.size,
            viewportX: this.viewportX,
            viewportY: this.viewportY,
            zoom: this.zoom,
            canvasSize: this.canvasData ? 
                { width: this.canvasData.width, height: this.canvasData.height } : 
                null
        };
    }
}

// Create global instance
const canvasViewer = new CanvasViewer();

// Export for use in other modules
window.CanvasViewer = canvasViewer;

// Integration with main app
if (window.StellarCollabApp) {
    canvasViewer.onTileClick = (tile) => {
        console.log('Tile clicked:', tile);
        // Could open tile details modal
    };
    
    canvasViewer.onTileHover = (tile) => {
        // Show tile info tooltip
        console.log('Tile hover:', tile);
    };
    
    canvasViewer.onViewportChange = (x, y, zoom) => {
        console.log('Viewport changed:', { x, y, zoom });
    };
}

console.log('✅ Canvas viewer loaded'); 