/**
 * Canvas Viewer Coordinator
 * 
 * Lightweight coordinator that delegates all functionality to specialized managers
 * while providing a clean public API for backward compatibility.
 * 
 * SOLID Principles Applied:
 * - S: Single Responsibility - ONLY coordinates managers and provides public API
 * - O: Open/Closed - New managers can be added without modifying coordinator
 * - L: Liskov Substitution - Managers can be swapped without breaking system
 * - I: Interface Segregation - Clean, focused APIs for each component
 * - D: Dependency Inversion - Depends on manager abstractions, not implementations
 */

class CanvasViewer {
    constructor() {
        console.log('🔧 CanvasViewer coordinator initializing...');
        
        // Canvas element reference
        this.canvas = null;
        
        // State managed by coordinator for public API compatibility
        this.canvasData = null;
        this._isInitialized = false;
        
        // Manager references (injected during initialization)
        this.viewportManager = null;
        this.rendererManager = null;
        this.interactionManager = null;
        this.debugManager = null;
        
        // Public callbacks for backward compatibility
        this.onTileClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
        
        // Bound methods for event handling
        this.boundResizeCanvas = this.resizeCanvas.bind(this);
        
        console.log('✅ CanvasViewer coordinator initialized');
    }
    
    /**
     * Initialize the canvas viewer with managers
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    init(canvas) {
        if (!canvas) {
            console.error('❌ Canvas element not provided');
            return false;
        }
        
        if (this._isInitialized) {
            console.warn('⚠️ CanvasViewer already initialized');
            return true;
        }
        
        console.log('🔧 Initializing CanvasViewer coordinator...');
        
        this.canvas = canvas;
        
        // Initialize managers
        if (!this.initializeManagers()) {
            console.error('❌ Failed to initialize managers');
            return false;
        }
        
        // Setup resize handling
        this.resizeCanvas();
        window.addEventListener('resize', this.boundResizeCanvas);
        
        // Setup event coordination between managers
        this.setupManagerCoordination();
        
        // Setup tile update listeners
        this.setupTileUpdateListeners();
        
        this._isInitialized = true;
        console.log('✅ CanvasViewer coordinator initialized successfully');
        
        // Initial render to show canvas
        if (this.rendererManager && this.rendererManager.requestRender) {
            this.rendererManager.requestRender();
        }
        
        return true;
    }
    
    /**
     * Initialize all managers with canvas element
     * @returns {boolean} Success status
     */
    initializeManagers() {
        try {
            // Get manager references from global scope
            this.viewportManager = window.viewportManager;
            this.rendererManager = window.rendererManager;
            this.interactionManager = window.interactionManager;
            this.debugManager = window.debugManager;
            
            // Validate critical managers are available
            if (!this.viewportManager) {
                console.error('❌ ViewportManager not available');
                return false;
            }
            
            if (!this.rendererManager) {
                console.error('❌ RendererManager not available');
                return false;
            }
            
            if (!this.interactionManager) {
                console.error('❌ InteractionManager not available');
                return false;
            }
            
            // Initialize viewport manager
            if (this.viewportManager.setCanvas) {
                this.viewportManager.setCanvas(this.canvas);
                console.log('✅ ViewportManager initialized');
            }
            
            // Initialize renderer manager
            if (this.rendererManager.init) {
                this.rendererManager.init(this.canvas);
                if (this.rendererManager.setViewport) {
                    this.rendererManager.setViewport(this.viewportManager);
                }
                console.log('✅ RendererManager initialized');
            }
            
            // Initialize interaction manager
            if (this.interactionManager.init) {
                this.interactionManager.init(this.canvas);
                if (this.interactionManager.setViewport) {
                    this.interactionManager.setViewport(this.viewportManager);
                }
                console.log('✅ InteractionManager initialized');
            }
            
            // Initialize debug manager (optional)
            if (this.debugManager && this.debugManager.init) {
                this.debugManager.init(this.canvas);
                console.log('✅ DebugManager initialized');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error initializing managers:', error);
            return false;
        }
    }
    
    /**
     * Setup coordination between managers
     */
    setupManagerCoordination() {
        console.log('🔧 Setting up manager coordination...');
        
        // Connect viewport changes to renderer
        if (this.viewportManager) {
            this.viewportManager.onViewportChange = (x, y, zoom) => {
                // Trigger re-render when viewport changes
                if (this.rendererManager && this.rendererManager.requestRender) {
                    this.rendererManager.requestRender();
                }
                
                // Call public callback for backward compatibility
                if (this.onViewportChange) {
                    this.onViewportChange(x, y, zoom);
                }
            };
        } else {
            console.error('❌ ViewportManager not available for coordination');
        }
        
        // Connect tile clicks from interaction manager to public API
        if (this.interactionManager) {
            console.log('🔧 Setting up tile click callback');
            this.interactionManager.onTileClick = (tile) => {
                console.log('🎯 Tile click coordinated:', tile);
                
                // Add canvas_id for compatibility
                if (this.canvasData && this.canvasData.id) {
                    tile.canvas_id = this.canvasData.id;
                }
                
                // Call public callback
                if (this.onTileClick) {
                    this.onTileClick(tile);
                }
            };
            console.log('✅ Tile click callback set successfully');
        } else {
            console.error('❌ InteractionManager not available for coordination');
        }
        
        // Connect tile hover from interaction manager to public API
        if (this.interactionManager) {
            this.interactionManager.onTileHover = (tile) => {
                // Call public callback (only in debug mode to prevent spam)
                if (this.onTileHover && window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                    this.onTileHover(tile);
                }
            };
        }
        
        console.log('✅ Manager coordination setup complete');
    }
    
    /**
     * Setup tile update listeners for real-time updates
     */
    setupTileUpdateListeners() {
        if (window.eventManager) {
            console.log('🔧 Setting up tile update listeners...');
            
            // Listen for tile created events
            window.eventManager.on('tileCreated', (tile) => {
                this.handleTileUpdate(tile);
            });
            
            // Listen for tile updated events
            window.eventManager.on('tileUpdated', (tile) => {
                this.handleTileUpdate(tile);
            });
            
            console.log('✅ Tile update listeners setup complete');
        }
    }
    
    /**
     * Handle tile updates from real-time events
     * @param {Object} tile - Updated tile data
     */
    handleTileUpdate(tile) {
        if (!tile || !tile.id) {
            console.warn('⚠️ Invalid tile data for update:', tile);
            return;
        }
        
        console.log('🔄 Handling tile update:', tile.id);
        
        // Update tile in renderer
        if (this.rendererManager && this.rendererManager.addTile) {
            this.rendererManager.addTile(tile);
            
            // Update interaction manager with updated tiles
            if (this.interactionManager && this.interactionManager.setTiles && this.rendererManager.tiles) {
                this.interactionManager.setTiles(this.rendererManager.tiles);
            }
        }
        
        // Request re-render
        if (this.rendererManager && this.rendererManager.requestRender) {
            this.rendererManager.requestRender();
        }
    }
    
    // ========================================
    // PUBLIC API METHODS (for backward compatibility)
    // ========================================
    
    /**
     * Check if canvas viewer is initialized
     * @returns {boolean} Initialization status
     */
    isInitialized() {
        return this._isInitialized;
    }
    
    /**
     * Set canvas data and update all managers
     * @param {Object} canvasData - Canvas data object
     */
    setCanvasData(canvasData) {
        if (!canvasData || typeof canvasData !== 'object') {
            console.error('❌ Invalid canvas data provided:', canvasData);
            return;
        }
        
        console.log('🔧 Setting canvas data in coordinator:', canvasData);
        
        // Store canvas data for public API
        this.canvasData = canvasData;
        
        // Update all managers with canvas data
        this.updateManagersWithCanvasData(canvasData);
        
        // Center view on canvas
        if (canvasData.width && canvasData.height) {
            this.centerView();
        }
        
        console.log('✅ Canvas data set in coordinator');
    }
    
    /**
     * Update all managers with canvas data
     * @param {Object} canvasData - Canvas data
     */
    updateManagersWithCanvasData(canvasData) {
        console.log('🔧 Updating managers with canvas data...');
        
        // Update viewport manager
        if (this.viewportManager && this.viewportManager.setCanvasData) {
            this.viewportManager.setCanvasData(canvasData);
        }
        
        // Update renderer manager
        if (this.rendererManager && this.rendererManager.setCanvasData) {
            this.rendererManager.setCanvasData(canvasData);
        }
        
        // Update interaction manager
        if (this.interactionManager && this.interactionManager.setCanvasData) {
            this.interactionManager.setCanvasData(canvasData);
        }
        
        console.log('✅ All managers updated with canvas data');
    }
    
    /**
     * Load tiles into the renderer
     * @param {Array} tiles - Array of tile objects
     */
    loadTiles(tiles) {
        if (!Array.isArray(tiles)) {
            console.error('❌ Invalid tiles data provided:', tiles);
            return;
        }
        
        console.log('🔧 Loading tiles in coordinator:', tiles.length);
        
        // Load tiles into renderer
        if (this.rendererManager && this.rendererManager.loadTiles) {
            this.rendererManager.loadTiles(tiles);
            
            // CRITICAL FIX: Pass tiles to interaction manager for tile detection
            if (this.interactionManager && this.interactionManager.setTiles && this.rendererManager.tiles) {
                this.interactionManager.setTiles(this.rendererManager.tiles);
                console.log('🔧 Tiles passed to interaction manager for tile detection');
            }
        }
        
        console.log('✅ Tiles loaded in coordinator');
    }
    
    /**
     * Add a single tile
     * @param {Object} tile - Tile object
     * @param {boolean} animate - Whether to animate the addition
     */
    addTile(tile, animate = true) {
        if (!tile || !tile.id) {
            console.error('❌ Invalid tile data:', tile);
            return;
        }
        
        console.log('🔧 Adding tile in coordinator:', tile.id);
        
        // Add tile to renderer
        if (this.rendererManager && this.rendererManager.addTile) {
            this.rendererManager.addTile(tile, animate);
            
            // Update interaction manager with updated tiles
            if (this.interactionManager && this.interactionManager.setTiles && this.rendererManager.tiles) {
                this.interactionManager.setTiles(this.rendererManager.tiles);
            }
        }
    }
    
    /**
     * Remove a tile
     * @param {number} tileId - Tile ID to remove
     * @param {boolean} animate - Whether to animate the removal
     */
    removeTile(tileId, animate = true) {
        if (!tileId) {
            console.error('❌ Invalid tile ID:', tileId);
            return;
        }
        
        console.log('🔧 Removing tile in coordinator:', tileId);
        
        // Remove tile from renderer
        if (this.rendererManager && this.rendererManager.removeTile) {
            this.rendererManager.removeTile(tileId, animate);
        }
    }
    
    /**
     * Get tile at screen position
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @returns {Object|null} Tile object or null
     */
    getTileAtPosition(x, y) {
        if (this.interactionManager && this.interactionManager.getTileAtPosition) {
            return this.interactionManager.getTileAtPosition(x, y);
        }
        return null;
    }
    
    /**
     * Center view on canvas
     */
    centerView() {
        console.log('🔧 Centering view in coordinator');
        
        if (this.viewportManager && this.viewportManager.centerView) {
            this.viewportManager.centerView();
        }
    }
    
    /**
     * Reset view to default
     */
    resetView() {
        console.log('🔧 Resetting view in coordinator');
        
        if (this.viewportManager && this.viewportManager.resetView) {
            this.viewportManager.resetView();
        }
    }
    
    /**
     * Reset zoom to 1.0
     */
    resetZoom() {
        console.log('🔧 Resetting zoom in coordinator');
        
        if (this.viewportManager && this.viewportManager.resetZoom) {
            this.viewportManager.resetZoom();
        }
    }
    
    /**
     * Zoom in
     */
    zoomIn() {
        console.log('🔧 Zooming in via coordinator');
        
        if (this.viewportManager && this.viewportManager.zoomIn) {
            this.viewportManager.zoomIn();
        }
    }
    
    /**
     * Zoom out
     */
    zoomOut() {
        console.log('🔧 Zooming out via coordinator');
        
        if (this.viewportManager && this.viewportManager.zoomOut) {
            this.viewportManager.zoomOut();
        }
    }
    
    /**
     * Toggle grid display
     */
    toggleGrid() {
        console.log('🔧 Toggling grid via coordinator');
        
        if (this.rendererManager && this.rendererManager.toggleGrid) {
            this.rendererManager.toggleGrid();
        }
    }
    
    /**
     * Toggle user indicators
     */
    toggleUserIndicators() {
        console.log('🔧 Toggling user indicators via coordinator');
        
        if (this.rendererManager && this.rendererManager.toggleUserIndicators) {
            this.rendererManager.toggleUserIndicators();
        }
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const availableWidth = containerRect.width - 10; // Account for padding
        const maxWidth = 1200;
        let canvasWidth = Math.min(maxWidth, availableWidth);
        canvasWidth = Math.max(400, canvasWidth);
        const canvasHeight = Math.max(267, Math.floor(canvasWidth * (2 / 3)));
        
        this.canvas.width = Math.floor(canvasWidth);
        this.canvas.height = Math.floor(canvasHeight);
        
        // Request re-render after resize
        if (this.rendererManager && this.rendererManager.requestRender) {
            this.rendererManager.requestRender();
        }
        
        console.log(`📐 Canvas resized via coordinator: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Emergency reset for error recovery
     */
    emergencyReset() {
        console.log('🚨 Emergency reset via coordinator');
        
        // Reset all managers
        if (this.viewportManager && this.viewportManager.emergencyReset) {
            this.viewportManager.emergencyReset();
        }
        
        if (this.rendererManager && this.rendererManager.emergencyReset) {
            this.rendererManager.emergencyReset();
        }
        
        if (this.interactionManager && this.interactionManager.emergencyReset) {
            this.interactionManager.emergencyReset();
        }
        
        // Reset coordinator state
        this.canvasData = null;
        this.onTileClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
        
        console.log('✅ Emergency reset complete');
    }
    
    // ========================================
    // PUBLIC PROPERTIES (for backward compatibility)
    // ========================================
    
    /**
     * Get current viewport X (read-only)
     */
    get viewportX() {
        if (this.viewportManager && this.viewportManager.getViewport) {
            return this.viewportManager.getViewport().x || 0;
        }
        return 0;
    }
    
    /**
     * Get current viewport Y (read-only)
     */
    get viewportY() {
        if (this.viewportManager && this.viewportManager.getViewport) {
            return this.viewportManager.getViewport().y || 0;
        }
        return 0;
    }
    
    /**
     * Get current zoom level (read-only)
     */
    get zoom() {
        if (this.viewportManager && this.viewportManager.getViewport) {
            return this.viewportManager.getViewport().zoom || 1;
        }
        return 1;
    }
}

// Create global instance for backward compatibility
const canvasViewer = new CanvasViewer();
window.CanvasViewer = canvasViewer;

console.log('✅ CanvasViewer coordinator loaded and globally available');
