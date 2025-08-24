/**
 * Canvas Interaction Manager
 * Handles all user interactions (mouse, touch, keyboard)
 */
export class CanvasInteractionManager {
    constructor() {
        this.canvas = null;
        this.renderer = null;
        
        // Interaction state
        this.isDragging = false;
        this.dragButton = null;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Touch state
        this.touchState = {
            isTouching: false,
            touchCount: 0,
            startDistance: 0,
            startZoom: 1,
            startViewportX: 0,
            startViewportY: 0,
            lastTouchX: 0,
            lastTouchY: 0
        };
        
        // Event callbacks
        this.onPan = null;
        this.onZoom = null;
        this.onTileClick = null;
        this.onTileHover = null;
        
        // Bound event handlers
        this.boundHandlers = {};
    }
    
    /**
     * Initialize the interaction manager
     */
    async init(canvasElement, renderer) {
        this.canvas = canvasElement;
        this.renderer = renderer;
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Expose debug method globally for testing
        window.debugTileAtWorldPosition = this.debugTileAtWorldPosition.bind(this);
        
        console.log(`✅ Canvas Interaction Manager initialized`);
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas not available for event handler setup`);
            return;
        }
        
        // Bind event handlers to preserve 'this' context
        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this),
            wheel: this.handleWheel.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            contextMenu: this.handleContextMenu.bind(this),
            mouseMoveHover: this.trackMousePosition.bind(this)
        };
        
        // Use the bound handlers
        this.setupEventListeners();
        
        console.log(`✅ Event handlers bound and listeners set up`);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas not available for event listener setup`);
            return;
        }
        
        // Add event listeners using bound handlers
        this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseLeave);
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel);
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu);
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart);
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove);
        this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
        
        // Add separate mouse move listener for hover detection (works even when not dragging)
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMoveHover);
        
        // Add document-level event listeners to handle mouse events outside canvas during panning
        document.addEventListener('mousemove', this.boundHandlers.mouseMove);
        document.addEventListener('mouseup', this.boundHandlers.mouseUp);
        document.addEventListener('contextmenu', this.boundHandlers.contextMenu);
        
        console.log(`✅ Event listeners set up`);
    }
    
    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        // Only handle events that are on the canvas or during active panning
        if (!this.canvas || (!this.canvas.contains(event.target) && !this.isDragging)) {
            return;
        }
.0        
        console.log(`🔄 handleMouseDown called with:`, event);
        
        // Handle right mouse button (button 2) for panning
        if (event.button === 2) {
            event.preventDefault();
            
            this.isDragging = true;
            this.dragButton = event.button;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
            
            // Change cursor to indicate panning
            this.canvas.style.cursor = 'grabbing';
            
            console.log(`🔧 Right mouse button down - ready for panning`);
            console.log(`🔧 Mouse down state:`, { isDragging: this.isDragging, dragButton: this.dragButton, lastMouseX: this.lastMouseX, lastMouseY: this.lastMouseY });
            return;
        }
        
        // Left mouse button (button 0) - handle tile selection (only on canvas)
        if (event.button === 0 && this.canvas.contains(event.target)) {
            console.log(`🔧 Left mouse button down - ready for tile selection`);
            // Don't prevent default for left click - let it handle tile selection
            return;
        }
        
        console.log(`🔧 Ignoring mouse button:`, event.button);
    }
    
    /**
     * Handle mouse movement
     */
    handleMouseMove(event) {
        // Only pan when right mouse button is being dragged
        if (this.isDragging && this.dragButton === 2) {
            const deltaX = event.clientX - this.lastMouseX;
            const deltaY = event.clientY - this.lastMouseY;
            
            // Pan viewport
            if (this.onPan) {
                this.onPan(deltaX, deltaY);
            }
            
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
        
        // Track mouse position for tile hover detection (only when over canvas)
        if (this.canvas && this.canvas.contains(event.target)) {
            this.trackMousePosition(event);
        }
    }
    
    /**
     * Track mouse position for tile hover detection
     */
    trackMousePosition(event) {
        if (!this.renderer || !this.renderer.viewportManager) {
            return;
        }
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convert to world coordinates
        const worldPos = this.renderer.viewportManager.screenToWorld(mouseX, mouseY);
        
        // Find tile at this position
        const tile = this.getTileAtPosition(event.clientX, event.clientY);
        
        // Emit hover event for debug manager (no console logging here)
        if (this.onTileHover) {
            this.onTileHover(tile, worldPos, { x: mouseX, y: mouseY });
        }
    }
    
    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        // Only handle events that are on the canvas or during active panning
        if (!this.canvas || (!this.canvas.contains(event.target) && !this.isDragging)) {
            return;
        }
        
        console.log(`🔄 handleMouseUp called with:`, event);
        
        // Handle right mouse button (button 2) - end panning
        if (event.button === 2) {
            if (this.isDragging && this.dragButton === 2) {
                console.log(`🔧 Right mouse button up - ending panning`);
                this.isDragging = false;
                this.dragButton = null;
                // Reset cursor
                this.canvas.style.cursor = 'default';
            }
            return;
        }
        
        // Handle left mouse button (button 0) - tile selection (only on canvas)
        if (event.button === 0 && this.canvas.contains(event.target)) {
            // Check for tile click (only if not dragging from right button)
            if (!this.isDragging) {
                console.log(`🔧 Left mouse button up - checking for tile click`);
                const tile = this.getTileAtPosition(event.clientX, event.clientY);
                console.log(`🔧 Tile found at click position:`, tile);
                if (tile) {
                    console.log(`🔧 Tile clicked:`, tile);
                    if (this.onTileClick) {
                        console.log(`🔧 Calling onTileClick callback with tile:`, tile);
                        this.onTileClick(tile);
                        console.log(`🔧 onTileClick callback completed`);
                    } else {
                        console.warn(`⚠️ onTileClick callback not set - this is the problem!`);
                    }
                } else {
                    console.log(`🔧 No tile found at click position (${event.clientX}, ${event.clientY})`);
                    // Debug: Let's see what the coordinate conversion gives us
                    if (this.renderer && this.renderer.canvasData) {
                        const rect = this.canvas.getBoundingClientRect();
                        const canvasX = event.clientX - rect.left;
                        const canvasY = event.clientY - rect.top;
                        const worldPos = this.renderer.screenToWorld(canvasX, canvasY);
                        console.log(`🔧 Debug coordinates:`, {
                            screen: { x: event.clientX, y: event.clientY },
                            canvas: { x: canvasX, y: canvasY },
                            world: worldPos,
                            tileSize: this.renderer.canvasData.tile_size
                        });
                    }
                }
            } else {
                console.log(`🔧 Left mouse button up while dragging - ignoring`);
            }
            return;
        }
        
        console.log(`🔧 Mouse up state:`, { isDragging: this.isDragging, dragButton: this.dragButton });
        console.log(`✅ Mouse up handled`);
    }
    
    /**
     * Handle mouse leave
     */
    handleMouseLeave(event) {
        if (this.isDragging) {
            console.log(`🔧 Mouse left canvas while dragging - ending panning`);
            this.isDragging = false;
            this.dragButton = null;
            // Reset cursor
            this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Handle mouse wheel for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Calculate zoom factor
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        
        // Only log significant zoom changes to reduce console flooding
        // console.log(`🔧 Wheel zoom: factor=${zoomFactor}, mouse=(${mouseX}, ${mouseY})`);
        
        // Zoom centered on mouse position
        // Use canvas-relative coordinates for better zoom behavior
        if (this.onZoom) {
            this.onZoom(zoomFactor, mouseX, mouseY);
        }
    }
    
    /**
     * Handle touch start event
     */
    handleTouchStart(event) {
        console.log(`🔄 handleTouchStart called with:`, event);
        
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch - prepare for panning
            const touch = event.touches[0];
            this.touchState = {
                isActive: true,
                isPanning: true,
                isZooming: false,
                startX: touch.clientX,
                startY: touch.clientY,
                lastX: touch.clientX,
                lastY: touch.clientY,
                startDistance: 0,
                startZoom: 1
            };
            
            console.log(`🔧 Touch state initialized for panning`);
        } else if (event.touches.length === 2) {
            // Two touches - prepare for zooming
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = this.getTouchDistance(touch1, touch2);
            
            this.touchState = {
                isActive: true,
                isPanning: false,
                isZooming: true,
                startX: (touch1.clientX + touch2.clientX) / 2,
                startY: (touch1.clientY + touch2.clientY) / 2,
                lastX: (touch1.clientX + touch2.clientX) / 2,
                lastY: (touch1.clientY + touch2.clientY) / 2,
                startDistance: distance,
                startZoom: this.renderer?.viewportManager?.getViewport()?.zoom || 1
            };
            
            console.log(`🔧 Touch state initialized for zooming`);
        }
        
        console.log(`✅ Touch start handled`);
    }
    
    /**
     * Handle touch move event
     */
    handleTouchMove(event) {
        if (!this.touchState || !this.touchState.isActive) {
            return;
        }
        
        event.preventDefault();
        
        if (this.touchState.isPanning && event.touches.length === 1) {
            // Single touch panning
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.touchState.lastX;
            const deltaY = touch.clientY - this.touchState.lastY;
            
            // Only log significant movements to reduce console flooding
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                console.log(`🔧 Touch pan delta:`, { deltaX, deltaY });
            }
            
            // Pan viewport
            if (this.onPan) {
                this.onPan(deltaX, deltaY);
            }
            
            this.touchState.lastX = touch.clientX;
            this.touchState.lastY = touch.clientY;
        } else if (this.touchState.isZooming && event.touches.length === 2) {
            // Two touch zooming
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = this.getTouchDistance(touch1, touch2);
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            // Calculate zoom factor based on distance change
            const zoomFactor = currentDistance / this.touchState.startDistance;
            const newZoom = this.touchState.startZoom * zoomFactor;
            
            // Only log significant zoom changes
            if (Math.abs(zoomFactor - 1) > 0.1) {
                console.log(`🔧 Touch zoom:`, { 
                    startDistance: this.touchState.startDistance,
                    currentDistance,
                    zoomFactor,
                    newZoom,
                    centerX,
                    centerY
                });
            }
            
            // Zoom viewport
            if (this.onZoom) {
                // Pass screen coordinates for proper mouse-centered zoom
                this.onZoom(zoomFactor, centerX, centerY);
            }
            
            this.touchState.lastX = centerX;
            this.touchState.lastY = centerY;
        }
    }
    
    /**
     * Handle touch end event
     */
    handleTouchEnd(event) {
        if (this.touchState && this.touchState.isActive) {
            console.log(`🔧 Touch state deactivated`);
            this.touchState.isActive = false;
            this.touchState.isPanning = false;
            this.touchState.isZooming = false;
        }
    }
    
    /**
     * Handle context menu event
     */
    handleContextMenu(event) {
        // Always prevent context menu on canvas
        if (this.canvas && this.canvas.contains(event.target)) {
            event.preventDefault();
            return;
        }
        
        // Prevent context menu during panning (even outside canvas)
        if (this.isDragging && this.dragButton === 2) {
            event.preventDefault();
            console.log(`🔧 Context menu prevented during panning`);
            return;
        }
        
        // Allow context menu in other cases
    }
    
    /**
     * Get touch distance between two touches
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get tile at screen position
     */
    getTileAtPosition(screenX, screenY) {
        // Only log when explicitly called for clicks, not for hover detection
        const isClickCall = this.isDragging === false; // Called from trackMousePosition when not dragging
        
        // TEMPORARY: Enable logging for debugging tile hover issue
        const shouldLog = true; // Set to true to debug tile hover issue
        
        if (isClickCall && shouldLog) {
            console.log(`🔄 getTileAtPosition called with:`, { screenX, screenY });
        }
        
        if (!this.renderer || !this.renderer.canvasData) {
            if (isClickCall && shouldLog) {
                console.warn(`⚠️ Renderer or canvas data not available for tile detection`);
                console.log(`🔧 Debug renderer state:`, {
                    hasRenderer: !!this.renderer,
                    rendererType: typeof this.renderer,
                    hasCanvasData: !!(this.renderer && this.renderer.canvasData),
                    rendererMethods: this.renderer ? Object.getOwnPropertyNames(this.renderer) : 'no renderer'
                });
            }
            return null;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        if (isClickCall && shouldLog) {
            console.log(`🔧 Canvas coordinates:`, { canvasX, canvasY });
        }
        
        // Use the renderer's coordinate conversion method for consistency
        if (isClickCall && shouldLog) {
            console.log(`🔧 About to call renderer.screenToWorld(${canvasX}, ${canvasY})`);
        }
        const worldPos = this.renderer.screenToWorld(canvasX, canvasY);
        
        if (isClickCall && shouldLog) {
            console.log(`🔧 Coordinate conversion result:`, {
                screen: { x: screenX, y: screenY },
                canvas: { x: canvasX, y: canvasY },
                world: worldPos,
                viewport: this.renderer.viewportManager ? this.renderer.viewportManager.getViewport() : 'no viewport manager'
            });
        }
        
        if (!worldPos) {
            if (isClickCall && shouldLog) {
                console.warn(`⚠️ Failed to convert screen coordinates to world coordinates`);
            }
            return null;
        }
        
        const tileSize = this.renderer.canvasData.tile_size;
        const tileX = Math.floor(worldPos.x / tileSize);
        const tileY = Math.floor(worldPos.y / tileSize);
        
        if (isClickCall && shouldLog) {
            console.log(`🔧 Coordinate conversion:`, {
                canvasX, canvasY,
                worldX: worldPos.x,
                worldY: worldPos.y,
                tileSize, tileX, tileY
            });
        }
        
        // Get tile from renderer
        const tile = this.renderer.tiles.get(`${tileX},${tileY}`);
        
        // If no tile exists at this position, create a placeholder tile object for empty positions
        // This allows users to click on empty tiles to create new ones
        if (!tile && this.renderer.canvasData) {
            const emptyTile = {
                x: tileX,
                y: tileY,
                canvas_id: this.renderer.canvasData.id,
                tile_size: this.renderer.canvasData.tile_size,
                is_empty: true, // Flag to indicate this is an empty position
                // Add properties needed for neighbor tile loading
                id: null, // Will be set when tile is created
                creator_id: null,
                created_at: null,
                updated_at: null,
                pixel_data: null,
                title: `Tile at (${tileX}, ${tileY})`,
                description: 'New tile',
                is_public: true
            };
            
            // Only log tile detection for actual clicks, not hover detection
            if (isClickCall && shouldLog) {
                console.log(`🔧 Tile detection debug:`, {
                    tileX, tileY,
                    tileKey: `${tileX},${tileY}`,
                    rendererTilesSize: this.renderer.tiles.size,
                    rendererTilesKeys: Array.from(this.renderer.tiles.keys()),
                    foundTile: emptyTile,
                    note: 'Empty tile position - will create new tile'
                });
            }
            
            return emptyTile;
        }
        
        // Only log tile detection for actual clicks, not hover detection
        if (isClickCall && shouldLog) {
            console.log(`🔧 Tile detection debug:`, {
                tileX, tileY,
                tileKey: `${tileX},${tileY}`,
                rendererTilesSize: this.renderer.tiles.size,
                rendererTilesKeys: Array.from(this.renderer.tiles.keys()),
                foundTile: tile
            });
        }
        
        if (tile) {
            if (isClickCall && shouldLog) {
                console.log(`✅ Tile found at position:`, tile);
            }
        } else if (isClickCall && shouldLog) {
            console.log(`🔧 No tile found at position (${tileX}, ${tileY})`);
        }
        
        return tile;
    }
    
    /**
     * Debug method to test tile detection at specific world coordinates
     */
    debugTileAtWorldPosition(worldX, worldY) {
        console.log(`🔍 Debug: Testing tile detection at world position (${worldX}, ${worldY})`);
        
        if (!this.renderer || !this.renderer.canvasData) {
            console.warn(`⚠️ Renderer or canvas data not available for debug`);
            return null;
        }
        
        const tileSize = this.renderer.canvasData.tile_size;
        const tileX = Math.floor(worldX / tileSize);
        const tileY = Math.floor(worldY / tileSize);
        
        console.log(`🔧 Calculated tile grid position: (${tileX}, ${tileY})`);
        
        // Get tile from renderer
        const tile = this.renderer.tiles.get(`${tileX},${tileY}`);
        
        if (tile) {
            console.log(`✅ Debug: Tile found at world position (${worldX}, ${worldY}):`, tile);
        } else {
            console.log(`🔧 Debug: No tile found at world position (${worldX}, ${worldY})`);
        }
        
        return tile;
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        console.log(`🔄 cleanup called`);
        
        if (this.canvas && this.boundHandlers) {
            console.log(`🔄 Removing event listeners from canvas...`);
            
            // Remove event listeners using bound handlers
            this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
            this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
            this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseUp);
            this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
            this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
            this.canvas.removeEventListener('touchstart', this.boundHandlers.touchStart);
            this.canvas.removeEventListener('touchmove', this.boundHandlers.touchMove);
            this.canvas.removeEventListener('touchend', this.boundHandlers.touchEnd);
            this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
            
            // Remove document event listeners
            document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
            document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
            document.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
            
            console.log(`✅ Event listeners removed`);
        }
        
        this.canvas = null;
        this.renderer = null;
        this.boundHandlers = {};
        
        console.log('✅ Canvas Interaction Manager cleaned up');
    }
}
