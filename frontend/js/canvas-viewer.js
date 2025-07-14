/**
 * Canvas Viewer for displaying shared collaborative canvas
 * Shows all user tiles with real-time updates
 */

class CanvasViewer {
    constructor() {
        // Canvas elements
        this.canvas = null;
        this.ctx = null;
        this.miniMap = null;
        this.miniMapCtx = null;
        
        // Canvas data
        this.canvasData = null;
        this.tiles = new Map();
        this.tileSize = 64;
        
        // Viewport
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;
        
        // Performance optimization
        this.visibleTilesCache = null;
        this.visibleTilesCacheKey = null;
        
        // Debug logging control
        this.debugLogCount = 0;
        
        // Debug overlay system
        this.debugOverlay = {
            enabled: false,
            canvas: null,
            ctx: null,
            hoverTile: null,
            clickedTile: null,
            mousePos: { x: 0, y: 0 },
            showCoordinates: true,
            showTileBoundaries: true,
            showClickDetection: true
        };
        
        // Interaction
        this.isDragging = false;
        this.dragButton = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Performance monitoring
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.lastMiddleClickTime = 0;
        this.lastCacheUpdate = Date.now();
        this.performanceIssues = [];
        
        // Performance cleanup interval
        this.performanceCleanupInterval = null;
        
        // Display options
        this.showGrid = true;
        this.showTileOutlines = false;
        this.showUserIndicators = true;
        
        // Animation
        this.animationQueue = [];
        this.isAnimating = false;
        
        // Performance throttling
        this.renderRequested = false;
        this.lastRenderTime = 0;
        this.renderThrottleDelay = 16; // ~60fps
        
        // Event callbacks
        this.onTileClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
        
        // Bind methods
        this.boundThrottledRender = this.throttledRender.bind(this);
        
        // Start performance cleanup interval (every 30 seconds)
        this.performanceCleanupInterval = setInterval(() => {
            this.cleanupPerformanceData();
        }, 30000);
        
        if (APP_CONFIG.DEBUG_CANVAS) {
            console.log('✅ Canvas viewer initialized');
        }
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
        this.requestRender();
        
        console.log('✅ Canvas viewer initialized');
    }
    
    /**
     * Setup event listeners for canvas interactions
     */
    setupEventListeners() {
        // Prevent context menu on right click and middle click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Mouse events for panning and zooming
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Document-level event listeners to catch events outside canvas
        document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
        document.addEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
        
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
        
        // Window events for cleanup
        window.addEventListener('blur', this.handleWindowBlur.bind(this));
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        e.preventDefault();
        
        // Track performance for middle mouse
        if (e.button === 1) { // Middle mouse
            const currentTime = performance.now();
            const timeSinceLastMiddleClick = currentTime - (this.lastMiddleClickTime || 0);
            
            // Check for rapid middle mouse clicks
            if (timeSinceLastMiddleClick < 50) {
                this.trackPerformanceIssue('Rapid middle mouse clicks - may cause performance issues');
                
                // Throttle middle mouse if too rapid
                if (timeSinceLastMiddleClick < 16) { // Less than one frame
                    return; // Skip this click
                }
            }
            
            this.lastMiddleClickTime = currentTime;
            
            // ONLY middle mouse button (1) enables canvas panning/scrolling
            this.isDragging = true;
            this.dragButton = e.button;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'move'; // Pan cursor for middle mouse
            
            // Prevent default for middle mouse to avoid scrolling
            e.preventDefault();
            e.stopPropagation();
        } else if (e.button === 0) {
            // Left mouse button - prepare for potential tile click (no dragging)
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            // Don't change cursor here - let hover system handle it
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        // Update debug overlay with mouse position
        if (this.debugOverlay.enabled) {
            this.updateDebugOverlay(e.clientX, e.clientY);
        }
        
        // Only allow panning/scrolling with middle mouse button
        if (this.isDragging && this.dragButton === 1) { // Only middle mouse
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            // Update viewport
            this.viewportX -= deltaX / this.zoom;
            this.viewportY -= deltaY / this.zoom;
            
            // Clamp viewport to prevent extreme values
            this.clampViewport();
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.requestRender();
            
            if (this.onViewportChange) {
                this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
            }
        } else if (!this.isDragging) {
            // Update cursor immediately for responsive feedback
            this.updateCursor(e);
            
            // Handle hover for tile detection callback (throttled)
            this.throttledHover(e);
        }
    }
    
    /**
     * Update cursor immediately based on current mouse position
     * @param {MouseEvent} e - Mouse event
     */
    updateCursor(e) {
        if (this.isDragging) {
            // Don't change cursor while dragging
            return;
        }
        
        try {
            const tile = this.getTileAtPosition(e.clientX, e.clientY);
            this.canvas.style.cursor = tile ? 'pointer' : 'default';
        } catch (error) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Throttled hover handling to prevent performance issues
     * @param {MouseEvent} e - Mouse event
     */
    throttledHover = (() => {
        let timeout = null;
        let lastHoverTime = 0;
        const hoverDelay = 100;
        
        return (e) => {
            const now = performance.now();
            if (now - lastHoverTime < hoverDelay) return;
            
            if (timeout) {
                clearTimeout(timeout);
            }
            
            timeout = setTimeout(() => {
                try {
                    const tile = this.getTileAtPosition(e.clientX, e.clientY);
                    
                    // Call hover callback if tile found
            if (tile && this.onTileHover) {
                this.onTileHover(tile);
            }
                } catch (error) {
                    console.error('Error in hover handler:', error);
                }
                timeout = null;
                lastHoverTime = performance.now();
            }, hoverDelay);
        };
    })();
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        const clickTime = performance.now();
        const timeSinceLastClick = clickTime - this.lastClickTime;
        
        // Track performance issues with middle mouse
        if (e.button === 1 && timeSinceLastClick < 100) {
            this.trackPerformanceIssue('Rapid middle mouse clicks detected');
        }
        
        if (e.button === 1 && this.isDragging) {
            // End middle mouse dragging
            this.isDragging = false;
            this.dragButton = null;
            this.canvas.style.cursor = 'default';
        } else if (e.button === 0) {
            // Left mouse button - handle tile click ONLY if mouse didn't move much
            const deltaX = Math.abs(e.clientX - this.lastMouseX);
            const deltaY = Math.abs(e.clientY - this.lastMouseY);
            
            // Only register as click if mouse didn't move much (< 5 pixels)
            if (deltaX < 5 && deltaY < 5) {
                try {
                    const tile = this.getTileAtPosition(e.clientX, e.clientY);
                    if (tile && this.onTileClick) {
                        // Track click performance
                        this.clickCount++;
                        this.lastClickTime = clickTime;
                        
                        // Update debug overlay
                        if (this.debugOverlay.enabled) {
                            this.debugOverlay.clickedTile = tile;
                            this.updateDebugOverlay(e.clientX, e.clientY);
                        }
                        
                        // Always log tile clicks for debugging (use development check instead of undefined DEBUG_CANVAS)
                        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                            console.log('🎯 Tile clicked:', tile);
                        }
                        
                        this.onTileClick(tile);
                    } else if (!tile) {
                        // Log when clicking on empty space for debugging
                        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                            console.log('🎯 Clicked on empty space');
                        }
                    }
                } catch (error) {
                    console.error('Error in tile click handler:', error);
                    this.trackPerformanceIssue('Tile click handler error');
                }
            }
            
            // Let hover system handle cursor state
            // Don't force cursor to default here
        }
    }
    
    /**
     * Handle mouse leave event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseLeave(e) {
        // Keep dragging state if middle mouse is still pressed
        if (this.isDragging && this.dragButton === 1) {
            // Don't reset dragging if we're panning - let document events handle it
            return;
        }
        
        // Stop any dragging when mouse leaves canvas
        this.isDragging = false;
        this.dragButton = null;
        this.canvas.style.cursor = 'default';
    }
    
    /**
     * Handle mouse enter event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseEnter(e) {
        // Reset cursor to default when entering canvas
        if (!this.isDragging) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle document mouse up event (catches events outside canvas)
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentMouseUp(e) {
        // Only handle if we're currently dragging
        if (this.isDragging) {
            // End dragging regardless of which button was released
            this.isDragging = false;
            this.dragButton = null;
            this.canvas.style.cursor = 'default';
            
            // Log for debugging
            if (window.CONFIG_UTILS) {
                window.CONFIG_UTILS.debug('Drag ended outside canvas');
            }
        }
    }
    
    /**
     * Handle document mouse move event (for dragging outside canvas)
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentMouseMove(e) {
        // Only handle if we're currently dragging with middle mouse
        if (this.isDragging && this.dragButton === 1) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            // Update viewport
            this.viewportX -= deltaX / this.zoom;
            this.viewportY -= deltaY / this.zoom;
            
            // Clamp viewport to prevent extreme values
            this.clampViewport();
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            this.requestRender();
            
            if (this.onViewportChange) {
                this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
            }
        }
    }
    
    /**
     * Handle window blur event (cleanup when window loses focus)
     * @param {Event} e - Blur event
     */
    handleWindowBlur(e) {
        // Reset all interaction states when window loses focus
        this.isDragging = false;
        this.dragButton = null;
        this.canvas.style.cursor = 'default';
        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.debug('Window blur - resetting canvas state');
        }
    }
    
    /**
     * Handle window focus event
     * @param {Event} e - Focus event
     */
    handleWindowFocus(e) {
        // Ensure cursor is default when window regains focus
        if (!this.isDragging) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle wheel event for zooming
     * @param {WheelEvent} e - Wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        try {
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
            
                // Clamp viewport to reasonable bounds
                this.clampViewport();
                
                this.requestRender();
            this.updateZoomIndicator();
            
            if (this.onViewportChange) {
                this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
            }
        }
        } catch (error) {
            console.error('Error in wheel handler:', error);
        }
    }
    
    /**
     * Clamp viewport to reasonable bounds to prevent performance issues
     */
    clampViewport() {
        const maxBound = 100000; // Prevent extremely large viewport values
        this.viewportX = Math.max(-maxBound, Math.min(maxBound, this.viewportX));
        this.viewportY = Math.max(-maxBound, Math.min(maxBound, this.viewportY));
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
        
        this.requestRender();
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
        // Handle escape key globally for emergency reset
        if (e.key === 'Escape') {
            e.preventDefault();
            this.emergencyReset();
            return;
        }
        
        // Only handle other shortcuts when canvas is focused
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
        this.requestRender();
        this.updateMiniMap();
    }
    
    /**
     * Add a tile to the canvas
     * @param {Object} tile - Tile data
     * @param {boolean} animate - Whether to animate the addition
     */
    addTile(tile, animate = true) {
        if (!tile || !tile.id) {
            console.error('Invalid tile data');
            return;
        }
        
        this.tiles.set(tile.id, tile);
        this.clearVisibleTilesCache(); // Clear cache when tiles change
        
        if (animate) {
                this.animateTileCreation(tile);
        } else {
            this.requestRender();
        }
        
        if (APP_CONFIG.DEBUG_CANVAS) {
            console.log('Tile added:', tile.id);
        }
    }
    
    /**
     * Remove a tile from the canvas
     * @param {string} tileId - Tile ID to remove
     * @param {boolean} animate - Whether to animate the removal
     */
    removeTile(tileId, animate = true) {
        const tile = this.tiles.get(tileId);
        if (!tile) {
            console.warn('Tile not found:', tileId);
            return;
        }
        
        this.clearVisibleTilesCache(); // Clear cache when tiles change
        
        if (animate) {
            this.animateTileRemoval(tile);
        } else {
            this.tiles.delete(tileId);
            this.requestRender();
        }
        
        if (APP_CONFIG.DEBUG_CANVAS) {
            console.log('Tile removed:', tileId);
        }
    }
    
    /**
     * Load multiple tiles at once
     * @param {Array} tiles - Array of tile data
     */
    loadTiles(tiles) {
        if (!Array.isArray(tiles)) {
            console.error('Invalid tiles data');
            return;
        }
        
        tiles.forEach(tile => {
            this.tiles.set(tile.id, tile);
        });
        
        this.clearVisibleTilesCache(); // Clear cache when tiles change
        this.requestRender();
        
        if (APP_CONFIG.DEBUG_CANVAS) {
            console.log(`Loaded ${tiles.length} tiles`);
        }
    }
    
    /**
     * Get tile at screen position with optimized coordinate conversion
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object|null} Tile at position or null
     */
    getTileAtPosition(screenX, screenY) {
        if (!this.canvas) return null;
        
        try {
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = screenX - rect.left;
            const canvasY = screenY - rect.top;
            
            // Convert to world coordinates
            const worldX = (canvasX / this.zoom) + this.viewportX;
            const worldY = (canvasY / this.zoom) + this.viewportY;
            
            // Convert to tile coordinates
            const tileX = Math.floor(worldX / this.tileSize);
            const tileY = Math.floor(worldY / this.tileSize);
            
            // Only log coordinate conversion when actually debugging specific issues
            // Removed constant debug logging that causes console spam
            
            // Find tile at this position
            for (const [tileId, tile] of this.tiles) {
                if (tile.x === tileX && tile.y === tileY) {
                    return tile;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Error in getTileAtPosition:', error);
            return null;
        }
    }
    
    /**
     * Animation loop
     */
    animationLoop() {
        const deltaTime = 16; // ~60fps
        let needsRender = false;
        
        // Update animations
        this.animationQueue = this.animationQueue.filter(animation => {
            animation.progress += deltaTime;
            needsRender = true;
            
            if (animation.progress >= animation.duration) {
                // Animation complete
                if (animation.type === 'remove') {
                    this.tiles.delete(animation.tile.id);
                }
                return false;
            }
            
            return true;
        });
        
        // Only render if animations are actually running
        if (needsRender) {
            this.renderDirect(); // Direct render for animations to avoid throttling conflicts
        }
        
        // Continue animation loop
        if (this.animationQueue.length > 0) {
            requestAnimationFrame(() => this.animationLoop());
        } else {
            this.isAnimating = false;
        }
    }
    
    /**
     * Request a render with throttling for performance
     */
    requestRender() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.boundThrottledRender);
        }
    }
    
    /**
     * Throttled render function
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
     * Direct render without throttling (for animations)
     */
    renderDirect() {
        try {
            this.render();
        } catch (error) {
            console.error('Error in render:', error);
        }
    }
    
    /**
     * Main render function with error handling
     */
    render() {
        if (!this.canvas || !this.ctx) return;
        
        try {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
            // Draw background
            this.ctx.fillStyle = '#f0f0f0';
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
            
            // Apply transform
            this.ctx.save();
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
        
            // Restore transform
        this.ctx.restore();
        
        // Draw viewport info
        this.drawViewportInfo();
            
            // Update mini map
            this.updateMiniMap();
            
        } catch (error) {
            console.error('Error in render function:', error);
            // Try to recover by clearing the canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Render Error - Please Refresh', this.canvas.width / 2, this.canvas.height / 2);
        }
    }
    
    /**
     * Get tiles visible in current viewport with caching and performance limits
     * @returns {Array} Array of visible tiles
     */
    getVisibleTiles() {
        // Cache key based on viewport and zoom
        const cacheKey = `${Math.floor(this.viewportX)},${Math.floor(this.viewportY)},${this.zoom.toFixed(2)}`;
        
        // Return cached result if viewport hasn't changed significantly
        if (this.visibleTilesCache && this.visibleTilesCacheKey === cacheKey) {
            return this.visibleTilesCache;
        }
        
        const visibleTiles = [];
        const maxTiles = 1000; // Limit to prevent performance issues
        
        const startX = Math.floor(this.viewportX / this.tileSize);
        const startY = Math.floor(this.viewportY / this.tileSize);
        const endX = Math.ceil((this.viewportX + (this.canvas.width / this.zoom)) / this.tileSize);
        const endY = Math.ceil((this.viewportY + (this.canvas.height / this.zoom)) / this.tileSize);
        
        // Early exit if viewport is too large
        const viewportTileCount = (endX - startX) * (endY - startY);
        if (viewportTileCount > maxTiles) {
            console.warn(`Viewport too large (${viewportTileCount} tiles), limiting to ${maxTiles} tiles`);
        }
        
        let tileCount = 0;
        for (const [tileId, tile] of this.tiles) {
            if (tileCount >= maxTiles) break;
            
            if (tile.x >= startX && tile.x <= endX && 
                tile.y >= startY && tile.y <= endY) {
                visibleTiles.push(tile);
                tileCount++;
            }
        }
        
        // Cache the result
        this.visibleTilesCache = visibleTiles;
        this.visibleTilesCacheKey = cacheKey;
        
        return visibleTiles;
    }
    
    /**
     * Clear visible tiles cache (call when tiles change)
     */
    clearVisibleTilesCache() {
        this.visibleTilesCache = null;
        this.visibleTilesCacheKey = null;
        this.lastCacheUpdate = Date.now();
    }
    
    /**
     * Draw grid with performance optimization
     */
    drawGrid() {
        // Limit grid density at high zoom levels
        const maxGridLines = 100; // Maximum grid lines to draw
        const gridStep = Math.max(this.tileSize, this.tileSize * Math.ceil(1 / this.zoom));
        
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.globalAlpha = 0.3;
        
        // Calculate grid bounds
        const startX = Math.floor(this.viewportX / gridStep) * gridStep;
        const startY = Math.floor(this.viewportY / gridStep) * gridStep;
        const endX = this.viewportX + (this.canvas.width / this.zoom);
        const endY = this.viewportY + (this.canvas.height / this.zoom);
        
        // Draw vertical lines with limit
        let lineCount = 0;
        for (let x = startX; x <= endX && lineCount < maxGridLines; x += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.viewportY);
            this.ctx.lineTo(x, this.viewportY + (this.canvas.height / this.zoom));
            this.ctx.stroke();
            lineCount++;
        }
        
        // Draw horizontal lines with limit
        lineCount = 0;
        for (let y = startY; y <= endY && lineCount < maxGridLines; y += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.viewportX, y);
            this.ctx.lineTo(this.viewportX + (this.canvas.width / this.zoom), y);
            this.ctx.stroke();
            lineCount++;
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw all tiles with performance optimization
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
        this.requestRender();
        this.updateMiniMap();
        this.updateZoomIndicator();
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.requestRender();
        this.updateMiniMap();
        this.updateZoomIndicator();
    }
    
    /**
     * Reset zoom to 100%
     */
    resetZoom() {
        this.zoom = 1;
        this.requestRender();
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
        
        this.requestRender();
        this.updateMiniMap();
    }
    
    /**
     * Toggle grid visibility
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.requestRender();
        console.log(`Grid ${this.showGrid ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle tile outlines
     */
    toggleTileOutlines() {
        this.showTileOutlines = !this.showTileOutlines;
        this.requestRender();
        console.log(`Tile outlines ${this.showTileOutlines ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle user indicators
     */
    toggleUserIndicators() {
        this.showUserIndicators = !this.showUserIndicators;
        this.requestRender();
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
                null,
            performanceIssues: this.performanceIssues.length,
            clickCount: this.clickCount,
            cacheHits: this.visibleTilesCache ? 'active' : 'inactive'
        };
    }
    
    /**
     * Enable debug overlay
     * @param {HTMLCanvasElement} overlayCanvas - Debug overlay canvas
     */
    enableDebugOverlay(overlayCanvas = null) {
        this.debugOverlay.enabled = true;
        
        if (overlayCanvas) {
            this.debugOverlay.canvas = overlayCanvas;
            this.debugOverlay.ctx = overlayCanvas.getContext('2d');
            
            // Make overlay canvas match main canvas size
            overlayCanvas.width = this.canvas.width;
            overlayCanvas.height = this.canvas.height;
            
            // Style the overlay
            overlayCanvas.style.position = 'absolute';
            overlayCanvas.style.top = '0';
            overlayCanvas.style.left = '0';
            overlayCanvas.style.pointerEvents = 'none';
            overlayCanvas.style.zIndex = '1000';
        }
        
        console.log('🔍 Debug overlay enabled');
    }
    
    /**
     * Disable debug overlay
     */
    disableDebugOverlay() {
        this.debugOverlay.enabled = false;
        if (this.debugOverlay.canvas) {
            this.debugOverlay.ctx.clearRect(0, 0, this.debugOverlay.canvas.width, this.debugOverlay.canvas.height);
        }
        console.log('🔍 Debug overlay disabled');
    }
    
    /**
     * Update debug overlay with current mouse position
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position
     */
    updateDebugOverlay(mouseX, mouseY) {
        if (!this.debugOverlay.enabled || !this.debugOverlay.canvas) return;
        
        this.debugOverlay.mousePos = { x: mouseX, y: mouseY };
        this.renderDebugOverlay();
    }
    
    /**
     * Update hover info in debug overlay
     * @param {Object} tile - Tile being hovered
     */
    updateHoverInfo(tile) {
        if (!this.debugOverlay.enabled) return;
        this.debugOverlay.hoverTile = tile;
        this.renderDebugOverlay();
    }
    
    /**
     * Update viewport info in debug overlay
     * @param {number} x - Viewport X
     * @param {number} y - Viewport Y
     * @param {number} zoom - Zoom level
     */
    updateViewportInfo(x, y, zoom) {
        if (!this.debugOverlay.enabled) return;
        this.renderDebugOverlay();
    }
    
    /**
     * Render debug overlay
     */
    renderDebugOverlay() {
        if (!this.debugOverlay.enabled || !this.debugOverlay.ctx) return;
        
        const ctx = this.debugOverlay.ctx;
        const canvas = this.debugOverlay.canvas;
        
        // Clear overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw coordinate grid if enabled
        if (this.debugOverlay.showCoordinates) {
            this.drawCoordinateGrid(ctx);
        }
        
        // Draw tile boundaries if enabled
        if (this.debugOverlay.showTileBoundaries) {
            this.drawTileBoundaries(ctx);
        }
        
        // Draw click detection area if enabled
        if (this.debugOverlay.showClickDetection) {
            this.drawClickDetection(ctx);
        }
        
        // Draw debug info panel
        this.drawDebugInfoPanel(ctx);
    }
    
    /**
     * Draw coordinate grid on debug overlay
     * @param {CanvasRenderingContext2D} ctx - Debug overlay context
     */
    drawCoordinateGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        
        // Draw grid lines every 5 tiles
        const gridSpacing = this.tileSize * 5;
        const startX = Math.floor(this.viewportX / gridSpacing) * gridSpacing;
        const startY = Math.floor(this.viewportY / gridSpacing) * gridSpacing;
        const endX = this.viewportX + (this.canvas.width / this.zoom);
        const endY = this.viewportY + (this.canvas.height / this.zoom);
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSpacing) {
            const screenX = (x - this.viewportX) * this.zoom;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, this.canvas.height);
            ctx.stroke();
            
            // Label
            const tileX = Math.floor(x / this.tileSize);
            ctx.fillText(`${tileX}`, screenX + 2, 15);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSpacing) {
            const screenY = (y - this.viewportY) * this.zoom;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(this.canvas.width, screenY);
            ctx.stroke();
            
            // Label
            const tileY = Math.floor(y / this.tileSize);
            ctx.fillText(`${tileY}`, 2, screenY + 12);
        }
    }
    
    /**
     * Draw tile boundaries on debug overlay
     * @param {CanvasRenderingContext2D} ctx - Debug overlay context
     */
    drawTileBoundaries(ctx) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        
        // Draw boundaries for visible tiles
        const visibleTiles = this.getVisibleTiles();
        visibleTiles.forEach(tile => {
            const x = (tile.x * this.tileSize - this.viewportX) * this.zoom;
            const y = (tile.y * this.tileSize - this.viewportY) * this.zoom;
            const size = this.tileSize * this.zoom;
            
            ctx.beginPath();
            ctx.rect(x, y, size, size);
            ctx.stroke();
            
            // Label tile coordinates
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.font = '10px monospace';
            ctx.fillText(`(${tile.x},${tile.y})`, x + 2, y + 12);
        });
    }
    
    /**
     * Draw click detection visualization
     * @param {CanvasRenderingContext2D} ctx - Debug overlay context
     */
    drawClickDetection(ctx) {
        if (!this.debugOverlay.hoverTile) return;
        
        const tile = this.debugOverlay.hoverTile;
        const x = (tile.x * this.tileSize - this.viewportX) * this.zoom;
        const y = (tile.y * this.tileSize - this.viewportY) * this.zoom;
        const size = this.tileSize * this.zoom;
        
        // Highlight hovered tile
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(x, y, size, size);
        
        // Draw crosshair at mouse position
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.debugOverlay.mousePos.x - 10, this.debugOverlay.mousePos.y);
        ctx.lineTo(this.debugOverlay.mousePos.x + 10, this.debugOverlay.mousePos.y);
        ctx.moveTo(this.debugOverlay.mousePos.x, this.debugOverlay.mousePos.y - 10);
        ctx.lineTo(this.debugOverlay.mousePos.x, this.debugOverlay.mousePos.y + 10);
        ctx.stroke();
    }
    
    /**
     * Draw debug info panel
     * @param {CanvasRenderingContext2D} ctx - Debug overlay context
     */
    drawDebugInfoPanel(ctx) {
        const panelWidth = 300;
        const panelHeight = 200;
        const padding = 10;
        
        // Panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.canvas.width - panelWidth - padding, padding, panelWidth, panelHeight);
        
        // Panel border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.canvas.width - panelWidth - padding, padding, panelWidth, panelHeight);
        
        // Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '12px monospace';
        
        const textX = this.canvas.width - panelWidth - padding + 10;
        let textY = padding + 20;
        const lineHeight = 16;
        
        // Debug info
        const info = [
            `Viewport: (${this.viewportX.toFixed(1)}, ${this.viewportY.toFixed(1)})`,
            `Zoom: ${(this.zoom * 100).toFixed(1)}%`,
            `Tiles: ${this.tiles.size}`,
            `Click Count: ${this.clickCount}`,
            `Performance Issues: ${this.performanceIssues.length}`,
            `Cache: ${this.visibleTilesCache ? 'Active' : 'Inactive'}`,
            '',
            `Mouse: (${this.debugOverlay.mousePos.x}, ${this.debugOverlay.mousePos.y})`,
            this.debugOverlay.hoverTile ? 
                `Hover Tile: (${this.debugOverlay.hoverTile.x}, ${this.debugOverlay.hoverTile.y})` : 
                'Hover Tile: None',
            this.debugOverlay.clickedTile ? 
                `Last Click: (${this.debugOverlay.clickedTile.x}, ${this.debugOverlay.clickedTile.y})` : 
                'Last Click: None'
        ];
        
        info.forEach((line, index) => {
            ctx.fillText(line, textX, textY + (index * lineHeight));
        });
    }
    
    /**
     * Track performance issue for debugging
     * @param {string} issue - Description of the performance issue
     */
    trackPerformanceIssue(issue) {
        this.performanceIssues.push({
            issue: issue,
            timestamp: Date.now()
        });
        
        // Keep only last 100 issues
        if (this.performanceIssues.length > 100) {
            this.performanceIssues.shift();
        }
        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.throttledLog('warn', 'Performance issue:', issue);
        }
    }
    
    /**
     * Emergency reset method to fix stuck cursor/interaction states
     */
    emergencyReset() {
        // Reset all interaction states
        this.isDragging = false;
        this.dragButton = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Reset cursor
        this.canvas.style.cursor = 'default';
        
        // Clear any pending timeouts
        if (this.throttledHover.timeout) {
            clearTimeout(this.throttledHover.timeout);
        }
        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.safeLog('🚨 Emergency reset performed');
        }
    }
    
    /**
     * Remove event listeners (for cleanup)
     */
    removeEventListeners() {
        // Remove canvas event listeners
        this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
        
        // Remove document event listeners
        document.removeEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
        document.removeEventListener('mousemove', this.handleDocumentMouseMove.bind(this));
        
        // Remove window event listeners
        window.removeEventListener('blur', this.handleWindowBlur.bind(this));
        window.removeEventListener('focus', this.handleWindowFocus.bind(this));
        
        // Remove keyboard event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.safeLog('🧹 Event listeners removed');
        }
    }
    
    /**
     * Clean up performance data to prevent memory leaks
     */
    cleanupPerformanceData() {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        // Remove old performance issues
        this.performanceIssues = this.performanceIssues.filter(issue => 
            issue.timestamp > fiveMinutesAgo
        );
        
        // Reset counters
        this.clickCount = 0;
        this.debugLogCount = 0;
        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.safeLog('🧹 Performance data cleaned up');
        }
    }
}

// Create global instance
const canvasViewer = new CanvasViewer();

// Export for use in other modules
window.CanvasViewer = canvasViewer;

// Export emergency reset for debugging
window.emergencyResetCanvas = () => {
    if (window.CanvasViewer) {
        window.CanvasViewer.emergencyReset();
    }
};

// Integration with main app - wait for main app to set up callbacks
// The main app will set canvasViewer.onTileClick directly in initializeCanvasViewer()

// Default fallback behaviors
if (!canvasViewer.onTileClick) {
    canvasViewer.onTileClick = (tile) => {
        // Use throttled logging to prevent performance issues
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.safeLog(`Tile clicked: (${tile.x}, ${tile.y})`);
        }
        
        // Fallback - show tile info
        const tileInfo = `Tile: (${tile.x}, ${tile.y})`;
        if (window.showToast) {
            window.showToast(`Clicked ${tileInfo}`, 'info');
        } else {
            alert(`Clicked ${tileInfo}`);
        }
    };
}

if (!canvasViewer.onTileHover) {
    canvasViewer.onTileHover = (tile) => {
        // Only log hover in debug mode to prevent console spam
        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment && window.CONFIG_UTILS) {
            window.CONFIG_UTILS.debug('Tile hover:', tile);
        }
        
        // Update coordinate display if debug overlay is enabled
        if (canvasViewer.debugOverlay && canvasViewer.debugOverlay.enabled) {
            canvasViewer.debugOverlay.updateHoverInfo(tile);
        }
    };
}

if (!canvasViewer.onViewportChange) {
    canvasViewer.onViewportChange = (x, y, zoom) => {
        // Only log viewport changes in debug mode to prevent console spam
        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment && window.CONFIG_UTILS) {
            window.CONFIG_UTILS.debug('Viewport changed:', { x, y, zoom });
        }
        
        // Update debug overlay if enabled
        if (canvasViewer.debugOverlay && canvasViewer.debugOverlay.enabled) {
            canvasViewer.debugOverlay.updateViewportInfo(x, y, zoom);
        }
    };
}

console.log('✅ Canvas viewer loaded'); 