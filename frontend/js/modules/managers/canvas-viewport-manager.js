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
     * CRITICAL FIX: Set canvas element reference
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    setCanvas(canvas) {
        this.canvas = canvas;
        console.log('🔧 CanvasViewportManager canvas element set:', canvas);
    }
    
    /**
     * CRITICAL FIX: Set canvas data for proper viewport clamping
     * @param {Object} canvasData - Canvas data with width/height
     */
    setCanvasData(canvasData) {
        this.canvasData = canvasData;
        console.log('🔧 CanvasViewportManager canvas data set:', canvasData);
        
        // Re-clamp viewport with new canvas data
        this.clampViewport();
    }
    
    /**
     * EXACT SAME pan logic as canvas viewer
     * Updates viewport position based on screen-space deltas
     * @param {number} deltaX - Screen-space X delta (pixels)
     * @param {number} deltaY - Screen-space Y delta (pixels)
     */
    pan(deltaX, deltaY) {
        const oldX = this.viewportX;
        const oldY = this.viewportY;
        
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
     * Center view on canvas
     */
    centerView() {
        if (!this.canvasData || !this.canvas) {
            console.warn('⚠️ Cannot center view - missing canvas data or element');
            return;
        }
        
        console.log('🔧 Centering view on canvas');
        
        // Calculate center position - EXACT SAME formula as original
        const canvasWidth = this.canvasData.width || 1024;
        const canvasHeight = this.canvasData.height || 1024;
        
        // Center the canvas in the viewport - EXACT SAME as original
        this.viewportX = (canvasWidth - (this.canvas.width / this.zoom)) / 2;
        this.viewportY = (canvasHeight - (this.canvas.height / this.zoom)) / 2;
        
        // Clamp and notify
        this.clampViewport();
        this.notifyViewportChange();
    }
    
    /**
     * Reset view to default
     */
    resetView() {
        console.log('🔧 Resetting view to default');
        
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        
        // Center if canvas data is available
        if (this.canvasData && this.canvas) {
            this.centerView();
        } else {
            this.clampViewport();
            this.notifyViewportChange();
        }
    }
    
    /**
     * Reset zoom to 1.0
     */
    resetZoom() {
        console.log('🔧 Resetting zoom to 1.0');
        
        this.zoom = 1;
        this.clampViewport();
        this.notifyViewportChange();
    }
    
    /**
     * Emergency reset for error recovery
     */
    emergencyReset() {
        console.log('🚨 Emergency reset in CanvasViewportManager');
        
        // Reset all viewport properties
        this.viewportX = 0;
        this.viewportY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 10;
        
        // Clear canvas data
        this.canvasData = null;
        
        // Notify change
        this.notifyViewportChange();
        
        console.log('✅ CanvasViewportManager emergency reset complete');
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
     * CRITICAL FIX: Enhanced viewport clamping to keep canvas always visible
     * Prevents dragging canvas completely offscreen while allowing reasonable bounds
     */
    clampViewport() {
        // Keep the old extreme bounds check for performance
        const maxBound = 100000;
        const originalX = this.viewportX;
        const originalY = this.viewportY;
        
        this.viewportX = Math.max(-maxBound, Math.min(maxBound, this.viewportX));
        this.viewportY = Math.max(-maxBound, Math.min(maxBound, this.viewportY));
        
        // CRITICAL FIX: Keep canvas always visible
        if (this.canvas && this.canvasData) {
            const rect = this.canvas.getBoundingClientRect();
            const viewportWidth = rect.width / this.zoom;
            const viewportHeight = rect.height / this.zoom;
            
            // CRITICAL FIX: Handle case where viewport is larger than canvas (zoomed out)
            const minOverlapPixels = 100;
            const minOverlapPercent = 0.2;
            const minVisibleWidth = Math.min(minOverlapPixels, this.canvasData.width * minOverlapPercent);
            const minVisibleHeight = Math.min(minOverlapPixels, this.canvasData.height * minOverlapPercent);
            
            let minViewportX, maxViewportX, minViewportY, maxViewportY;
            
            if (viewportWidth >= this.canvasData.width) {
                // Viewport is wider than canvas - center the canvas horizontally
                const centerOffset = (viewportWidth - this.canvasData.width) / 2;
                minViewportX = -centerOffset;
                maxViewportX = -centerOffset;
            } else {
                // Viewport is narrower than canvas - normal clamping
                maxViewportX = this.canvasData.width - minVisibleWidth;
                minViewportX = -(viewportWidth - minVisibleWidth);
            }
            
            if (viewportHeight >= this.canvasData.height) {
                // Viewport is taller than canvas - center the canvas vertically
                const centerOffset = (viewportHeight - this.canvasData.height) / 2;
                minViewportY = -centerOffset;
                maxViewportY = -centerOffset;
            } else {
                // Viewport is shorter than canvas - normal clamping
                maxViewportY = this.canvasData.height - minVisibleHeight;
                minViewportY = -(viewportHeight - minVisibleHeight);
            }
            
            // Apply the clamping
            const clampedX = Math.max(minViewportX, Math.min(maxViewportX, this.viewportX));
            const clampedY = Math.max(minViewportY, Math.min(maxViewportY, this.viewportY));
            
            // CRITICAL: Always apply clamped values
            const wasChanged = (Math.abs(clampedX - this.viewportX) > 0.001 || Math.abs(clampedY - this.viewportY) > 0.001);
            
            this.viewportX = clampedX;
            this.viewportY = clampedY;
            
            // Only log when actually clamped
            if (wasChanged) {
                console.log(`🔒 Viewport clamped: (${originalX.toFixed(1)}, ${originalY.toFixed(1)}) → (${this.viewportX.toFixed(1)}, ${this.viewportY.toFixed(1)})`);
            }
        }
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
     * CRITICAL FIX: Zoom in by fixed factor, centered on viewport middle
     */
    zoomIn() {
        if (!this.canvas) return;
        
        this.zoomCentered(1.2);
    }
    
    /**
     * CRITICAL FIX: Zoom out by fixed factor, centered on viewport middle
     */
    zoomOut() {
        if (!this.canvas) return;
        
        this.zoomCentered(0.8);
    }
    
    /**
     * CRITICAL FIX: Zoom centered on viewport middle (not mouse position)
     * @param {number} factor - Zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out)
     */
    zoomCentered(factor) {
        if (!this.canvas) return;
        
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        
        if (newZoom !== this.zoom) {
            const rect = this.canvas.getBoundingClientRect();
            
            // Calculate the center of the current viewport in world coordinates
            const currentViewportCenterX = this.viewportX + (rect.width / 2) / this.zoom;
            const currentViewportCenterY = this.viewportY + (rect.height / 2) / this.zoom;
            
            // Update zoom
            this.zoom = newZoom;
            
            // Adjust viewport to keep the same world center point in the middle of the screen
            this.viewportX = currentViewportCenterX - (rect.width / 2) / this.zoom;
            this.viewportY = currentViewportCenterY - (rect.height / 2) / this.zoom;
            
            // Clamp to keep canvas visible
            this.clampViewport();
            
            // Notify of viewport change
            this.notifyViewportChange();
            
            console.log(`🔍 Centered zoom: ${factor}x → zoom: ${this.zoom.toFixed(2)}, center: (${currentViewportCenterX.toFixed(1)}, ${currentViewportCenterY.toFixed(1)})`);
        }
    }
    
    /**
     * Notify listeners of viewport changes (throttled for performance)
     */
    notifyViewportChange() {
        const now = Date.now();
        if (now - this.lastViewportChangeTime < this.viewportChangeThrottle) {
            console.log('🔄 Viewport change throttled');
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
     * DEBUG: Manual test function for clamping
     */
    testClamping() {
        console.log('🧪 TESTING VIEWPORT CLAMPING');
        console.log('============================');
        console.log('Canvas element:', this.canvas);
        console.log('Canvas data:', this.canvasData);
        console.log('Current viewport:', this.getViewport());
        
        if (this.canvas && this.canvasData) {
            const rect = this.canvas.getBoundingClientRect();
            console.log('Canvas rect:', rect);
            console.log('Zoom:', this.zoom);
            console.log('Viewport size in world units:', {
                width: rect.width / this.zoom,
                height: rect.height / this.zoom
            });
        }
        
        // Force a clamp
        this.clampViewport();
        console.log('After clamp:', this.getViewport());
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
