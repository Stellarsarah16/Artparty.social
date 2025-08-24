/**
 * Canvas Debug Manager
 * Provides debugging tools and development features
 */
export class CanvasDebugManager {
    constructor() {
        this.enabled = true; // Enable debug mode by default
        this.canvas = null;
        this.overlayCanvas = null;
        this.overlayCtx = null;
        
        // Add canvas data for coordinate grid
        this.canvasData = null;
        this.tileSize = null;
        
        this.debugInfo = {
            hoverTile: null,
            clickedTile: null,
            mousePos: { x: 0, y: 0 },
            worldPos: { x: 0, y: 0 },
            viewport: { x: 0, y: 0, zoom: 1 },
            performance: { fps: 0, renderTime: 0 }
        };
        
        this.options = {
            showCoordinates: true,
            showTileBoundaries: true,
            showClickDetection: true,
            showPerformance: true,
            showViewportInfo: true
        };
    }
    
    /**
     * Initialize the debug manager
     */
    async init(canvasElement) {
        this.canvas = canvasElement;
        
        // Create overlay canvas for debug info
        this.createOverlayCanvas();
        
        // Set default options - enable key debugging features
        this.options = {
            showCoordinates: true,
            showTileBoundaries: true,
            showClickDetection: true,
            showPerformanceInfo: true,
            showViewportInfo: true
        };
        
        console.log('✅ Canvas Debug Manager initialized');
    }
    
    /**
     * Create overlay canvas for debug information
     */
    createOverlayCanvas() {
        if (!this.canvas) {
            console.warn(`⚠️ Canvas not available for overlay creation`);
            return;
        }
        
        // Create overlay canvas
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '1000';
        
        // Set overlay canvas size to match main canvas
        this.overlayCanvas.width = this.canvas.width;
        this.overlayCanvas.height = this.canvas.height;
        
        // Get overlay context
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Insert overlay canvas after main canvas
        this.canvas.parentNode.insertBefore(this.overlayCanvas, this.canvas.nextSibling);
        
        console.log('✅ Overlay canvas created:', {
            width: this.overlayCanvas.width,
            height: this.overlayCanvas.height
        });
    }
    
    /**
     * Update overlay canvas size to match main canvas
     */
    updateOverlaySize() {
        if (!this.overlayCanvas || !this.canvas) {
            return;
        }
        
        const newWidth = this.canvas.width;
        const newHeight = this.canvas.height;
        
        if (this.overlayCanvas.width !== newWidth || this.overlayCanvas.height !== newHeight) {
            this.overlayCanvas.width = newWidth;
            this.overlayCanvas.height = newHeight;
            console.log('🔧 Overlay canvas resized to:', { width: newWidth, height: newHeight });
            
            // Re-render debug overlay after resize
            if (this.enabled) {
                this.renderDebugOverlay();
            }
        }
    }
    
    /**
     * Set debug mode
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (enabled) {
            this.renderDebugOverlay();
        } else {
            this.clearDebugOverlay();
        }
    }
    
    /**
     * Update debug information
     */
    updateDebugInfo(info) {
        this.debugInfo = { ...this.debugInfo, ...info };
        
        // Update overlay size if canvas has changed
        this.updateOverlaySize();
        
        if (this.enabled) {
            this.renderDebugOverlay();
        }
    }
    
    /**
     * Force overlay size update and re-render
     */
    forceUpdate() {
        this.updateOverlaySize();
        if (this.enabled) {
            this.renderDebugOverlay();
        }
    }
    
    /**
     * Update canvas data for coordinate grid
     */
    updateCanvasData(canvasData) {
        this.canvasData = canvasData;
        this.tileSize = canvasData?.tile_size || 32;
        console.log('🔧 Debug manager updated with canvas data:', { tileSize: this.tileSize });
        
        // Re-render debug overlay with new data
        if (this.enabled) {
            this.renderDebugOverlay();
        }
    }

    /**
     * Render debug overlay
     */
    renderDebugOverlay() {
        if (!this.overlayCanvas || !this.overlayCtx) {
            console.warn(`⚠️ Overlay canvas or context not available`);
            return;
        }
        
        // Clear overlay
        this.clearDebugOverlay();
        
        // Render coordinate grid if enabled and canvas data available
        if (this.options.showCoordinates && this.canvasData && this.tileSize) {
            this.renderCoordinateGrid();
        }
        
        // Render debug information
        if (this.options.showPerformanceInfo) {
            this.renderPerformanceInfo();
        }
        
        if (this.options.showViewportInfo) {
            this.renderViewportInfo();
        }
    }
    
    /**
     * Clear debug overlay
     */
    clearDebugOverlay() {
        if (!this.overlayCtx) {
            console.warn(`⚠️ Overlay context not available`);
            return;
        }
        
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
    
    /**
     * Render coordinate display
     */
    renderCoordinateDisplay() {
        // Disabled - coordinate grid is not needed and can interfere with tile visibility
        // The coordinate info is now shown in the performance overlay box
    }
    
    /**
     * Render tile boundaries
     */
    renderTileBoundaries() {
        if (!this.debugInfo.hoverTile) return;
        
        // This would need access to canvas data and viewport
        // Implementation depends on integration with other managers
    }
    
    /**
     * Render click detection
     */
    renderClickDetection() {
        if (!this.debugInfo.clickedTile) return;
        
        const { x, y } = this.debugInfo.clickedTile;
        
        this.overlayCtx.strokeStyle = 'red';
        this.overlayCtx.lineWidth = 2;
        this.overlayCtx.strokeRect(x - 5, y - 5, 10, 10);
    }
    
    /**
     * Render performance information
     */
    renderPerformanceInfo() {
        if (!this.overlayCtx || !this.debugInfo.performance || !this.debugInfo.viewport) {
            console.warn(`⚠️ Overlay context or debug info not available`);
            return;
        }
        
        const { fps, renderTime } = this.debugInfo.performance;
        const { x, y, zoom } = this.debugInfo.viewport;
        const { hoverTile, mousePos, worldPos } = this.debugInfo;
        
        // Scale font size based on canvas size
        const baseFontSize = Math.max(8, Math.min(14, this.overlayCanvas.width / 60));
        const fontSize = `${baseFontSize}px monospace`;
        
        // Scale box size based on canvas size - make it larger to accommodate tile info
        const boxWidth = Math.max(140, Math.min(200, this.overlayCanvas.width / 5));
        const boxHeight = Math.max(80, Math.min(120, this.overlayCanvas.height / 5));
        
        // Position in top-right corner with proper scaling
        const margin = Math.max(3, this.overlayCanvas.width / 150);
        const boxX = this.overlayCanvas.width - boxWidth - margin;
        const boxY = margin;
        
        // Background box
        this.overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.overlayCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Text
        this.overlayCtx.fillStyle = 'white';
        this.overlayCtx.font = fontSize;
        this.overlayCtx.textAlign = 'left';
        this.overlayCtx.textBaseline = 'top';
        
        const textY = boxY + margin;
        const lineHeight = baseFontSize + 2;
        let currentLine = 0;
        
        // FPS and render time
        this.overlayCtx.fillText(`FPS: ${fps}`, boxX + margin, textY + currentLine * lineHeight);
        currentLine++;
        this.overlayCtx.fillText(`Render: ${renderTime.toFixed(1)}ms`, boxX + margin, textY + currentLine * lineHeight);
        currentLine++;
        
        // Viewport coordinates
        this.overlayCtx.fillText(`X: ${x.toFixed(0)}`, boxX + margin, textY + currentLine * lineHeight);
        currentLine++;
        this.overlayCtx.fillText(`Y: ${y.toFixed(0)}`, boxX + margin, textY + currentLine * lineHeight);
        currentLine++;
        this.overlayCtx.fillText(`Zoom: ${zoom.toFixed(2)}x`, boxX + margin, textY + currentLine * lineHeight);
        currentLine++;
        
        // Mouse position and tile info
        if (mousePos) {
            this.overlayCtx.fillStyle = 'white';
            this.overlayCtx.fillText(`Mouse: (${mousePos.x.toFixed(0)}, ${mousePos.y.toFixed(0)})`, boxX + margin, textY + currentLine * lineHeight);
            currentLine++;
            
            // Show tile info on the same line if available
            if (hoverTile) {
                this.overlayCtx.fillStyle = 'rgba(255, 255, 0, 0.9)'; // Yellow for tile info
                if (hoverTile.is_empty) {
                    this.overlayCtx.fillText(`Empty Tile: (${hoverTile.x}, ${hoverTile.y}) - Click to create`, boxX + margin, textY + currentLine * lineHeight);
                } else {
                    this.overlayCtx.fillText(`Tile: (${hoverTile.x}, ${hoverTile.y}) Owner: ${hoverTile.creator_id || 'None'}`, boxX + margin, textY + currentLine * lineHeight);
                }
                currentLine++;
            } else {
                // Show world coordinates when not hovering over a tile
                if (worldPos) {
                    this.overlayCtx.fillStyle = 'rgba(150, 150, 150, 0.9)'; // Gray for world coords
                    this.overlayCtx.fillText(`World: (${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)})`, boxX + margin, textY + currentLine * lineHeight);
                    currentLine++;
                }
            }
        }
    }
    
    /**
     * Render viewport information
     */
    renderViewportInfo() {
        // This is now handled in renderPerformanceInfo to avoid duplication
        // and keep everything in one properly sized box
    }
    
    /**
     * Render coordinate grid on debug overlay
     */
    renderCoordinateGrid() {
        if (!this.overlayCtx || !this.canvasData || !this.tileSize) {
            return;
        }
        
        const ctx = this.overlayCtx;
        const { viewport } = this.debugInfo;
        const { x: viewportX, y: viewportY, zoom } = viewport;
        
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        
        // Draw grid lines every 5 tiles
        const gridSpacing = this.tileSize * 5;
        const startX = Math.floor(viewportX / gridSpacing) * gridSpacing;
        const startY = Math.floor(viewportY / gridSpacing) * gridSpacing;
        const endX = viewportX + (this.overlayCanvas.width / zoom);
        const endY = viewportY + (this.overlayCanvas.height / zoom);
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSpacing) {
            const screenX = (x - viewportX) * zoom;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, this.overlayCanvas.height);
            ctx.stroke();
            
            // Label
            const tileX = Math.floor(x / this.tileSize);
            ctx.fillText(`${tileX}`, screenX + 2, 15);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSpacing) {
            const screenY = (y - viewportY) * zoom;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(this.overlayCanvas.width, screenY);
            ctx.stroke();
            
            // Label
            const tileY = Math.floor(y / this.tileSize);
            ctx.fillText(`${tileY}`, 2, screenY + 12);
        }
    }
    
    /**
     * Handle canvas resize
     */
    handleCanvasResize() {
        if (!this.overlayCanvas) {
            console.warn(`⚠️ Overlay canvas not available for resize`);
            return;
        }
        
        // Resize overlay canvas to match main canvas
        this.overlayCanvas.width = this.canvas.width;
        this.overlayCanvas.height = this.canvas.height;
        
        // Re-render debug overlay
        if (this.enabled) {
            this.renderDebugOverlay();
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.overlayCanvas && this.overlayCanvas.parentNode) {
            this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
        }
        
        this.overlayCanvas = null;
        this.overlayCtx = null;
    }
}
