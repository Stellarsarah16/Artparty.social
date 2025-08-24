/**
 * Canvas Viewport Manager
 * Manages viewport position, zoom, and camera operations
 */
export class CanvasViewportManager {
    constructor() {
        this.viewport = {
            x: 0,
            y: 0,
            zoom: 1
        };
        
        this.constraints = {
            minZoom: 0.1,
            maxZoom: 10,
            panBounds: null
        };
        
        // Event callbacks
        this.onViewportChange = null;
        
        // Smoothing
        this.smoothPan = false;
        this.smoothZoom = false;
        this.animationFrame = null;
        
        // Debounce viewport resets
        this.resetTimeout = null;
        this.lastResetTime = 0;
    }
    
    /**
     * Initialize the viewport manager
     */
    async init(canvasElement) {
        this.canvas = canvasElement;
        // Canvas Viewport Manager initialized
    }
    
    /**
     * Set viewport constraints
     */
    setConstraints(constraints) {
        this.constraints = { ...this.constraints, ...constraints };
    }
    
    /**
     * FIXED: Pan the viewport using world units and correct signs
     */
    pan(deltaX, deltaY) {
        // FIXED: Convert screen-space deltas to world space and invert signs
        // Drag right means world should slide right, so viewport center moves left
        const newX = this.viewport.x - (deltaX / this.viewport.zoom);
        const newY = this.viewport.y - (deltaY / this.viewport.zoom);
        
        console.log(`🔧 Pan: screen delta (${deltaX}, ${deltaY}) → world delta (${deltaX / this.viewport.zoom}, ${deltaY / this.viewport.zoom}) → new viewport (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
        
        this.setViewport(newX, newY, this.viewport.zoom);
    }
    
    /**
     * Zoom the viewport
     */
    zoom(factor, centerX, centerY) {
        const newZoom = Math.max(
            this.constraints.minZoom,
            Math.min(this.constraints.maxZoom, this.viewport.zoom * factor)
        );
        
        // Calculate zoom center in world coordinates
        // centerX and centerY are screen coordinates, convert to world
        const worldCenterX = (centerX / this.viewport.zoom) + this.viewport.x;
        const worldCenterY = (centerY / this.viewport.zoom) + this.viewport.y;
        
        // Calculate new viewport position to keep zoom center fixed
        const newX = worldCenterX - (centerX / newZoom);
        const newY = worldCenterY - (centerY / newZoom);
        
        this.setViewport(newX, newY, newZoom);
    }
    
    /**
     * Set viewport directly
     */
    setViewport(x, y, zoom) {
        console.log(`🔧 setViewport called with:`, { x, y, zoom, oldViewport: { ...this.viewport } });
        
        // Validate input parameters
        if (isNaN(x) || isNaN(y) || isNaN(zoom)) {
            console.error('❌ Invalid viewport parameters:', { x, y, zoom });
            return;
        }
        
        // Apply constraints
        const constrainedZoom = Math.max(
            this.constraints.minZoom,
            Math.min(this.constraints.maxZoom, zoom)
        );
        
        let constrainedX = x;
        let constrainedY = y;
        
        // Apply pan bounds if set
        if (this.constraints.panBounds) {
            const bounds = this.constraints.panBounds;
            constrainedX = Math.max(bounds.left, Math.min(bounds.right, x));
            constrainedY = Math.max(bounds.top, Math.min(bounds.bottom, y));
        }
        
        // Update viewport
        this.viewport.x = constrainedX;
        this.viewport.y = constrainedY;
        this.viewport.zoom = constrainedZoom;
        
        console.log(`🔧 Viewport updated:`, { 
            input: { x, y, zoom },
            constrained: { x: constrainedX, y: constrainedY, zoom: constrainedZoom },
            final: { ...this.viewport }
        });
        
        // FIXED: Emit change event with both old and new viewport for proper debugging
        if (this.onViewportChange) {
            this.onViewportChange(this.viewport);
        } else {
            console.warn(`⚠️ No onViewportChange callback set`);
        }
    }
    
    /**
     * Reset viewport to fit canvas
     * Uses the proven coordinate system from the original canvas viewer
     */
    resetToFit(canvasData) {
        if (!this.canvas) {
            console.warn('⚠️ Canvas element not available for viewport reset');
            return;
        }
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Use the proven coordinate system from the original canvas viewer
        // Set zoom to 1 initially (like the original)
        const initialZoom = 1;
        
        // Use the original centerView logic for viewport positioning
        const viewportX = (canvasData.width - (canvasWidth / initialZoom)) / 2;
        const viewportY = (canvasData.height - (canvasHeight / initialZoom)) / 2;
        
        console.log(`🔧 Reset to fit (original logic):`, {
            canvasSize: `${canvasData.width}x${canvasData.height}`,
            screenSize: `${canvasWidth}x${canvasHeight}`,
            initialZoom,
            viewportX,
            viewportY
        });
        
        this._performResetToFit(canvasData, initialZoom, viewportX, viewportY);
    }
    
    /**
     * Internal method to perform the actual viewport reset
     */
    _performResetToFit(canvasData, initialZoom, viewportX, viewportY) {
        if (!this.canvas) {
            console.warn('⚠️ Canvas element not available for viewport reset');
            return;
        }
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Use the passed parameters (from the original coordinate system)
        const zoom = initialZoom || 1;
        const x = viewportX !== undefined ? viewportX : (canvasData.width - canvasWidth) / 2;
        const y = viewportY !== undefined ? viewportY : (canvasData.height - canvasHeight) / 2;
        
        console.log(`🔧 Viewport calculation (original):`, {
            canvasDataWidth: canvasData.width,
            canvasDataHeight: canvasData.height,
            canvasElementWidth: canvasWidth,
            canvasElementHeight: canvasHeight,
            calculatedViewportX: x,
            calculatedViewportY: y,
            zoom,
            oldViewport: { ...this.viewport }
        });
        
        // Ensure we have valid numbers
        if (isNaN(x) || isNaN(y) || isNaN(zoom)) {
            console.error('❌ Invalid viewport calculation:', { x, y, zoom });
            return;
        }
        
        this.setViewport(x, y, zoom);
        
        console.log(`✅ Viewport reset: x=${x.toFixed(2)}, y=${y.toFixed(2)}, zoom=${zoom.toFixed(3)}`);
        console.log(`🔧 New viewport state:`, { ...this.viewport });
    }
    
    /**
     * Get current viewport
     */
    getViewport() {
        return { ...this.viewport };
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * This must match the renderer's working coordinate system
     */
    screenToWorld(screenX, screenY) {
        // Use the same logic as the renderer: (screenX / zoom) + viewport.x
        const worldX = (screenX / this.viewport.zoom) + this.viewport.x;
        const worldY = (screenY / this.viewport.zoom) + this.viewport.y;
        
        return { x: worldX, y: worldY };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * This must be the inverse of screenToWorld
     */
    worldToScreen(worldX, worldY) {
        // Inverse of screenToWorld: (worldX - viewport.x) * zoom
        const screenX = (worldX - this.viewport.x) * this.viewport.zoom;
        const screenY = (worldY - this.viewport.y) * this.viewport.zoom;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}