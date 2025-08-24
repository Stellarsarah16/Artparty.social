/**
 * Canvas Viewport Manager - EXTRACTED FROM CANVAS VIEWER
 * 
 * SAFETY CRITICAL: This manager handles viewport position, zoom, and coordinate conversion.
 * It uses the EXACT SAME coordinate system logic as the working canvas viewer.
 * 
 * Key Functions:
 * - Viewport position (viewportX, viewportY) management
 * - Zoom level control with constraints
 * - Screen-to-world coordinate conversion
 * - World-to-screen coordinate conversion
 * - Viewport bounds clamping
 * - Event-driven viewport change notifications
 */

export class CanvasViewportManager {
    constructor(eventManager) {
        console.log('🔧 CanvasViewportManager initializing...');
        
        // SAFETY: Validate dependencies
        if (!eventManager) {
            throw new Error('CanvasViewportManager requires eventManager');
        }
        
        this.eventManager = eventManager;
        
        // EXACT SAME viewport properties as canvas viewer
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;
        
        // Canvas reference for coordinate calculations
        this.canvas = null;
        
        // Event callbacks (for backward compatibility)
        this.onViewportChange = null;
        
        // Performance optimization
        this.lastViewportChangeTime = 0;
        this.viewportChangeThrottle = 16; // ~60fps
        
        console.log('✅ CanvasViewportManager initialized');
    }
    
    /**
     * SAFETY: Initialize with canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element for coordinate calculations
     */
    init(canvas) {
        if (!canvas) {
            throw new Error('CanvasViewportManager.init() requires canvas element');
        }
        
        this.canvas = canvas;
        console.log('🔧 CanvasViewportManager initialized with canvas');
    }
    
    /**
     * EXACT SAME pan logic as canvas viewer
     * Updates viewport position based on screen-space deltas
     * @param {number} deltaX - Screen-space X delta (pixels)
     * @param {number} deltaY - Screen-space Y delta (pixels)
     */
    pan(deltaX, deltaY) {
        // EXACT SAME logic: convert screen delta to world space and update viewport
        this.viewportX -= deltaX / this.zoom;
        this.viewportY -= deltaY / this.zoom;
        
        // EXACT SAME clamping logic
        this.clampViewport();
        
        // Notify of viewport change
        this.notifyViewportChange();
    }
    
    /**
     * EXACT SAME zoom logic as canvas viewer
     * @param {number} factor - Zoom factor (e.g., 1.1 for zoom in, 0.9 for zoom out)
     * @param {number} centerX - Screen X coordinate to zoom towards
     * @param {number} centerY - Screen Y coordinate to zoom towards
     */
    zoomToward(factor, centerX, centerY) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        
        if (newZoom !== this.zoom) {
            // EXACT SAME zoom logic: convert screen center to world, update zoom, adjust viewport
            const worldX = (centerX / this.zoom) + this.viewportX;
            const worldY = (centerY / this.zoom) + this.viewportY;
            
            this.zoom = newZoom;
            
            this.viewportX = worldX - (centerX / this.zoom);
            this.viewportY = worldY - (centerY / this.zoom);
            
            // EXACT SAME clamping logic
            this.clampViewport();
            
            // Notify of viewport change
            this.notifyViewportChange();
        }
    }
    
    /**
     * EXACT SAME coordinate conversion as canvas viewer
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} World coordinates {x, y}
     */
    screenToWorld(screenX, screenY) {
        if (!this.canvas) {
            console.error('❌ Cannot convert coordinates: canvas not initialized');
            return { x: 0, y: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        // EXACT SAME conversion logic
        const worldX = (canvasX / this.zoom) + this.viewportX;
        const worldY = (canvasY / this.zoom) + this.viewportY;
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    worldToScreen(worldX, worldY) {
        if (!this.canvas) {
            console.error('❌ Cannot convert coordinates: canvas not initialized');
            return { x: 0, y: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        
        // Inverse of screenToWorld
        const canvasX = (worldX - this.viewportX) * this.zoom;
        const canvasY = (worldY - this.viewportY) * this.zoom;
        
        const screenX = canvasX + rect.left;
        const screenY = canvasY + rect.top;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * EXACT SAME viewport clamping as canvas viewer
     * Clamp viewport to reasonable bounds to prevent performance issues
     */
    clampViewport() {
        const maxBound = 100000; // EXACT SAME value as canvas viewer
        this.viewportX = Math.max(-maxBound, Math.min(maxBound, this.viewportX));
        this.viewportY = Math.max(-maxBound, Math.min(maxBound, this.viewportY));
    }
    
    /**
     * Set viewport directly (with validation and clamping)
     * @param {number} x - Viewport X position
     * @param {number} y - Viewport Y position
     * @param {number} zoom - Zoom level
     */
    setViewport(x, y, zoom) {
        // Validate parameters
        if (isNaN(x) || isNaN(y) || isNaN(zoom)) {
            console.error('❌ Invalid viewport parameters:', { x, y, zoom });
            return;
        }
        
        // Apply constraints
        this.viewportX = x;
        this.viewportY = y;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        
        // Clamp to prevent extreme values
        this.clampViewport();
        
        // Notify of viewport change
        this.notifyViewportChange();
    }
    
    /**
     * Get current viewport state
     * @returns {Object} Current viewport {x, y, zoom}
     */
    getViewport() {
        return {
            x: this.viewportX,
            y: this.viewportY,
            zoom: this.zoom
        };
    }
    
    /**
     * Reset viewport to show entire canvas
     * @param {Object} canvasData - Canvas data with width/height
     */
    resetToFit(canvasData) {
        if (!canvasData || !this.canvas) {
            console.warn('⚠️ Cannot reset viewport: missing canvas data or canvas element');
            return;
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const canvasAspect = canvasRect.width / canvasRect.height;
        const dataAspect = canvasData.width / canvasData.height;
        
        let zoom;
        if (canvasAspect > dataAspect) {
            // Canvas is wider than data - fit to height
            zoom = canvasRect.height / canvasData.height;
        } else {
            // Canvas is taller than data - fit to width
            zoom = canvasRect.width / canvasData.width;
        }
        
        // Center the viewport
        const centerX = canvasData.width / 2;
        const centerY = canvasData.height / 2;
        
        this.setViewport(
            centerX - (canvasRect.width / 2) / zoom,
            centerY - (canvasRect.height / 2) / zoom,
            zoom
        );
        
        console.log('🔧 Viewport reset to fit canvas:', this.getViewport());
    }
    
    /**
     * Zoom in by fixed factor
     */
    zoomIn() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.zoomToward(1.2, centerX, centerY);
    }
    
    /**
     * Zoom out by fixed factor
     */
    zoomOut() {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        this.zoomToward(0.8, centerX, centerY);
    }
    
    /**
     * Notify listeners of viewport changes (throttled for performance)
     */
    notifyViewportChange() {
        const now = Date.now();
        if (now - this.lastViewportChangeTime < this.viewportChangeThrottle) {
            return; // Throttle viewport change notifications
        }
        this.lastViewportChangeTime = now;
        
        // Emit event for new architecture
        this.eventManager.emit('viewport:changed', this.getViewport());
        
        // Call callback for backward compatibility
        if (this.onViewportChange) {
            this.onViewportChange(this.viewportX, this.viewportY, this.zoom);
        }
    }
    
    /**
     * Set zoom constraints
     * @param {number} minZoom - Minimum zoom level
     * @param {number} maxZoom - Maximum zoom level
     */
    setZoomConstraints(minZoom, maxZoom) {
        this.minZoom = Math.max(0.01, minZoom);
        this.maxZoom = Math.min(100, maxZoom);
        
        // Clamp current zoom to new constraints
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    }
    
    /**
     * Check if a world coordinate is visible in current viewport
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {boolean} True if coordinate is visible
     */
    isVisible(worldX, worldY) {
        if (!this.canvas) return false;
        
        const rect = this.canvas.getBoundingClientRect();
        const viewLeft = this.viewportX;
        const viewRight = this.viewportX + (rect.width / this.zoom);
        const viewTop = this.viewportY;
        const viewBottom = this.viewportY + (rect.height / this.zoom);
        
        return worldX >= viewLeft && worldX <= viewRight && 
               worldY >= viewTop && worldY <= viewBottom;
    }
    
    /**
     * Get visible world bounds
     * @returns {Object} Visible bounds {left, right, top, bottom}
     */
    getVisibleBounds() {
        if (!this.canvas) {
            return { left: 0, right: 0, top: 0, bottom: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        return {
            left: this.viewportX,
            right: this.viewportX + (rect.width / this.zoom),
            top: this.viewportY,
            bottom: this.viewportY + (rect.height / this.zoom)
        };
    }
    
    /**
     * Cleanup method
     */
    cleanup() {
        console.log('🔧 Cleaning up CanvasViewportManager...');
        this.canvas = null;
        this.onViewportChange = null;
    }
}

export default CanvasViewportManager;
