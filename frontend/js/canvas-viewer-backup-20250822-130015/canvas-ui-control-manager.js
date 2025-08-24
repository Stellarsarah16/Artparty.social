/**
 * Canvas UI Control Manager
 * Handles button interactions and UI controls for the canvas viewer
 * Follows the Manager Pattern and integrates with the Event System
 */
export class CanvasUIControlManager {
    constructor(eventManager, canvasViewerManager) {
        this.eventManager = eventManager;
        this.canvasViewerManager = canvasViewerManager;
        this.buttons = {};
        this.isInitialized = false;
        
        // Bind methods to preserve 'this' context
        this.handleBackToCanvases = this.handleBackToCanvases.bind(this);
        this.handleRefresh = this.handleRefresh.bind(this);
        this.handleSettings = this.handleSettings.bind(this);
        this.handleZoomFit = this.handleZoomFit.bind(this);
        this.handleCanvasOpened = this.handleCanvasOpened.bind(this);
        this.handleCanvasClosed = this.handleCanvasClosed.bind(this);
    }
    
    /**
     * Initialize the UI control manager
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ Canvas UI Control Manager already initialized');
            return;
        }
        
        this.setupButtonHandlers();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ Canvas UI Control Manager initialized');
    }
    
    /**
     * Setup button event handlers
     */
    setupButtonHandlers() {
        // Get button references
        this.buttons = {
            backToCanvases: document.getElementById('viewer-back-to-canvases-btn'),
            refresh: document.getElementById('viewer-refresh-btn'),
            settings: document.getElementById('viewer-settings-btn'),
            zoomFit: document.getElementById('viewer-zoom-fit-btn')
        };
        
        // Verify all buttons exist
        Object.entries(this.buttons).forEach(([name, button]) => {
            if (!button) {
                console.error(`❌ Button not found: ${name}`);
            } else {
                console.log(`✅ Button found: ${name}`);
            }
        });
        
        // Setup click handlers
        if (this.buttons.backToCanvases) {
            this.buttons.backToCanvases.addEventListener('click', this.handleBackToCanvases);
        }
        
        if (this.buttons.refresh) {
            this.buttons.refresh.addEventListener('click', this.handleRefresh);
        }
        
        if (this.buttons.settings) {
            this.buttons.settings.addEventListener('click', this.handleSettings);
        }
        
        if (this.buttons.zoomFit) {
            this.buttons.zoomFit.addEventListener('click', this.handleZoomFit);
        }
    }
    
    /**
     * Setup event listeners for canvas state changes
     */
    setupEventListeners() {
        // Listen for canvas events to update button states
        this.eventManager.on('canvasOpened', this.handleCanvasOpened);
        this.eventManager.on('canvasClosed', this.handleCanvasClosed);
    }
    
    /**
     * Handle back to canvases button click
     */
    handleBackToCanvases() {
        console.log('🔄 Back to canvases button clicked');
        this.eventManager.emit('navigateToSection', 'canvas');
    }
    
    /**
     * Handle refresh button click
     */
    handleRefresh() {
        console.log('🔄 Refresh button clicked');
        if (this.canvasViewerManager.currentCanvas) {
            this.eventManager.emit('canvasRefreshRequested', this.canvasViewerManager.currentCanvas);
        }
    }
    
    /**
     * Handle settings button click
     */
    handleSettings() {
        console.log('🔄 Settings button clicked');
        if (this.canvasViewerManager.currentCanvas) {
            this.eventManager.emit('canvasSettingsRequested', this.canvasViewerManager.currentCanvas);
        }
    }
    
    /**
     * Handle zoom fit button click
     */
    handleZoomFit() {
        console.log('🔄 Zoom fit button clicked');
        if (this.canvasViewerManager.viewportManager) {
            this.canvasViewerManager.viewportManager.resetToFit(this.canvasViewerManager.currentCanvas);
        }
    }
    
    /**
     * Handle canvas opened event
     */
    handleCanvasOpened(canvas) {
        console.log('🎨 Canvas opened, enabling UI controls');
        this.setButtonsEnabled(true);
    }
    
    /**
     * Handle canvas closed event
     */
    handleCanvasClosed() {
        console.log('🎨 Canvas closed, disabling UI controls');
        this.setButtonsEnabled(false);
    }
    
    /**
     * Enable or disable all buttons
     */
    setButtonsEnabled(enabled) {
        Object.entries(this.buttons).forEach(([name, button]) => {
            if (button) {
                button.disabled = !enabled;
                console.log(`🔧 Button ${name}: ${enabled ? 'enabled' : 'disabled'}`);
            }
        });
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Remove event listeners
        if (this.buttons.backToCanvases) {
            this.buttons.backToCanvases.removeEventListener('click', this.handleBackToCanvases);
        }
        if (this.buttons.refresh) {
            this.buttons.refresh.removeEventListener('click', this.handleRefresh);
        }
        if (this.buttons.settings) {
            this.buttons.settings.removeEventListener('click', this.handleSettings);
        }
        if (this.buttons.zoomFit) {
            this.buttons.zoomFit.removeEventListener('click', this.handleZoomFit);
        }
        
        // Remove event manager listeners
        this.eventManager.off('canvasOpened', this.handleCanvasOpened);
        this.eventManager.off('canvasClosed', this.handleCanvasClosed);
        
        this.isInitialized = false;
        console.log('✅ Canvas UI Control Manager cleaned up');
    }
}
