/**
 * Canvas Viewer for displaying shared collaborative canvas
 * Shows all user tiles with real-time updates
 */

class CanvasViewer {
    constructor() {
        // Canvas elements
        this.canvas = null;
        this.ctx = null;
        
        // Canvas data
        this.canvasData = null;
        this.tiles = new Map();
        this.tileSize = null; // FIXED: Don't hardcode tile size, get it from canvas data
        
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
        
        // Store bound event handlers for proper cleanup
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
            contextMenu: (e) => e.preventDefault()
        };
        this.renderThrottleDelay = 16; // ~60fps
        
        // Event callbacks
        this.onTileClick = null;
        this.onTileDoubleClick = null;
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
     */
    init(canvas) {
        if (!canvas) {
            console.error('Canvas element not provided');
            return;
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // CRITICAL FIX: Initialize managers with canvas element
        this.initializeManagers();
        
        // FIXED: Set responsive canvas size
        this.resizeCanvas();
        
        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup event listeners (only if interaction manager not available)
        this.setupEventListeners();
        
        // CRITICAL FIX: Setup tile update listeners
        this.setupTileUpdateListeners();
        
        // Initial render
        this.requestRender();
        
        console.log('✅ Canvas viewer initialized');
    }
    
    /**
     * CRITICAL FIX: Initialize managers with canvas element
     */
    initializeManagers() {
        console.log('🔧 Initializing canvas managers...');
        
        try {
            // Initialize interaction manager with canvas
            if (window.interactionManager && window.interactionManager.init) {
                window.interactionManager.init(this.canvas);
                
                // Set viewport reference
                if (window.viewportManager) {
                    window.interactionManager.setViewport(window.viewportManager);
                }
                
                // CRITICAL FIX: Connect tile click callback to tile editor
                window.interactionManager.onTileClick = (tile) => {
                    console.log('🎯 Tile click received, opening tile editor for:', tile);
                    if (window.tileEditorManager && window.tileEditorManager.openTileEditor) {
                        // CRITICAL FIX: Ensure tile has canvas_id from current canvas data
                        if (this.canvasData && this.canvasData.id) {
                            tile.canvas_id = this.canvasData.id;
                            console.log('🔧 Added canvas_id to tile:', this.canvasData.id);
                        } else {
                            console.error('❌ No canvas data available for canvas_id');
                        }
                        window.tileEditorManager.openTileEditor(tile);
                    } else {
                        console.error('❌ Tile editor manager not available');
                    }
                };
                
                console.log('✅ Interaction manager initialized with canvas and tile click callback');
            } else {
                console.warn('⚠️ Interaction manager not available');
            }
            
            // Initialize renderer manager with canvas
            if (window.rendererManager && window.rendererManager.init) {
                window.rendererManager.init(this.canvas);
                
                // Set viewport reference
                if (window.viewportManager) {
                    window.rendererManager.setViewport(window.viewportManager);
                }
                
                console.log('✅ Renderer manager initialized with canvas');
            } else {
                console.warn('⚠️ Renderer manager not available');
            }
            
            // Initialize viewport manager with canvas
            if (window.viewportManager && window.viewportManager.setCanvas) {
                window.viewportManager.setCanvas(this.canvas);
                
                // CRITICAL FIX: Connect viewport manager changes to canvas viewer rendering
                window.viewportManager.onViewportChange = (x, y, zoom) => {
                    // Update canvas viewer's viewport properties
                    this.viewportX = x;
                    this.viewportY = y;
                    this.zoom = zoom;
                    
                    // Trigger re-render with new viewport
                    this.requestRender();
                    
                    console.log(`🔄 Canvas viewer viewport synced: (${x.toFixed(1)}, ${y.toFixed(1)}) zoom: ${zoom.toFixed(2)}`);
                };
                
                // CRITICAL FIX: Sync initial viewport state
                const initialViewport = window.viewportManager.getViewport();
                if (initialViewport) {
                    this.viewportX = initialViewport.x;
                    this.viewportY = initialViewport.y;
                    this.zoom = initialViewport.zoom;
                    console.log(`🔄 Initial viewport synced: (${initialViewport.x.toFixed(1)}, ${initialViewport.y.toFixed(1)}) zoom: ${initialViewport.zoom.toFixed(2)}`);
                    
                    // Force immediate render with synced viewport
                    this.requestRender();
                }
                
                console.log('✅ Viewport manager initialized with canvas and connected to rendering');
            } else if (window.viewportManager) {
                // Fallback: set canvas directly if setCanvas method doesn't exist
                window.viewportManager.canvas = this.canvas;
                console.log('✅ Viewport manager canvas set directly');
            } else {
                console.warn('⚠️ Viewport manager not available');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize managers:', error);
        }
    }
    
    /**
     * FIXED: Resize canvas to fit full window width with 2/3 aspect ratio
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const availableWidth = containerRect.width - 10; // Account for padding
        // Keep it simple: height is always 2/3 of width
        const maxWidth = 1200;
        let canvasWidth = Math.min(maxWidth, availableWidth);
        canvasWidth = Math.max(400, canvasWidth);
        const canvasHeight = Math.max(267, Math.floor(canvasWidth * (2 / 3)));
        
        this.canvas.width = Math.floor(canvasWidth);
        this.canvas.height = Math.floor(canvasHeight);
        
        this.requestRender();
        
        console.log(`📐 Canvas resized to ${this.canvas.width}x${this.canvas.height} (3:2 aspect)`);
    }
    
    /**
     * Setup event listeners for canvas interactions
     */
    setupEventListeners() {
        // CRITICAL FIX: Don't add event listeners if interaction manager will handle them
        if (window.interactionManager && window.interactionManager.init) {
            console.log('🔧 Skipping canvas viewer event listeners - interaction manager will handle them');
            return;
        }
        
        console.log('🔧 Setting up canvas viewer event listeners (fallback mode)');
        
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
        
        // Touch gesture tracking
        this.touchState = {
            isTouching: false,
            touchCount: 0,
            startDistance: 0,
            startZoom: 1,
            startViewportX: 0,
            startViewportY: 0,
            lastTouchX: 0,
            lastTouchY: 0,
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
        

        
        // Keyboard events
        document.addEventListener('keydown', this.boundHandlers.keyDown);
        
        // Window events for cleanup
        window.addEventListener('blur', this.boundHandlers.windowBlur, { passive: true });
        window.addEventListener('focus', this.boundHandlers.windowFocus, { passive: true });
    }
    
    /**
     * CRITICAL FIX: Setup tile update listeners for real-time updates
     */
    setupTileUpdateListeners() {
        // Listen for tile creation/update events from tile editor
        if (window.eventManager) {
            console.log('🔧 Setting up tile update listeners...');
            
            window.eventManager.on('tileCreated', (tile) => {
                console.log('🆕 Tile created event received:', tile);
                this.handleTileUpdate(tile);
            });
            
            window.eventManager.on('tileUpdated', (tile) => {
                console.log('🔄 Tile updated event received:', tile);
                this.handleTileUpdate(tile);
            });
            
            console.log('✅ Tile update listeners setup complete');
        } else {
            console.warn('⚠️ Event manager not available - tile updates will not be real-time');
        }
    }
    
    /**
     * CRITICAL FIX: Handle tile update from events
     * @param {Object} tile - Updated tile data
     */
    handleTileUpdate(tile) {
        if (!tile || !tile.id) {
            console.warn('⚠️ Invalid tile data for update:', tile);
            return;
        }
        
        console.log(`🔄 Updating tile ${tile.id} in canvas viewer`);
        
        // Update the tile in our tiles Map
        this.tiles.set(tile.id, tile);
        
        // Clear visible tiles cache to force re-render
        this.clearVisibleTilesCache();
        
        // Request immediate render to show the update
        this.requestRender();
        
        console.log(`✅ Tile ${tile.id} updated in canvas viewer`);
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        // CRITICAL FIX: Delegate to interaction manager if available
        if (window.interactionManager && window.interactionManager.handleMouseDown) {
            window.interactionManager.handleMouseDown(e);
            return;
        }
        
        // FALLBACK: Old direct handling (should not be used)
        console.warn('⚠️ Using old mouse down handling - interaction manager not available');
        
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
        // CRITICAL FIX: Delegate to interaction manager if available
        if (window.interactionManager && window.interactionManager.handleMouseMove) {
            window.interactionManager.handleMouseMove(e);
            return;
        }
        
        // FALLBACK: Old direct handling (should not be used)
        console.warn('⚠️ Using old mouse handling - interaction manager not available');
        
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
        // CRITICAL FIX: Don't handle cursor if interaction manager is available
        if (window.interactionManager && window.interactionManager.updateCursor) {
            return; // Let interaction manager handle cursor
        }
        
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
     * Throttled hover handling to prevent performance issues
     * @param {MouseEvent} e - Mouse event
     */
    throttledHover = (() => {
        let timeout = null;
        let lastHoverTime = 0;
        const hoverDelay = 100;
        
        return (e) => {
            // CRITICAL FIX: Don't handle hover if interaction manager is available
            if (window.interactionManager && window.interactionManager.handleTileHover) {
                return; // Let interaction manager handle hover
            }
            
            const now = performance.now();
            if (now - lastHoverTime < hoverDelay) return;
            
            if (timeout) {
                clearTimeout(timeout);
            }
            
            timeout = setTimeout(() => {
                try {
                    const tile = this.getTileAtPosition(e.clientX, e.clientY, false);
                    
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
            
            // Debug logging for click events (only in development)
            if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                console.log('🖱️ Mouse up detected:', {
                    button: e.button,
                    deltaX,
                    deltaY,
                    screenX: e.clientX,
                    screenY: e.clientY,
                    hasOnTileClick: !!this.onTileClick,
                    tilesCount: this.tiles.size
                });
            }
            
            // Only register as click if mouse didn't move much (< 15 pixels)
            if (deltaX < 15 && deltaY < 15) {
                try {
                    const tile = this.getTileAtPosition(e.clientX, e.clientY, true);
                    console.log('🎯 Tile search result:', tile);
                    
                    if (tile && this.onTileClick) {
                        // Track click performance
                        this.clickCount++;
                        this.lastClickTime = clickTime;
                        
                        // Update debug overlay
                        if (this.debugOverlay.enabled) {
                            this.debugOverlay.clickedTile = tile;
                            this.updateDebugOverlay(e.clientX, e.clientY);
                        }
                        
                        console.log('🎯 Tile clicked:', tile);
                        console.log('🎯 Calling onTileClick callback');
                        
                        this.onTileClick(tile);
                    } else if (!this.onTileClick) {
                        console.warn('⚠️ onTileClick callback not set');
                    }
                } catch (error) {
                    console.error('Error in tile click handler:', error);
                    this.trackPerformanceIssue('Tile click handler error');
                }
            } else {
                console.log('🎯 Click ignored - mouse moved too much:', { deltaX, deltaY });
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
     * Handle touch start event with enhanced multi-touch support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        this.touchState.isTouching = true;
        this.touchState.touchCount = e.touches.length;
        this.touchState.touchStartTime = Date.now();
        this.touchState.hasMoved = false;
        
        if (e.touches.length === 1) {
            // Single touch - handle as pan or click
            const touch = e.touches[0];
            this.touchState.lastTouchX = touch.clientX;
            this.touchState.lastTouchY = touch.clientY;
            this.touchState.isPanning = true;
            this.touchState.isPinching = false;
            
            // Start panning
            this.isDragging = true;
            this.dragButton = 0; // Left mouse equivalent
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            
        } else if (e.touches.length === 2) {
            // Two touches - handle as pinch-to-zoom
            this.touchState.isPinching = true;
            this.touchState.isPanning = false;
            this.touchState.startZoom = this.zoom;
            this.touchState.startViewportX = this.viewportX;
            this.touchState.startViewportY = this.viewportY;
            
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
            
            // Convert screen coordinates to canvas coordinates
            const rect = this.canvas.getBoundingClientRect();
            const canvasX = centerX - rect.left;
            const canvasY = centerY - rect.top;
            
            // Store zoom center in canvas coordinates
            this.touchState.zoomCenterX = canvasX;
            this.touchState.zoomCenterY = canvasY;
        }
    }
    
    /**
     * Handle touch move event with enhanced multi-touch support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.touchState.isPanning) {
            // Single touch panning
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchState.lastTouchX;
            const deltaY = touch.clientY - this.touchState.lastTouchY;
            
            // Track if touch has moved significantly
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                this.touchState.hasMoved = true;
            }
            
            // Update viewport for panning
            this.viewportX -= deltaX / this.zoom;
            this.viewportY -= deltaY / this.zoom;
            this.clampViewport();
            
            this.touchState.lastTouchX = touch.clientX;
            this.touchState.lastTouchY = touch.clientY;
            
            this.requestRender();
            
        } else if (e.touches.length === 2 && this.touchState.isPinching) {
            // Two touch pinch-to-zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate current distance between touches
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Calculate zoom factor
            const zoomFactor = currentDistance / this.touchState.startDistance;
            const newZoom = this.touchState.startZoom * zoomFactor;
            
            // Clamp zoom to limits
            const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
            
            // Calculate zoom center in world coordinates
            const rect = this.canvas.getBoundingClientRect();
            const worldX = (this.touchState.zoomCenterX - rect.left) / this.zoom - this.viewportX;
            const worldY = (this.touchState.zoomCenterY - rect.top) / this.zoom - this.viewportY;
            
            // Apply zoom
            this.zoom = clampedZoom;
            
            // Adjust viewport to keep zoom center in the same screen position
            this.viewportX = (this.touchState.zoomCenterX - rect.left) / this.zoom - worldX;
            this.viewportY = (this.touchState.zoomCenterY - rect.top) / this.zoom - worldY;
            
            this.clampViewport();
            this.requestRender();
        }
    }
    
    /**
     * Handle touch end event with enhanced multi-touch support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        // Update touch count
        this.touchState.touchCount = e.touches.length;
        
        if (e.touches.length === 0) {
            // All touches ended
            this.touchState.isTouching = false;
            this.touchState.isPanning = false;
            this.touchState.isPinching = false;
            this.isDragging = false;
            
            // Check if this was a tap (quick touch without movement)
            const touchDuration = Date.now() - (this.touchState.touchStartTime || 0);
            if (touchDuration < 200 && !this.touchState.hasMoved) {
                // Handle as a tap/click
                const touch = e.changedTouches[0];
                if (touch) {
                    console.log('📱 Touch tap detected:', {
                        x: touch.clientX,
                        y: touch.clientY,
                        duration: touchDuration,
                        hasMoved: this.touchState.hasMoved
                    });
                    
                    const currentTime = Date.now();
                    const timeSinceLastTap = currentTime - this.touchState.lastTapTime;
                    const distanceFromLastTap = Math.sqrt(
                        Math.pow(touch.clientX - this.touchState.lastTapX, 2) +
                        Math.pow(touch.clientY - this.touchState.lastTapY, 2)
                    );
                    
                    // Check if this is a double tap
                    if (timeSinceLastTap < this.touchState.doubleTapDelay && 
                        distanceFromLastTap < this.touchState.doubleTapDistance) {
                        // Double tap detected - enter edit mode
                        const tile = this.getTileAtPosition(touch.clientX, touch.clientY, true);
                        console.log('📱 Double tap - tile result:', tile);
                        if (tile && this.onTileDoubleClick) {
                            this.onTileDoubleClick(tile);
                        }
                        
                        // Reset tap tracking
                        this.touchState.lastTapTime = 0;
                        this.touchState.lastTapX = 0;
                        this.touchState.lastTapY = 0;
                    } else {
                        // Single tap - just select/highlight tile
                        const tile = this.getTileAtPosition(touch.clientX, touch.clientY, true);
                        console.log('📱 Single tap - tile result:', tile);
                        if (tile && this.onTileClick) {
                            console.log('📱 Calling onTileClick for touch tap');
                            this.onTileClick(tile);
                        } else if (!this.onTileClick) {
                            console.warn('📱 onTileClick callback not set for touch tap');
                        }
                        
                        // Store tap info for potential double tap
                        this.touchState.lastTapTime = currentTime;
                        this.touchState.lastTapX = touch.clientX;
                        this.touchState.lastTapY = touch.clientY;
                    }
                }
            } else {
                console.log('📱 Touch ignored - too long or moved:', {
                    duration: touchDuration,
                    hasMoved: this.touchState.hasMoved
                });
            }
            
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
     * CRITICAL FIX: Update managers with canvas data
     * @param {Object} canvasData - Canvas configuration
     */
    updateManagersWithCanvasData(canvasData) {
        console.log('🔧 Updating managers with canvas data...');
        
        try {
            // Update interaction manager with canvas data
            if (window.interactionManager && window.interactionManager.setCanvasData) {
                window.interactionManager.setCanvasData(canvasData);
                console.log('✅ Interaction manager updated with canvas data');
            }
            
            // Update renderer manager with canvas data
            if (window.rendererManager && window.rendererManager.setCanvasData) {
                window.rendererManager.setCanvasData(canvasData);
                console.log('✅ Renderer manager updated with canvas data');
            }
            
            // Update viewport manager with canvas data
            if (window.viewportManager && window.viewportManager.setCanvasData) {
                window.viewportManager.setCanvasData(canvasData);
                console.log('✅ Viewport manager updated with canvas data');
            }
            
        } catch (error) {
            console.error('❌ Failed to update managers with canvas data:', error);
        }
    }
    
    /**
     * Set canvas data
     * @param {Object} canvasData - Canvas configuration
     */
    setCanvasData(canvasData) {
        // Validate canvas data
        if (!canvasData || typeof canvasData !== 'object') {
            console.error('❌ Invalid canvas data provided:', canvasData);
            return;
        }
        
        if (!canvasData.width || !canvasData.height) {
            console.error('❌ Canvas data missing required dimensions:', canvasData);
            return;
        }
        
        console.log('🎨 Setting canvas data:', {
            id: canvasData.id,
            name: canvasData.name,
            tile_size: canvasData.tile_size,
            width: canvasData.width,
            height: canvasData.height
        });
        
        this.canvasData = canvasData;
        
        // CRITICAL FIX: Pass canvas data to managers
        this.updateManagersWithCanvasData(canvasData);
        
        // FIXED: Update tile size from canvas data
        if (canvasData.tile_size) {
            const oldTileSize = this.tileSize;
            this.tileSize = canvasData.tile_size;
            console.log(`🎨 Updated tile size: ${oldTileSize} → ${this.tileSize} (from canvas: ${canvasData.tile_size})`);
            
            // Clear tile cache when tile size changes
            this.clearVisibleTilesCache();
        } else {
            console.warn('⚠️ No tile_size in canvas data, using default');
            this.tileSize = 32; // Default fallback
        }
        
        // Only center view if we have valid canvas data
        if (this.canvasData && this.canvasData.width && this.canvasData.height) {
            this.centerView();
        } else {
            console.warn('⚠️ Cannot center view - invalid canvas data');
        }
        
        this.requestRender();
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
        
        console.log('📦 Loading tiles:', tiles.length);
        console.log('📦 Tile data sample:', tiles.slice(0, 2));
        
        tiles.forEach(tile => {
            this.tiles.set(tile.id, tile);
        });
        
        this.clearVisibleTilesCache(); // Clear cache when tiles change
        this.requestRender();
        
        console.log(`✅ Loaded ${tiles.length} tiles. Total tiles: ${this.tiles.size}`);
        console.log('📦 All tiles in map:', Array.from(this.tiles.values()).map(t => ({ 
            id: t.id, 
            x: t.x, 
            y: t.y, 
            hasPixelData: !!t.pixel_data,
            pixelDataType: typeof t.pixel_data,
            pixelDataLength: t.pixel_data ? (Array.isArray(t.pixel_data) ? t.pixel_data.length : 'string') : 'none'
        })));
        
        // Debug: Check if tiles are visible
        if (this.canvasData) {
            console.log('🎯 Canvas data for tile positioning:', {
                width: this.canvasData.width,
                height: this.canvasData.height,
                tileSize: this.tileSize,
                viewportX: this.viewportX,
                viewportY: this.viewportY,
                zoom: this.zoom
            });
        }
    }
    
    /**
     * Get tile at screen position with optimized coordinate conversion
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {boolean} isClick - Whether this is for a click event (enables debug logging)
     * @returns {Object|null} Tile at position or null
     */
    getTileAtPosition(screenX, screenY, isClick = false) {
        if (!this.canvas) return null;
        
        // FIXED: Validate tileSize is set before calculating tile position
        if (!this.tileSize) {
            console.error('❌ Cannot get tile at position: tileSize not set');
            return null;
        }
        
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
            
            // Check if the position is within canvas bounds (world coordinates)
            if (this.canvasData && (worldX < 0 || worldY < 0 || 
                worldX >= this.canvasData.width || worldY >= this.canvasData.height)) {
                if (isClick) {
                    console.log('🎯 Click outside canvas bounds - ignoring');
                }
                return null;
            }

            // NEW: Check if tile coordinates are within the valid grid range
            if (this.canvasData) {
                const maxTileX = Math.floor(this.canvasData.width / this.tileSize);
                const maxTileY = Math.floor(this.canvasData.height / this.tileSize);
                
                if (tileX >= maxTileX || tileY >= maxTileY) {
                    if (isClick) {
                        console.log(`🎯 Click outside tile grid bounds - max position: (${maxTileX-1}, ${maxTileY-1}), clicked: (${tileX}, ${tileY})`);
                    }
                    return null;
                }
            }
            
            // Only log during clicks in development mode
            if (isClick && window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                console.log('📍 Coordinate conversion:', {
                    screen: { x: screenX, y: screenY },
                    canvas: { x: canvasX, y: canvasY },
                    world: { x: worldX, y: worldY },
                    tile: { x: tileX, y: tileY },
                    viewport: { x: this.viewportX, y: this.viewportY },
                    zoom: this.zoom,
                    tileSize: this.tileSize
                });
            }
            
            // Find tile at this position
            for (const [tileId, tile] of this.tiles) {
                if (tile.x === tileX && tile.y === tileY) {
                    if (isClick) {
                        console.log('✅ Found existing tile at position:', tile);
                    }
                    return tile;
                }
            }
            
            // No existing tile found - return empty tile object for this position
            const emptyTile = {
                id: undefined, // Explicitly set to undefined for new tiles
                x: tileX,
                y: tileY,
                canvas_id: this.canvasData ? this.canvasData.id : null, // Add canvas_id for neighbor loading
                isEmpty: true,
                isNew: true
            };
            
            if (isClick) {
                console.log('✅ Created empty tile object for position:', emptyTile);
            }
            
            return emptyTile;
            
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
        
            // Draw background (outside canvas area)
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
            
            // Apply transform
            this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.viewportX, -this.viewportY);
        
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
        
            // Restore transform
        this.ctx.restore();
            
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
        // FIXED: Validate tileSize is set before calculating visible tiles
        if (!this.tileSize) {
            console.error('❌ Cannot get visible tiles: tileSize not set');
            return [];
        }
        
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
        
        // Debug viewport calculation
        console.log('🎯 Viewport calculation:', {
            viewportX: this.viewportX,
            viewportY: this.viewportY,
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            zoom: this.zoom,
            tileSize: this.tileSize,
            startX, startY, endX, endY,
            totalTiles: this.tiles.size
        });
        
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
        
        console.log(`🎯 Found ${visibleTiles.length} visible tiles out of ${this.tiles.size} total tiles`);
        
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
     * Draw canvas background (inside canvas area)
     */
    drawCanvasBackground() {
        if (!this.canvasData) return;
        
        // Draw light background for canvas area
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvasData.width, this.canvasData.height);
        
        // Add subtle texture pattern
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
     * Draw canvas boundaries
     */
    drawCanvasBoundaries() {
        if (!this.canvasData) return;
        
        // Draw canvas border
        this.ctx.strokeStyle = '#374151';
        this.ctx.lineWidth = 3 / this.zoom;
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvasData.width, this.canvasData.height);
        this.ctx.stroke();
        
        // Draw inner shadow effect
        this.ctx.strokeStyle = '#9ca3af';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.beginPath();
        this.ctx.rect(2 / this.zoom, 2 / this.zoom, this.canvasData.width - 4 / this.zoom, this.canvasData.height - 4 / this.zoom);
        this.ctx.stroke();
    }
    
    /**
     * Draw empty tile indicators
     */
    drawEmptyTileIndicators() {
        if (!this.canvasData || this.zoom < 0.5) return; // Only show at reasonable zoom levels
        
        // FIXED: Validate tileSize is set before drawing empty tile indicators
        if (!this.tileSize) {
            console.error('❌ Cannot draw empty tile indicators: tileSize not set');
            return;
        }
        
        const maxTilesX = Math.floor(this.canvasData.width / this.tileSize);
        const maxTilesY = Math.floor(this.canvasData.height / this.tileSize);
        
        // Calculate visible tile bounds
        const startTileX = Math.max(0, Math.floor(this.viewportX / this.tileSize) - 1);
        const startTileY = Math.max(0, Math.floor(this.viewportY / this.tileSize) - 1);
        const endTileX = Math.min(maxTilesX, Math.ceil((this.viewportX + this.canvas.width / this.zoom) / this.tileSize) + 1);
        const endTileY = Math.min(maxTilesY, Math.ceil((this.viewportY + this.canvas.height / this.zoom) / this.tileSize) + 1);
        
        // Draw empty tile indicators
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 1 / this.zoom;
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
                    
                    // Draw empty tile outline
                    this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
                    this.ctx.beginPath();
                    this.ctx.rect(x, y, this.tileSize, this.tileSize);
                    this.ctx.stroke();
                    
                    // Draw plus sign in center if zoom is high enough
                    if (this.zoom > 0.8) {
                        this.ctx.setLineDash([]);
                        this.ctx.strokeStyle = '#9ca3af';
                        this.ctx.lineWidth = 2 / this.zoom;
                        this.ctx.globalAlpha = 0.2;
                        
                        const centerX = x + this.tileSize / 2;
                        const centerY = y + this.tileSize / 2;
                        const plusSize = Math.min(this.tileSize * 0.2, 10 / this.zoom);
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX - plusSize, centerY);
                        this.ctx.lineTo(centerX + plusSize, centerY);
                        this.ctx.moveTo(centerX, centerY - plusSize);
                        this.ctx.lineTo(centerX, centerY + plusSize);
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Draw grid with performance optimization
     */
    drawGrid() {
        if (!this.canvasData) return;
        
        // FIXED: Validate tileSize is set before drawing grid
        if (!this.tileSize) {
            console.error('❌ Cannot draw grid: tileSize not set');
            return;
        }
        
        // Only draw grid within canvas boundaries
        const maxTilesX = Math.floor(this.canvasData.width / this.tileSize);
        const maxTilesY = Math.floor(this.canvasData.height / this.tileSize);
        
        this.ctx.strokeStyle = '#d1d5db';
        this.ctx.lineWidth = 0.5 / this.zoom;
        this.ctx.globalAlpha = 0.6;
        
        // Draw vertical lines
        for (let x = 0; x <= maxTilesX; x++) {
            const lineX = x * this.tileSize;
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, 0);
            this.ctx.lineTo(lineX, this.canvasData.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= maxTilesY; y++) {
            const lineY = y * this.tileSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, lineY);
            this.ctx.lineTo(this.canvasData.width, lineY);
            this.ctx.stroke();
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
        
        // FIXED: Validate tileSize is set before drawing
        if (!this.tileSize) {
            console.error('❌ Cannot draw tile: tileSize not set. Canvas data may not be loaded yet.');
            return;
        }
        
        const x = tile.x * this.tileSize;
        const y = tile.y * this.tileSize;
        
        try {
            // Parse pixel data
            const pixelData = typeof tile.pixel_data === 'string' 
                ? JSON.parse(tile.pixel_data) 
                : tile.pixel_data;
            
            // FIXED: Calculate tile size from pixel data structure correctly
            const tileSize = pixelData.length; // Number of rows (e.g., 32 for 32x32 tile)
            const pixelSize = this.tileSize / tileSize; // Divide canvas tile size by actual tile size
            
            console.log(`🎨 Drawing tile: ${tileSize}x${tileSize}, pixelSize: ${pixelSize}, canvas tileSize: ${this.tileSize}`);
            console.log(`🎨 Pixel data sample:`, {
                firstRow: pixelData[0]?.slice(0, 3),
                firstPixel: pixelData[0]?.[0],
                firstPixelType: typeof pixelData[0]?.[0],
                firstPixelIsArray: Array.isArray(pixelData[0]?.[0])
            });
            
            for (let py = 0; py < tileSize; py++) {
                for (let px = 0; px < tileSize; px++) {
                    const color = pixelData[py] && pixelData[py][px];
                    if (color) {
                        let fillColor = color;
                        
                        // FIXED: Handle RGBA array format [R,G,B,A] properly
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
     * Zoom in
     */
    zoomIn() {
        this.zoom = Math.min(this.maxZoom, this.zoom * 1.2);
        this.requestRender();
        this.updateZoomIndicator();
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        this.zoom = Math.max(this.minZoom, this.zoom / 1.2);
        this.requestRender();
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
        if (!this.canvasData) {
            console.warn('⚠️ Cannot center view: no canvas data');
            return;
        }
        
        if (!this.canvasData.width || !this.canvasData.height) {
            console.warn('⚠️ Cannot center view: canvas data missing dimensions');
            return;
        }
        
        if (!this.canvas) {
            console.warn('⚠️ Cannot center view: canvas element not available');
            return;
        }
        
        // Ensure canvas has valid dimensions
        if (!this.canvas.width || !this.canvas.height) {
            console.warn('⚠️ Cannot center view: canvas element has no dimensions');
            return;
        }
        
        this.viewportX = (this.canvasData.width - (this.canvas.width / this.zoom)) / 2;
        this.viewportY = (this.canvasData.height - (this.canvas.height / this.zoom)) / 2;
        
        // CRITICAL FIX: Sync viewport manager with centered view
        if (window.viewportManager && window.viewportManager.setViewport) {
            window.viewportManager.setViewport(this.viewportX, this.viewportY, this.zoom);
            console.log('🔄 Viewport manager synced with centered view');
        }
        
        console.log('🎯 Centered view:', {
            viewportX: this.viewportX,
            viewportY: this.viewportY,
            canvasWidth: this.canvasData.width,
            canvasHeight: this.canvasData.height,
            displayWidth: this.canvas.width,
            displayHeight: this.canvas.height,
            zoom: this.zoom
        });
        
        this.requestRender();
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
        // Element removed in simplified editor - zoom level still tracked internally
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
     * Clear all tiles from the canvas
     */
    clearAllTiles() {
        this.tiles.clear();
        this.visibleTilesCache = null;
        this.visibleTilesCacheKey = null;
        this.requestRender();
        console.log('✅ All tiles cleared from canvas viewer');
    }

    /**
     * Reset view to default state
     */
    resetView() {
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        this.isDragging = false;
        this.dragButton = null;
        
        // CRITICAL FIX: Sync viewport manager with reset view
        if (window.viewportManager && window.viewportManager.setViewport) {
            window.viewportManager.setViewport(this.viewportX, this.viewportY, this.zoom);
            console.log('🔄 Viewport manager synced with reset view');
        }
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Reset touch state
        this.touchState = {
            isTouching: false,
            touchCount: 0,
            startDistance: 0,
            startZoom: 1,
            startViewportX: 0,
            startViewportY: 0,
            lastTouchX: 0,
            lastTouchY: 0,
            isPinching: false,
            isPanning: false,
            touchStartTime: 0,
            hasMoved: false,
            zoomCenterX: 0,
            zoomCenterY: 0,
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            doubleTapDelay: 300,
            doubleTapDistance: 50
        };
        
        this.requestRender();
        console.log('✅ Canvas view reset');
    }

    /**
     * Reset all canvas viewer state
     */
    resetAllState() {
        console.log('🧹 Resetting all canvas viewer state...');
        
        this.clearAllTiles();
        this.resetView();
        
        // Reset canvas data
        this.canvasData = null;
        
        // Reset performance data
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.lastMiddleClickTime = 0;
        this.lastCacheUpdate = Date.now();
        this.performanceIssues = [];
        
        // Reset animation state
        this.animationQueue = [];
        this.isAnimating = false;
        this.renderRequested = false;
        this.lastRenderTime = 0;
        
        // Reset display options
        this.showGrid = true;
        this.showTileOutlines = false;
        this.showUserIndicators = true;
        
        // Reset debug overlay
        this.debugOverlay.hoverTile = null;
        this.debugOverlay.clickedTile = null;
        this.debugOverlay.mousePos = { x: 0, y: 0 };
        
        // Clear callbacks
        this.onTileClick = null;
        this.onTileDoubleClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
        
        console.log('✅ All canvas viewer state reset');
    }
    
    /**
     * Remove event listeners (for cleanup)
     */
    removeEventListeners() {
        if (!this.canvas) return;
        
        // Remove canvas event listeners
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
        
        // Remove document event listeners
        document.removeEventListener('mouseup', this.boundHandlers.documentMouseUp);
        document.removeEventListener('mousemove', this.boundHandlers.documentMouseMove);
        document.removeEventListener('keydown', this.boundHandlers.keyDown);
        
        // Remove window event listeners
        window.removeEventListener('blur', this.boundHandlers.windowBlur);
        window.removeEventListener('focus', this.boundHandlers.windowFocus);
        

        
        if (window.CONFIG_UTILS) {
            window.CONFIG_UTILS.safeLog('🧹 Event listeners removed');
        }
    }
    
    /**
     * Check if the canvas viewer is properly initialized
     */
    isInitialized() {
        return !!(this.canvas && this.ctx && this.canvas.width && this.canvas.height);
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