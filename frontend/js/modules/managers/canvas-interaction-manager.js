/**
 * Canvas Interaction Manager - EXTRACTED FROM CANVAS VIEWER
 * 
 * SAFETY CRITICAL: This manager handles all user input interactions.
 * It uses the EXACT SAME interaction logic as the working canvas viewer.
 * 
 * Key Functions:
 * - Mouse event handling (click, drag, wheel)
 * - Touch event handling (pan, pinch, tap)
 * - Keyboard event handling
 * - Coordinate conversion for tile detection
 * - Gesture recognition and state management
 */

export class CanvasInteractionManager {
    constructor(eventManager) {
        console.log('🔧 CanvasInteractionManager initializing...');
        
        // SAFETY: Validate dependencies
        if (!eventManager) {
            throw new Error('CanvasInteractionManager requires eventManager');
        }
        
        this.eventManager = eventManager;
        
        // Canvas elements (will be injected)
        this.canvas = null;
        this.canvasData = null;
        this.tileSize = null;
        
        // Manager references (will be injected)
        this.viewport = null;
        
        // EXACT SAME: Interaction state from canvas viewer
        this.isDragging = false;
        this.dragButton = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // EXACT SAME: Performance monitoring
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.lastMiddleClickTime = 0;
        this.lastMiddleDownTime = 0;
        this.performanceIssues = [];
        
        // EXACT SAME: Touch state tracking
        this.touchState = {
            isTouching: false,
            touchCount: 0,
            startDistance: 0,
            startZoom: 1,
            startViewportX: 0,
            startViewportY: 0,
            isPinching: false,
            isPanning: false,
            touchStartTime: 0,
            hasMoved: false,
            zoomCenterX: 0,
            zoomCenterY: 0,
            // Double tap detection
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            doubleTapDelay: 300, // milliseconds
            doubleTapDistance: 50 // pixels
        };
        
        // EXACT SAME: Event callbacks
        this.onTileClick = null;
        this.onTileHover = null;
        this.onTileDoubleClick = null;
        this.onViewportChange = null;
        
        // Bound event handlers - EXACT SAME as canvas viewer
        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this),
            mouseEnter: this.handleMouseEnter.bind(this),
            wheel: this.handleWheel.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            documentMouseUp: this.handleDocumentMouseUp.bind(this),
            documentMouseMove: this.handleDocumentMouseMove.bind(this),
            keyDown: this.handleKeyDown.bind(this),
            windowBlur: this.handleWindowBlur.bind(this),
            windowFocus: this.handleWindowFocus.bind(this),
            contextMenu: this.handleContextMenu.bind(this)
        };
        
        console.log('✅ CanvasInteractionManager initialized');
    }
    
    /**
     * SAFETY: Initialize with canvas element and dependencies
     * @param {HTMLCanvasElement} canvas - Canvas element for event handling
     */
    init(canvas) {
        if (!canvas) {
            throw new Error('CanvasInteractionManager.init() requires canvas element');
        }
        
        this.canvas = canvas;
        this.setupEventListeners();
        
        console.log('🔧 CanvasInteractionManager initialized with canvas');
    }
    
    /**
     * Set manager dependencies
     * @param {Object} viewport - Viewport manager instance
     */
    setViewport(viewport) {
        this.viewport = viewport;
    }
    
    /**
     * Set canvas data for coordinate calculations
     * @param {Object} canvasData - Canvas configuration
     */
    setCanvasData(canvasData) {
        this.canvasData = canvasData;
        if (canvasData && canvasData.tile_size) {
            this.tileSize = canvasData.tile_size;
        }
        
        // CRITICAL FIX: Pass canvas data to viewport manager for proper clamping
        if (this.viewport && this.viewport.setCanvasData) {
            this.viewport.setCanvasData(canvasData);
        }
    }
    
    /**
     * Set tiles data for tile detection
     * @param {Map} tiles - Tiles Map
     */
    setTiles(tiles) {
        this.tiles = tiles;
    }
    
    /**
     * EXACT SAME: Setup event listeners
     */
    setupEventListeners() {
        if (!this.canvas) return;
        
        // Prevent context menu on right click and middle click
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu);
        
        // Mouse events for panning and zooming
        this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave, { passive: true });
        this.canvas.addEventListener('mouseenter', this.boundHandlers.mouseEnter, { passive: true });
        
        // Wheel event for zooming - cannot be passive because we need preventDefault
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        
        // Document-level event listeners to catch events outside canvas
        document.addEventListener('mouseup', this.boundHandlers.documentMouseUp);
        document.addEventListener('mousemove', this.boundHandlers.documentMouseMove);
        
        // Touch events for mobile - cannot be passive because we need preventDefault for touch handling
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: false });
        
        // Keyboard events
        document.addEventListener('keydown', this.boundHandlers.keyDown);
        
        // Window events for cleanup
        window.addEventListener('blur', this.boundHandlers.windowBlur, { passive: true });
        window.addEventListener('focus', this.boundHandlers.windowFocus, { passive: true });
    }
    
    /**
     * EXACT SAME: Handle context menu
     */
    handleContextMenu(e) {
        e.preventDefault();
        return false;
    }
    
    /**
     * EXACT SAME: Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        e.preventDefault();
        
        // Track performance for middle mouse
        if (e.button === 1) { // Middle mouse
            const currentTime = performance.now();
            const timeSinceLastMiddleDown = currentTime - (this.lastMiddleDownTime || 0);
            
            // Check for rapid middle mouse clicks (only if very rapid)
            if (timeSinceLastMiddleDown < 16) { // Less than one frame
                this.trackPerformanceIssue('Rapid middle mouse clicks - may cause performance issues (interaction manager)');
                return; // Skip this click
            }
            
            this.lastMiddleDownTime = currentTime;
            
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
                    // Left click coordinates stored for delta calculation
        }
    }
    
    /**
     * EXACT SAME: Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        // Emit mouse move event for debug overlay
        this.eventManager.emit('mouseMove', { x: e.clientX, y: e.clientY });
        
        // Only allow panning/scrolling with middle mouse button
        if (this.isDragging && this.dragButton === 1) { // Only middle mouse
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            // Update viewport through viewport manager
            if (this.viewport) {
                this.viewport.pan(deltaX, deltaY);
            }
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            // Notify viewport change callback
            if (this.onViewportChange && this.viewport) {
                const viewportState = this.viewport.getViewport();
                this.onViewportChange(viewportState.x, viewportState.y, viewportState.zoom);
            }
        } else if (!this.isDragging) {
            // Update cursor immediately for responsive feedback
            this.updateCursor(e);
            
            // Handle tile hover for non-dragging mouse movement
            this.handleTileHover(e);
        }
    }
    
    /**
     * EXACT SAME: Update cursor immediately based on current mouse position
     * @param {MouseEvent} e - Mouse event
     */
    updateCursor(e) {
        if (this.isDragging) {
            // Don't change cursor while dragging
            return;
        }
        
        try {
            const tile = this.getTileAtPosition(e.clientX, e.clientY, false);
            this.canvas.style.cursor = tile ? 'pointer' : 'default';
        } catch (error) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle tile hover events
     * @param {MouseEvent} e - Mouse event
     */
    handleTileHover(e) {
        if (this.isDragging) return;
        
        try {
            const tile = this.getTileAtPosition(e.clientX, e.clientY, false);
            
            // Call hover callback if tile found
            if (tile && this.onTileHover) {
                this.onTileHover(tile);
            }
            
            // Emit hover event
            this.eventManager.emit('tileHover', tile);
            
        } catch (error) {
            // Silently handle hover errors to prevent console spam
        }
    }
    
    /**
     * EXACT SAME: Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        const clickTime = performance.now();
        const timeSinceLastClick = clickTime - this.lastClickTime;
        
        // Track performance issues with rapid middle mouse clicks only
        if (e.button === 1) {
            const timeSinceLastMiddleClick = clickTime - (this.lastMiddleClickTime || 0);
            if (timeSinceLastMiddleClick < 50) {
                this.trackPerformanceIssue('Rapid middle mouse clicks detected');
            }
            this.lastMiddleClickTime = clickTime;
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
            
            // Mouse click detection with movement validation
            
            // Check for tile click regardless of mouse movement for now (debugging)
            try {
                const tile = this.getTileAtPosition(e.clientX, e.clientY, true);
                console.log('🎯 Tile search result:', tile);
                
                // Only register as click if mouse didn't move much (< 15 pixels) OR if we found a valid tile
                if ((deltaX < 15 && deltaY < 15) || tile) {
                    console.log(`🎯 Click ${deltaX < 15 && deltaY < 15 ? 'accepted - small movement' : 'accepted - valid tile found'}`);
                    
                    if (tile) {
                        console.log('🎯 Tile found for click:', tile);
                        
                        if (this.onTileClick) {
                            console.log('🎯 onTileClick callback exists, calling it');
                            
                            // Track click performance
                            this.clickCount++;
                            this.lastClickTime = clickTime;
                            
                            // Emit click event
                            this.eventManager.emit('tileClick', tile);
                            
                            this.onTileClick(tile);
                        } else {
                            console.error('❌ No onTileClick callback set in interaction manager');
                        }
                    } else {
                        console.log('❌ No tile found at click position');
                    }
                } else {
                    console.log(`🎯 Click ignored - mouse moved too much: {deltaX: ${deltaX}, deltaY: ${deltaY}}`);
                }
            } catch (error) {
                console.error('Error in tile click handler:', error);
                this.trackPerformanceIssue('Tile click handler error');
            }
            
            // DON'T reset tracking variables here - keep them for next click
            // this.lastMouseX = 0;
            // this.lastMouseY = 0;
        }
    }
    
    /**
     * EXACT SAME: Handle mouse leave event
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
     * EXACT SAME: Handle mouse enter event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseEnter(e) {
        // Update cursor when entering canvas
        this.updateCursor(e);
    }
    
    /**
     * EXACT SAME: Handle document mouse up event (catches events outside canvas)
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentMouseUp(e) {
        // Only handle if we're currently dragging
        if (this.isDragging) {
            // End dragging regardless of which button was released
            this.isDragging = false;
            this.dragButton = null;
            this.canvas.style.cursor = 'default';
            
            console.log('🖱️ Document mouse up - ended dragging');
        }
    }
    
    /**
     * EXACT SAME: Handle document mouse move event (for dragging outside canvas)
     * @param {MouseEvent} e - Mouse event
     */
    handleDocumentMouseMove(e) {
        // Only handle if we're currently dragging with middle mouse
        if (this.isDragging && this.dragButton === 1) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            // Update viewport through viewport manager
            if (this.viewport) {
                this.viewport.pan(deltaX, deltaY);
            }
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            // Notify viewport change callback
            if (this.onViewportChange && this.viewport) {
                const viewportState = this.viewport.getViewport();
                this.onViewportChange(viewportState.x, viewportState.y, viewportState.zoom);
            }
        }
    }
    
    /**
     * EXACT SAME: Handle wheel event for zooming
     * @param {WheelEvent} e - Wheel event
     */
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        
        if (this.viewport) {
            const currentZoom = this.viewport.getViewport().zoom;
            const newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, currentZoom * delta));
            
            if (newZoom !== currentZoom) {
                // Zoom towards mouse position
                this.viewport.zoomToward(delta, mouseX, mouseY);
                
                // Notify viewport change callback
                if (this.onViewportChange) {
                    const viewportState = this.viewport.getViewport();
                    this.onViewportChange(viewportState.x, viewportState.y, viewportState.zoom);
                }
            }
        }
    }
    
    /**
     * EXACT SAME: Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        this.touchState.touchCount = e.touches.length;
        this.touchState.touchStartTime = Date.now();
        this.touchState.hasMoved = false;
        
        if (e.touches.length === 1) {
            // Single touch - handle as pan or click
            const touch = e.touches[0];
            this.touchState.lastTouchX = touch.clientX;
            this.touchState.lastTouchY = touch.clientY;
            this.touchState.isTouching = true;
            this.touchState.isPanning = true;
            
            // Start panning
            this.isDragging = true;
            this.dragButton = 0; // Left mouse equivalent
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
        } else if (e.touches.length === 2) {
            // Two touches - handle as pinch-to-zoom
            this.touchState.isPinching = true;
            this.touchState.isPanning = false;
            
            if (this.viewport) {
                const viewportState = this.viewport.getViewport();
                this.touchState.startZoom = viewportState.zoom;
                this.touchState.startViewportX = viewportState.x;
                this.touchState.startViewportY = viewportState.y;
            }
            
            // Calculate initial distance between touches
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            this.touchState.startDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Calculate center point for zoom
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            const canvasY = centerY - rect.top;
            
            // Store zoom center in canvas coordinates
            this.touchState.zoomCenterX = canvasX;
            this.touchState.zoomCenterY = canvasY;
        }
    }
    
    /**
     * EXACT SAME: Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        this.touchState.hasMoved = true;
        
        if (e.touches.length === 1 && this.touchState.isPanning) {
            // Single touch panning
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchState.lastTouchX;
            const deltaY = touch.clientY - this.touchState.lastTouchY;
            
            // Prevent very small movements from being considered drags
            if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) {
                return;
            }
            
            // Update viewport for panning
            if (this.viewport) {
                this.viewport.pan(deltaX, deltaY);
            }
            
            this.touchState.lastTouchX = touch.clientX;
            this.touchState.lastTouchY = touch.clientY;
            
            // Notify viewport change callback
            if (this.onViewportChange && this.viewport) {
                const viewportState = this.viewport.getViewport();
                this.onViewportChange(viewportState.x, viewportState.y, viewportState.zoom);
            }
        } else if (e.touches.length === 2 && this.touchState.isPinching) {
            // Two touch pinch-to-zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Calculate zoom factor
            const zoomFactor = currentDistance / this.touchState.startDistance;
            const newZoom = this.touchState.startZoom * zoomFactor;
            
            if (this.viewport) {
                // Clamp zoom to limits
                const clampedZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, newZoom));
                
                // Calculate zoom center in world coordinates
                const rect = this.canvas.getBoundingClientRect();
                const worldX = (this.touchState.zoomCenterX - rect.left) / this.viewport.zoom - this.viewport.viewportX;
                const worldY = (this.touchState.zoomCenterY - rect.top) / this.viewport.zoom - this.viewport.viewportY;
                
                // Apply zoom
                const currentViewport = this.viewport.getViewport();
                this.viewport.setViewport(
                    (this.touchState.zoomCenterX - rect.left) / clampedZoom - worldX,
                    (this.touchState.zoomCenterY - rect.top) / clampedZoom - worldY,
                    clampedZoom
                );
                
                // Notify viewport change callback
                if (this.onViewportChange) {
                    const viewportState = this.viewport.getViewport();
                    this.onViewportChange(viewportState.x, viewportState.y, viewportState.zoom);
                }
            }
        }
    }
    
    /**
     * EXACT SAME: Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        const touchDuration = Date.now() - this.touchState.touchStartTime;
        
        if (e.touches.length === 0) {
            // All touches ended
            this.isDragging = false;
            this.dragButton = null;
            
            // Handle tap if touch was brief and didn't move much
            if (!this.touchState.hasMoved && touchDuration < 300) {
                const touch = e.changedTouches[0];
                
                // Check for double tap
                const timeSinceLastTap = Date.now() - this.touchState.lastTapTime;
                const distanceFromLastTap = Math.sqrt(
                    Math.pow(touch.clientX - this.touchState.lastTapX, 2) +
                    Math.pow(touch.clientY - this.touchState.lastTapY, 2)
                );
                
                if (timeSinceLastTap < this.touchState.doubleTapDelay &&
                    distanceFromLastTap < this.touchState.doubleTapDistance) {
                    // Double tap detected - enter edit mode
                    const tile = this.getTileAtPosition(touch.clientX, touch.clientY, true);
                    console.log('📱 Double tap - tile result:', tile);
                    if (tile && this.onTileDoubleClick) {
                        this.onTileDoubleClick(tile);
                    }
                    
                    // Reset double tap tracking
                    this.touchState.lastTapTime = 0;
                } else {
                    // Single tap - just select/highlight tile
                    const tile = this.getTileAtPosition(touch.clientX, touch.clientY, true);
                    console.log('📱 Single tap - tile result:', tile);
                    if (tile && this.onTileClick) {
                        console.log('📱 Calling onTileClick for touch tap');
                        this.onTileClick(tile);
                    }
                    
                    // Update double tap tracking
                    this.touchState.lastTapTime = Date.now();
                    this.touchState.lastTapX = touch.clientX;
                    this.touchState.lastTapY = touch.clientY;
                }
            }
            
            // Reset touch state
            this.touchState.isTouching = false;
            this.touchState.isPanning = false;
            this.touchState.isPinching = false;
            this.touchState.hasMoved = false;
        } else if (e.touches.length === 1) {
            // Transition from pinch to pan
            this.touchState.isPinching = false;
            this.touchState.isPanning = true;
            
            const touch = e.touches[0];
            this.touchState.lastTouchX = touch.clientX;
            this.touchState.lastTouchY = touch.clientY;
        }
    }
    
    /**
     * EXACT SAME: Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Only handle keyboard events when canvas has focus or no specific element has focus
        if (document.activeElement && 
            document.activeElement !== document.body && 
            document.activeElement !== this.canvas) {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case '+':
            case '=':
                e.preventDefault();
                if (this.viewport) {
                    this.viewport.zoomIn();
                }
                break;
            case '-':
                e.preventDefault();
                if (this.viewport) {
                    this.viewport.zoomOut();
                }
                break;
            case '0':
                e.preventDefault();
                if (this.viewport && this.canvasData) {
                    this.viewport.resetToFit(this.canvasData);
                }
                break;
        }
    }
    
    /**
     * Handle window blur event
     */
    handleWindowBlur(e) {
        // Reset interaction state when window loses focus
        this.isDragging = false;
        this.dragButton = null;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle window focus event
     */
    handleWindowFocus(e) {
        // Could reset state or update display when window regains focus
    }
    
    /**
     * EXACT SAME: Get tile at screen position with optimized coordinate conversion
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {boolean} isClick - Whether this is for a click event (enables debug logging)
     * @returns {Object|null} Tile at position or null
     */
    getTileAtPosition(screenX, screenY, isClick = false) {
        if (!this.canvas || !this.viewport) {
            console.log('❌ Missing canvas or viewport in interaction manager');
            return null;
        }
        
        // Validate tileSize is set before calculating tile position
        if (!this.tileSize) {
            console.error('❌ Cannot get tile at position: tileSize not set');
            return null;
        }
        
        try {
            // Convert screen coordinates to world coordinates using viewport manager
            const worldCoords = this.viewport.screenToWorld(screenX, screenY);
            
            // Coordinate conversion is working correctly - debug removed
            
            // Convert to tile coordinates
            const tileX = Math.floor(worldCoords.x / this.tileSize);
            const tileY = Math.floor(worldCoords.y / this.tileSize);
            
            // Check if the position is within canvas bounds (world coordinates)
            if (this.canvasData && (worldCoords.x < 0 || worldCoords.y < 0 || 
                worldCoords.x >= this.canvasData.width || worldCoords.y >= this.canvasData.height)) {
                if (isClick) {
                    console.log('🎯 Click outside canvas bounds - ignoring');
                }
                return null;
            }

            // Check if tile coordinates are within the valid grid range
            if (this.canvasData) {
                const maxTilesX = Math.floor(this.canvasData.width / this.tileSize);
                const maxTilesY = Math.floor(this.canvasData.height / this.tileSize);
                
                if (tileX < 0 || tileX >= maxTilesX || tileY < 0 || tileY >= maxTilesY) {
                    if (isClick) {
                        console.log(`🎯 Click outside valid tile grid - ignoring. Tile: (${tileX}, ${tileY}), Max: (${maxTilesX}, ${maxTilesY})`);
                    }
                    return null;
                }
            }
            
            // Find tile at this position
            if (this.tiles) {
                // Only log for clicks, not hover (to reduce spam)
                if (isClick) {
                    console.log(`🔍 Searching for tile at (${tileX}, ${tileY}) in ${this.tiles.size} tiles`);
                }
                
                for (const tile of this.tiles.values()) {
                    if (tile.x === tileX && tile.y === tileY) {
                        if (isClick) {
                            console.log(`✅ Found tile at (${tileX}, ${tileY}):`, tile);
                        }
                        return tile;
                    }
                }
                
                if (isClick) {
                    console.log(`❌ No tile found at (${tileX}, ${tileY})`);
                }
            } else {
                if (isClick) {
                    console.log(`❌ No tiles data in interaction manager`);
                }
            }
            
            // Return empty tile placeholder for valid positions
            return {
                x: tileX,
                y: tileY,
                isEmpty: true,
                worldX: worldCoords.x,
                worldY: worldCoords.y
            };
            
        } catch (error) {
            console.error('❌ Error in getTileAtPosition:', error);
            return null;
        }
    }
    
    /**
     * Track performance issues
     * @param {string} issue - Performance issue description
     */
    trackPerformanceIssue(issue) {
        this.performanceIssues.push({
            issue,
            timestamp: Date.now()
        });
        
        // Keep only recent issues (last 10)
        if (this.performanceIssues.length > 10) {
            this.performanceIssues.shift();
        }
        
        console.warn('⚡ Performance issue:', issue);
    }
    
    /**
     * Set event callbacks
     * @param {Object} callbacks - Event callback functions
     */
    setEventCallbacks(callbacks) {
        if (callbacks.onTileClick) this.onTileClick = callbacks.onTileClick;
        if (callbacks.onTileHover) this.onTileHover = callbacks.onTileHover;
        if (callbacks.onTileDoubleClick) this.onTileDoubleClick = callbacks.onTileDoubleClick;
        if (callbacks.onViewportChange) this.onViewportChange = callbacks.onViewportChange;
    }
    
    /**
     * Cleanup method
     */
    cleanup() {
        console.log('🔧 Cleaning up CanvasInteractionManager...');
        
        // Remove event listeners
        if (this.canvas) {
            this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
            this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
            this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
            this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
            this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
            this.canvas.removeEventListener('mouseenter', this.boundHandlers.mouseEnter);
            this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
            this.canvas.removeEventListener('touchstart', this.boundHandlers.touchStart);
            this.canvas.removeEventListener('touchmove', this.boundHandlers.touchMove);
            this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
        }
        
        document.removeEventListener('mouseup', this.boundHandlers.documentMouseUp);
        document.removeEventListener('mousemove', this.boundHandlers.documentMouseMove);
        document.removeEventListener('keydown', this.boundHandlers.keyDown);
        window.removeEventListener('blur', this.boundHandlers.windowBlur);
        window.removeEventListener('focus', this.boundHandlers.windowFocus);
        
        // Clear references
        this.canvas = null;
        this.viewport = null;
        this.canvasData = null;
        this.tiles = null;
        
        // Clear callbacks
        this.onTileClick = null;
        this.onTileHover = null;
        this.onTileDoubleClick = null;
        this.onViewportChange = null;
        
        // Reset state
        this.isDragging = false;
        this.dragButton = null;
        
        console.log('✅ CanvasInteractionManager cleanup complete');
    }
    
    /**
     * Emergency reset for error recovery
     */
    emergencyReset() {
        console.log('🚨 Emergency reset in CanvasInteractionManager');
        
        // Reset interaction state
        this.isDragging = false;
        this.dragButton = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Reset touch state
        this.touchState = {
            startX: 0,
            startY: 0,
            startTime: 0,
            isPanning: false,
            hasMoved: false,
            lastTouchTime: 0
        };
        
        // Reset performance tracking
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.lastMiddleClickTime = 0;
        this.lastMiddleDownTime = 0;
        this.performanceIssues = [];
        
        // Reset canvas cursor
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
        
        console.log('✅ CanvasInteractionManager emergency reset complete');
    }
}

export default CanvasInteractionManager;
