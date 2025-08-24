/**
 * Canvas Viewer Manager
 * Coordinates canvas viewing operations and manages the viewer lifecycle
 * Uses SOLID principles with separate managers for different responsibilities
 */
import { CanvasRenderer } from './canvas-renderer.js';
import { CanvasInteractionManager } from './canvas-interaction-manager.js';
import { CanvasViewportManager } from './canvas-viewport-manager.js';
import { CanvasPerformanceManager } from './canvas-performance-manager.js';
import { CanvasDebugManager } from './canvas-debug-manager.js';

export class CanvasViewerManager {
    constructor(canvasApi, tileApi, eventManager) {
        this.canvasApi = canvasApi;
        this.tileApi = tileApi;
        this.eventManager = eventManager;
        
        // Initialize sub-managers
        this.renderer = new CanvasRenderer();
        this.interactionManager = new CanvasInteractionManager();
        this.viewportManager = new CanvasViewportManager();
        this.performanceManager = new CanvasPerformanceManager();
        this.debugManager = new CanvasDebugManager();
        
        // State
        this.currentCanvas = null;
        this.isInitialized = false;
        
        // Don't setup event listeners in constructor - wait for init()
        // this.setupEventListeners();
    }
    
    /**
     * Initialize the canvas viewer
     */
    async init(canvasElement) {
        try {
            // Initialize sub-managers
            await this.viewportManager.init(canvasElement);
            await this.renderer.init(canvasElement, this.viewportManager);
            await this.interactionManager.init(canvasElement, this.renderer);
            await this.performanceManager.init();
            await this.debugManager.init(canvasElement);
            
            // Connect managers
            this.connectManagers();
            
                    // Setup event listeners after everything is initialized
        this.setupEventListeners();
        
        // Expose help method globally
        window.showCanvasControlsHelp = this.showControlsHelp.bind(this);
        
        this.isInitialized = true;
        console.log('✅ Canvas Viewer Manager initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Canvas Viewer Manager:', error);
            throw error;
        }
    }
    
    /**
     * Connect sub-managers for communication
     */
    connectManagers() {
        // Viewport changes trigger re-render
        this.viewportManager.onViewportChange = (viewport) => {
            console.log('🔧 Viewport changed, requesting render:', viewport);
            // Request render from renderer
            this.renderer.requestRender();
            this.performanceManager.recordViewportChange();
            
            // FIXED: Update debug info with new viewport data
            this.debugManager.updateDebugInfo({
                viewport: viewport
            });
        };
        
        // Interaction events trigger viewport updates
        this.interactionManager.onPan = (deltaX, deltaY) => {
            console.log('🔧 Pan requested:', { deltaX, deltaY });
            this.viewportManager.pan(deltaX, deltaY);
        };
        
        this.interactionManager.onZoom = (zoom, centerX, centerY) => {
            console.log('🔧 Zoom requested:', { zoom, centerX, centerY });
            this.viewportManager.zoom(zoom, centerX, centerY);
        };
        
        this.interactionManager.onTileClick = (tile) => {
            console.log('🔧 Tile clicked:', tile);
            console.log('🔧 About to emit tileClick event');
            console.log('🔧 Event manager available:', !!this.eventManager);
            console.log('🔧 Event manager methods:', this.eventManager ? Object.getOwnPropertyNames(this.eventManager) : 'none');
            
            try {
                this.eventManager.emit('tileClick', tile);
                console.log('🔧 tileClick event emitted successfully');
            } catch (error) {
                console.error('❌ Failed to emit tileClick event:', error);
            }
        };
        
        // Tile hover for debug info
        this.interactionManager.onTileHover = (tile, worldPos, screenPos) => {
            // Only log when tile changes to reduce console flooding
            const currentTileKey = this.debugManager.debugInfo.hoverTile ? 
                `${this.debugManager.debugInfo.hoverTile.x},${this.debugManager.debugInfo.hoverTile.y}` : null;
            const newTileKey = tile ? `${tile.x},${tile.y}` : null;
            
            if (currentTileKey !== newTileKey) {
                if (tile) {
                    console.log('🔧 Tile hover changed to:', { tile, worldPos, screenPos });
                } else {
                    console.log('🔧 No tile hover (moved to empty area)');
                }
            }
            
            this.debugManager.updateDebugInfo({
                hoverTile: tile,
                mousePos: screenPos,
                worldPos: worldPos
            });
        };
        
        // Performance monitoring
        this.renderer.onRenderComplete = (renderTime) => {
            this.performanceManager.recordRender(renderTime);
        };
        
        // Debug manager updates
        this.debugManager.updateDebugInfo({
            viewport: this.viewportManager.getViewport(),
            performance: this.performanceManager.getMetrics()
        });
        
        console.log('✅ Manager connections established');
    }
    
    /**
     * Open and display a canvas
     */
    async openCanvas(canvas) {
        try {
            this.currentCanvas = canvas;
            
            // Load canvas data
            const canvasData = await this.canvasApi.get(canvas.id);
            const tiles = await this.tileApi.getForCanvas(canvas.id);
            
            // Debug: Log what we're getting
            console.log(`🔧 Canvas data loaded:`, canvasData);
            console.log(`🔧 Tiles loaded:`, tiles);
            console.log(`🔧 Number of tiles:`, tiles.length);
            if (tiles.length > 0) {
                console.log(`🔧 First tile structure:`, tiles[0]);
            }
            
            // Update renderer with new data
            await this.renderer.setCanvasData(canvasData, tiles);
            
            // Reset viewport to show full canvas
            this.viewportManager.resetToFit(canvasData);
            
            // Update performance tracking
            this.performanceManager.recordCanvasOpen(canvasData);
            
            // Update debug manager with canvas data for coordinate grid
            this.debugManager.updateCanvasData(canvasData);
            
            // Force update debug overlay with new canvas data
            this.debugManager.forceUpdate();
            
            // Emit event for UI controls to enable buttons
            this.eventManager.emit('canvasOpened', canvas);
            
            console.log(`✅ Canvas opened: ${canvas.name}`);
            
        } catch (error) {
            console.error('❌ Failed to open canvas:', error);
            throw error;
        }
    }
    
    /**
     * Update canvas data
     */
    async updateCanvasData(canvasData) {
        if (this.currentCanvas && this.currentCanvas.id === canvasData.id) {
            this.renderer.updateCanvasData(canvasData);
        }
    }
    
    /**
     * Update tile data
     */
    async updateTile(tileData) {
        this.renderer.updateTile(tileData);
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return this.performanceManager.getMetrics();
    }
    
    /**
     * Get performance recommendations
     */
    getPerformanceRecommendations() {
        return this.performanceManager.getRecommendations();
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugManager.setEnabled(enabled);
    }
    
    /**
     * Get current viewport
     */
    getViewport() {
        return this.viewportManager.getViewport();
    }
    
    /**
     * Set viewport constraints
     */
    setViewportConstraints(constraints) {
        this.viewportManager.setConstraints(constraints);
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.renderer.cleanup();
        this.interactionManager.cleanup();
        this.viewportManager.cleanup();
        this.performanceManager.cleanup();
        this.debugManager.cleanup();
        
        this.isInitialized = false;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners in Canvas Viewer Manager');
        
        // Listen for canvas updates
        this.eventManager.on('canvasUpdated', this.handleCanvasUpdate.bind(this));
        this.eventManager.on('tileUpdated', this.handleTileUpdate.bind(this));
        
        // Listen for tile clicks to open tile editor
        console.log('🔧 Setting up tileClick event listener');
        this.eventManager.on('tileClick', this.handleTileClick.bind(this));
        console.log('🔧 tileClick event listener set up');
        
        // Listen for UI control events
        this.eventManager.on('canvasRefreshRequested', this.handleCanvasRefresh.bind(this));
        this.eventManager.on('canvasSettingsRequested', this.handleCanvasSettings.bind(this));
        
        console.log('✅ All event listeners set up');
    }
    
    /**
     * Handle canvas updates
     */
    handleCanvasUpdate(canvasData) {
        if (this.currentCanvas && this.currentCanvas.id === canvasData.id) {
            this.updateCanvasData(canvasData);
        }
    }
    
    /**
     * Handle tile updates
     */
    handleTileUpdate(tileData) {
        this.renderer.updateTile(tileData);
    }
    
    /**
     * Handle tile clicks
     */
    handleTileClick(tile) {
        console.log(`🎯 Tile clicked in viewer:`, tile);
        console.log(`🔧 Navigation manager available:`, !!window.navigationManager);
        console.log(`🔧 Tile editor manager available:`, !!window.tileEditorManager);
        
        // Navigate to editor section first
        if (window.navigationManager) {
            console.log(`🔧 Navigating to editor section`);
            window.navigationManager.showSection('editor');
        } else {
            console.warn(`⚠️ Navigation manager not available`);
        }
        
        // Open tile editor
        if (window.tileEditorManager) {
            console.log(`🔧 Opening tile editor for tile:`, tile);
            window.tileEditorManager.openTileEditor(tile);
        } else {
            console.warn(`⚠️ Tile editor manager not available`);
        }
    }
    
    /**
     * Handle canvas refresh request
     */
    async handleCanvasRefresh(canvas) {
        console.log(`🔄 Refreshing canvas: ${canvas.name}`);
        try {
            // Reload canvas data and tiles
            const canvasData = await this.canvasApi.get(canvas.id);
            const tiles = await this.tileApi.getForCanvas(canvas.id);
            
            // Update renderer with fresh data
            await this.renderer.setCanvasData(canvasData, tiles);
            
            // Reset viewport to show full canvas
            this.viewportManager.resetToFit(canvasData);
            
            console.log(`✅ Canvas refreshed: ${canvas.name}`);
            
        } catch (error) {
            console.error('❌ Failed to refresh canvas:', error);
        }
    }
    
    /**
     * Handle canvas settings request
     */
    handleCanvasSettings(canvas) {
        console.log(`⚙️ Opening settings for canvas: ${canvas.name}`);
        
        // Open the canvas settings modal using the modal manager
        if (window.modalManager) {
            window.modalManager.showCanvasSettingsModal(canvas.id);
        } else {
            console.warn(`⚠️ Modal manager not available for canvas settings`);
        }
    }
    
    /**
     * Show controls help tooltip
     */
    showControlsHelp() {
        const helpText = `
            <div style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;">
                <h4>🎮 Canvas Controls</h4>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li><strong>Left Click:</strong> Select tiles to edit</li>
                    <li><strong>Right Click + Drag:</strong> Pan the canvas view</li>
                    <li><strong>Mouse Wheel:</strong> Zoom in/out</li>
                </ul>
            </div>
        `;
        
        // Show as a toast or tooltip
        if (window.UIManager && window.UIManager.showToast) {
            window.UIManager.showToast(helpText, 'info');
        } else {
            // Fallback to alert
            alert('Canvas Controls:\n• Left Click: Select tiles to edit\n• Right Click + Drag: Pan the canvas view\n• Mouse Wheel: Zoom in/out');
        }
    }
} 