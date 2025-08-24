/**
 * Canvas Viewer Legacy Compatibility Layer
 * Provides backward compatibility for existing code while transitioning to new SOLID system
 * This file will be removed once the transition is complete
 */

// Remove ES6 import - this file is loaded as a regular script
// import { CanvasViewerManager } from './modules/managers/canvas-viewer-manager.js';

// Create a legacy wrapper that maintains the old API
class CanvasViewerLegacy {
    constructor() {
        this.manager = null;
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.initRetryCount = 0;
        this.maxInitRetries = 50; // Maximum 5 seconds of retries
        
        // Legacy properties for backward compatibility
        this.canvasData = null;
        this.tiles = new Map();
        this.tileSize = null;
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        
        // Legacy event callbacks
        this.onTileClick = null;
        this.onTileDoubleClick = null;
        this.onTileHover = null;
        this.onViewportChange = null;
    }
    
    /**
     * Initialize the legacy canvas viewer
     */
    init(canvasElement) {
        if (!canvasElement) {
            console.error('Canvas element not provided');
            return;
        }
        
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Check retry limit
        if (this.initRetryCount >= this.maxInitRetries) {
            console.error('❌ Failed to initialize Legacy Canvas Viewer after maximum retries');
            return;
        }
        
        // Wait for all required managers to be available globally
        if (!window.CanvasViewerManager || !window.eventManager || !window.API) {
            this.initRetryCount++;
            console.warn(`Required managers not yet available, retry ${this.initRetryCount}/${this.maxInitRetries}...`, {
                CanvasViewerManager: !!window.CanvasViewerManager,
                eventManager: !!window.eventManager,
                API: !!window.API
            });
            setTimeout(() => this.init(canvasElement), 100);
            return;
        }
        
        // Create the new manager
        if (!this.manager) {
            this.manager = new window.CanvasViewerManager(
                window.API?.canvas,
                window.API?.tiles,
                window.eventManager
            );
        }
        
        // Initialize the manager
        this.manager.init(canvasElement);
        
        this.isInitialized = true;
        console.log('✅ Legacy Canvas Viewer initialized');
    }
    
    /**
     * Set canvas data (legacy method)
     */
    setCanvasData(canvasData) {
        this.canvasData = canvasData;
        this.tileSize = canvasData.tile_size;
        
        if (this.manager) {
            // Update the manager with canvas data
            this.manager.renderer.setCanvasData(canvasData, []);
        }
    }
    
    /**
     * Load tiles (legacy method)
     */
    loadTiles(tiles) {
        this.tiles.clear();
        tiles.forEach(tile => {
            this.tiles.set(`${tile.x},${tile.y}`, tile);
        });
        
        if (this.manager) {
            // Update the manager with tiles
            this.manager.renderer.setCanvasData(this.canvasData, tiles);
        }
    }
    
    /**
     * Update tile (legacy method)
     */
    updateTile(tile) {
        this.tiles.set(`${tile.x},${tile.y}`, tile);
        
        if (this.manager) {
            this.manager.updateTile(tile);
        }
    }
    
    /**
     * Clear all tiles (legacy method)
     */
    clearAllTiles() {
        this.tiles.clear();
        
        if (this.manager) {
            this.manager.renderer.setCanvasData(this.canvasData, []);
        }
    }
    
    /**
     * Resize canvas (legacy method)
     */
    resizeCanvas() {
        if (this.manager) {
            this.manager.renderer.resizeCanvas();
        }
    }
    
    /**
     * Zoom fit (legacy method)
     */
    zoomFit() {
        if (this.manager && this.canvasData) {
            this.manager.viewportManager.resetToFit(this.canvasData);
        }
    }
    
    /**
     * Zoom in (legacy method)
     */
    zoomIn() {
        if (this.manager) {
            const viewport = this.manager.getViewport();
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.manager.viewportManager.zoom(1.2, centerX, centerY);
        }
    }
    
    /**
     * Zoom out (legacy method)
     */
    zoomOut() {
        if (this.manager) {
            const viewport = this.manager.getViewport();
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.manager.viewportManager.zoom(0.8, centerX, centerY);
        }
    }
    
    /**
     * Emergency reset (legacy method)
     */
    emergencyReset() {
        if (this.manager) {
            this.manager.cleanup();
            this.manager = null;
        }
        
        this.isInitialized = false;
        this.canvas = null;
        this.ctx = null;
        this.canvasData = null;
        this.tiles.clear();
        
        console.log('✅ Legacy Canvas Viewer emergency reset complete');
    }
}

// Create global instance for backward compatibility
const canvasViewer = new CanvasViewerLegacy();

// Export for use in other modules
window.CanvasViewer = canvasViewer;

// Export emergency reset for debugging
window.emergencyResetCanvas = () => {
    if (window.CanvasViewer) {
        window.CanvasViewer.emergencyReset();
    }
};

// Default fallback behaviors
if (!canvasViewer.onTileClick) {
    canvasViewer.onTileClick = (tile) => {
        console.log(`Tile clicked: (${tile.x}, ${tile.y})`);
        
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
        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
            console.log('Tile hover:', tile);
        }
    };
}

if (!canvasViewer.onViewportChange) {
    canvasViewer.onViewportChange = (x, y, zoom) => {
        // Only log viewport changes in debug mode to prevent console spam
        if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
            console.log('Viewport changed:', { x, y, zoom });
        }
    };
}

console.log('✅ Legacy Canvas Viewer loaded');
