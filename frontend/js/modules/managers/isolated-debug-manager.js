/**
 * Enhanced Debug Manager - Real-time App Usage Visualization
 * Provides barely visible overlay with useful real-time information
 */
export class IsolatedDebugManager {
    constructor(eventManager) {
        console.log('🔧 Enhanced DebugManager initializing...');
        
        this.eventManager = eventManager;
        this.isEnabled = false;
        this.overlayCanvas = null;
        this.overlayCtx = null;
        this.infoPanel = null;
        
        // Real-time tracking data
        this.mousePosition = { x: 0, y: 0 };
        this.hoveredTile = null;
        this.currentCanvas = null;
        this.currentUser = null;
        this.performanceMetrics = {
            renderTime: 0,
            updateCount: 0,
            lastUpdate: Date.now()
        };
        
        // Setup mouse tracking and event listeners
        this.setupEventListeners();
        this.setupMouseTracking();
        
        console.log('✅ Enhanced DebugManager initialized');
    }
    
    /**
     * Setup event listeners for real-time data
     */
    setupEventListeners() {
        if (!this.eventManager) return;
        
        // Listen for canvas events
        this.eventManager.on('canvasOpened', (canvasData) => {
            this.currentCanvas = canvasData;
            this.updateOverlay();
        });
        
        // Listen for user events
        this.eventManager.on('userLogin', (userData) => {
            this.currentUser = userData;
            this.updateOverlay();
        });
        
        this.eventManager.on('userLogout', () => {
            this.currentUser = null;
            this.updateOverlay();
        });
        
        // CRITICAL FIX: Hide debug overlay when tile editor opens
        this.eventManager.on('sectionChanged', (sectionName) => {
            if (sectionName === 'editor') {
                // Hide debug overlay when entering tile editor
                this.hideForEditor();
            } else if (sectionName === 'viewer' || sectionName === 'canvas') {
                // Show debug overlay when returning to viewer (if enabled)
                this.showForViewer();
            }
        });
    }
    
    /**
     * Setup mouse tracking for real-time position info
     */
    setupMouseTracking() {
        // Track mouse movement over canvas viewer
        document.addEventListener('mousemove', (e) => {
            this.mousePosition = { x: e.clientX, y: e.clientY };
            
            // Get tile information if over canvas viewer
            const canvasViewer = document.getElementById('canvas-viewer');
            if (canvasViewer) {
                const rect = canvasViewer.getBoundingClientRect();
                const isOverCanvas = (
                    e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom
                );
                
                if (isOverCanvas && window.CanvasViewer) {
                    try {
                        const tile = window.CanvasViewer.getTileAtPosition(e.clientX, e.clientY);
                        this.hoveredTile = tile;
                    } catch (error) {
                        this.hoveredTile = null;
                    }
                } else {
                    this.hoveredTile = null;
                }
            }
            
            // Update overlay if enabled (throttled)
            if (this.isEnabled && !this.updateThrottle) {
                this.updateThrottle = setTimeout(() => {
                    this.updateOverlay();
                    this.updateThrottle = null;
                }, 50); // 20fps throttling
            }
        });
    }
    
    /**
     * Create debug overlay when needed - Enhanced with barely visible styling
     */
    createOverlay() {
        console.log('🔧 Creating enhanced debug overlay...');
        
        // Remove existing overlays and info panels
        const existing = document.querySelectorAll('#debug-overlay, #debug-info-panel');
        existing.forEach(el => el.remove());
        console.log(`🧹 Removed ${existing.length} existing debug elements`);
        
        // Create barely visible overlay canvas
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'debug-overlay';
        this.overlayCanvas.className = 'debug-overlay';
        this.overlayCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 100;
            opacity: 0.3;
            display: none;
        `;
        
        // Create info panel for real-time data
        this.infoPanel = document.createElement('div');
        this.infoPanel.id = 'debug-info-panel';
        this.infoPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.85);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            padding: 8px 10px;
            border: 1px solid rgba(0, 255, 0, 0.3);
            border-radius: 4px;
            z-index: 1000;
            pointer-events: none;
            max-width: 280px;
            line-height: 1.3;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        
        // Get the canvas viewer container
        const canvasViewer = document.getElementById('canvas-viewer');
        if (canvasViewer && canvasViewer.parentElement) {
            const container = canvasViewer.parentElement;
            console.log('🔧 Using container:', container);
            
            // Ensure container has relative positioning
            if (window.getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }
            
            // Add overlay to container
            container.appendChild(this.overlayCanvas);
            this.overlayCtx = this.overlayCanvas.getContext('2d');
            
            // Add info panel to document body
            document.body.appendChild(this.infoPanel);
            
            // Set canvas size to match the canvas viewer
            const rect = canvasViewer.getBoundingClientRect();
            this.overlayCanvas.width = rect.width;
            this.overlayCanvas.height = rect.height;
            
            console.log('✅ Enhanced debug overlay created');
            return true;
        } else {
            console.warn('⚠️ Canvas viewer not found');
            return false;
        }
    }
    
    /**
     * Enable/disable debug mode
     */
    setEnabled(enabled) {
        console.log(`🔧 Enhanced DebugManager.setEnabled(${enabled})`);
        
        this.isEnabled = enabled;
        
        // Create overlay if it doesn't exist
        if (enabled && (!this.overlayCanvas || !this.overlayCtx)) {
            if (!this.createOverlay()) {
                console.error('❌ Failed to create overlay');
                return;
            }
        }
        
        // Toggle visibility for both overlay and info panel
        if (this.overlayCanvas) {
            this.overlayCanvas.style.display = enabled ? 'block' : 'none';
        }
        
        if (this.infoPanel) {
            this.infoPanel.style.display = enabled ? 'block' : 'none';
        }
        
        // Start or stop updates
        if (enabled) {
            this.startRealTimeUpdates();
        } else {
            this.stopRealTimeUpdates();
        }
        
        console.log(`🔧 Enhanced debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update every 100ms for smooth real-time feel
        this.updateInterval = setInterval(() => {
            this.updateOverlay();
        }, 100);
        
        // Initial update
        this.updateOverlay();
    }
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.clearOverlay();
    }
    
    /**
     * Update overlay with current real-time information
     */
    updateOverlay() {
        if (!this.isEnabled || !this.overlayCtx || !this.infoPanel) {
            return;
        }
        
        const startTime = performance.now();
        
        // Clear and redraw overlay
        this.clearOverlay();
        this.drawSubtleGrid();
        this.drawHoverHighlight();
        
        // Update info panel
        this.updateInfoPanel();
        
        // Track performance
        this.performanceMetrics.renderTime = performance.now() - startTime;
        this.performanceMetrics.updateCount++;
        this.performanceMetrics.lastUpdate = Date.now();
    }
    
    /**
     * Get current debug state
     */
    getDebugState() {
        return {
            enabled: this.isEnabled,
            showGrid: true,
            hoveredTile: this.hoveredTile,
            mousePosition: this.mousePosition,
            currentCanvas: this.currentCanvas
        };
    }
    
    /**
     * Draw subtle grid overlay - barely visible
     */
    drawSubtleGrid() {
        if (!this.overlayCtx || !this.overlayCanvas) return;
        
        const ctx = this.overlayCtx;
        const canvas = this.overlayCanvas;
        
        // Get actual tile size from canvas viewer if available
        let tileSize = 32; // Default fallback
        if (window.CanvasViewer && window.CanvasViewer.canvasData) {
            tileSize = window.CanvasViewer.canvasData.tile_size || 32;
        }
        
        // Draw barely visible grid
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.lineWidth = 0.5;
        
        // Get viewport info if available
        let offsetX = 0, offsetY = 0, zoom = 1;
        if (window.CanvasViewer) {
            offsetX = window.CanvasViewer.viewportX || 0;
            offsetY = window.CanvasViewer.viewportY || 0;
            zoom = window.CanvasViewer.zoom || 1;
        }
        
        // Calculate visible tile range
        const startTileX = Math.floor(offsetX / tileSize);
        const startTileY = Math.floor(offsetY / tileSize);
        const tilesX = Math.ceil(canvas.width / (tileSize * zoom)) + 2;
        const tilesY = Math.ceil(canvas.height / (tileSize * zoom)) + 2;
        
        // Draw vertical lines
        for (let i = 0; i <= tilesX; i++) {
            const x = ((startTileX + i) * tileSize - offsetX) * zoom;
            if (x >= 0 && x <= canvas.width) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
        }
        
        // Draw horizontal lines
        for (let i = 0; i <= tilesY; i++) {
            const y = ((startTileY + i) * tileSize - offsetY) * zoom;
            if (y >= 0 && y <= canvas.height) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Draw hover highlight for current tile
     */
    drawHoverHighlight() {
        if (!this.hoveredTile || !this.overlayCtx) return;
        
        const ctx = this.overlayCtx;
        const canvas = this.overlayCanvas;
        
        // Get tile size and viewport info
        let tileSize = 32;
        let offsetX = 0, offsetY = 0, zoom = 1;
        
        if (window.CanvasViewer) {
            if (window.CanvasViewer.canvasData) {
                tileSize = window.CanvasViewer.canvasData.tile_size || 32;
            }
            offsetX = window.CanvasViewer.viewportX || 0;
            offsetY = window.CanvasViewer.viewportY || 0;
            zoom = window.CanvasViewer.zoom || 1;
        }
        
        // Calculate screen position of hovered tile
        const screenX = (this.hoveredTile.x * tileSize - offsetX) * zoom;
        const screenY = (this.hoveredTile.y * tileSize - offsetY) * zoom;
        const screenSize = tileSize * zoom;
        
        // Only draw if tile is visible
        if (screenX + screenSize > 0 && screenX < canvas.width &&
            screenY + screenSize > 0 && screenY < canvas.height) {
            
            // Draw subtle highlight
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, screenSize, screenSize);
            
            // Draw subtle crosshair
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screenX + screenSize / 2, screenY);
            ctx.lineTo(screenX + screenSize / 2, screenY + screenSize);
            ctx.moveTo(screenX, screenY + screenSize / 2);
            ctx.lineTo(screenX + screenSize, screenY + screenSize / 2);
            ctx.stroke();
        }
    }
    
    /**
     * Update info panel with real-time data
     */
    updateInfoPanel() {
        if (!this.infoPanel) return;
        
        let html = '<div style="color: #00ff00; font-weight: bold; margin-bottom: 6px;">🔍 DEBUG INFO</div>';
        
        // Mouse position
        html += `<div><span style="color: #888;">Mouse:</span> (${this.mousePosition.x}, ${this.mousePosition.y})</div>`;
        
        // Canvas information
        if (this.currentCanvas) {
            html += `<div style="margin-top: 6px; color: #00ccff;"><strong>Canvas:</strong> ${this.currentCanvas.name}</div>`;
            html += `<div><span style="color: #888;">Size:</span> ${this.currentCanvas.width}x${this.currentCanvas.height}</div>`;
            html += `<div><span style="color: #888;">Tile Size:</span> ${this.currentCanvas.tile_size}px</div>`;
            html += `<div><span style="color: #888;">Mode:</span> ${this.currentCanvas.collaboration_mode}</div>`;
        }
        
        // Viewport information
        if (window.CanvasViewer) {
            const viewport = {
                x: window.CanvasViewer.viewportX || 0,
                y: window.CanvasViewer.viewportY || 0,
                zoom: window.CanvasViewer.zoom || 1
            };
            html += `<div style="margin-top: 6px; color: #ffcc00;"><strong>Viewport:</strong></div>`;
            html += `<div><span style="color: #888;">Position:</span> (${viewport.x.toFixed(1)}, ${viewport.y.toFixed(1)})</div>`;
            html += `<div><span style="color: #888;">Zoom:</span> ${(viewport.zoom * 100).toFixed(0)}%</div>`;
        }
        
        // Hovered tile information
        if (this.hoveredTile) {
            html += `<div style="margin-top: 6px; color: #ff6600;"><strong>Hovered Tile:</strong></div>`;
            html += `<div><span style="color: #888;">Position:</span> (${this.hoveredTile.x}, ${this.hoveredTile.y})</div>`;
            
            if (this.hoveredTile.id) {
                html += `<div><span style="color: #888;">ID:</span> ${this.hoveredTile.id}</div>`;
                html += `<div><span style="color: #888;">Owner:</span> ${this.hoveredTile.username || 'Unknown'}</div>`;
            } else {
                html += `<div><span style="color: #888;">Status:</span> Empty</div>`;
            }
        }
        
        // User information
        if (this.currentUser) {
            html += `<div style="margin-top: 6px; color: #cc00ff;"><strong>User:</strong> ${this.currentUser.username}</div>`;
            html += `<div><span style="color: #888;">ID:</span> ${this.currentUser.id}</div>`;
        }
        
        // Performance metrics
        html += `<div style="margin-top: 6px; color: #888; font-size: 10px;">`;
        html += `Render: ${this.performanceMetrics.renderTime.toFixed(1)}ms | `;
        html += `Updates: ${this.performanceMetrics.updateCount}`;
        html += `</div>`;
        
        this.infoPanel.innerHTML = html;
    }
    
    /**
     * Clear overlay
     */
    clearOverlay() {
        if (this.overlayCtx && this.overlayCanvas) {
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }
    
    /**
     * Cleanup when disabling debug mode
     */
    cleanup() {
        console.log('🔧 Cleaning up debug manager...');
        
        // Stop updates
        this.stopRealTimeUpdates();
        
        // Remove overlay elements
        if (this.overlayCanvas) {
            this.overlayCanvas.remove();
            this.overlayCanvas = null;
            this.overlayCtx = null;
        }
        
        if (this.infoPanel) {
            this.infoPanel.remove();
            this.infoPanel = null;
        }
        
        // Clear throttle timeout
        if (this.updateThrottle) {
            clearTimeout(this.updateThrottle);
            this.updateThrottle = null;
        }
        
        console.log('✅ Debug manager cleanup complete');
    }
    
    /**
     * Enhanced setEnabled with proper cleanup
     */
    setEnabledEnhanced(enabled) {
        console.log(`🔧 Enhanced DebugManager.setEnabledEnhanced(${enabled})`);
        
        const wasEnabled = this.isEnabled;
        this.isEnabled = enabled;
        
        if (enabled && !wasEnabled) {
            // Enabling: create overlay and start updates
            if (this.createOverlay()) {
                this.startRealTimeUpdates();
                console.log('✅ Debug overlay enabled with real-time updates');
            }
        } else if (!enabled && wasEnabled) {
            // Disabling: cleanup everything
            this.cleanup();
            console.log('✅ Debug overlay disabled and cleaned up');
        }
    }
    
    /**
     * Legacy compatibility - redirect to enhanced version
     */
    setEnabled(enabled) {
        return this.setEnabledEnhanced(enabled);
    }
    
    /**
     * CRITICAL FIX: Hide debug overlay when tile editor is open
     */
    hideForEditor() {
        console.log('🔧 Hiding debug overlay for tile editor');
        this.wasEnabledBeforeEditor = this.isEnabled;
        
        if (this.overlayCanvas) {
            this.overlayCanvas.style.display = 'none';
        }
        if (this.infoPanel) {
            this.infoPanel.style.display = 'none';
        }
        
        // Stop updates while in editor
        this.stopRealTimeUpdates();
    }
    
    /**
     * CRITICAL FIX: Show debug overlay when returning to viewer (if it was enabled)
     */
    showForViewer() {
        console.log('🔧 Showing debug overlay for viewer');
        
        // Only show if debug was enabled before editor opened
        if (this.wasEnabledBeforeEditor && this.isEnabled) {
            if (this.overlayCanvas) {
                this.overlayCanvas.style.display = 'block';
            }
            if (this.infoPanel) {
                this.infoPanel.style.display = 'block';
            }
            
            // Restart updates
            this.startRealTimeUpdates();
        }
    }
}

export default IsolatedDebugManager;


