/**
 * Pixel Art Editor for 32x32 tiles
 * Handles drawing, tools, and canvas operations
 */

class PixelEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentTool = 'paint';
        this.currentColor = '#000000';
        this.brushSize = 1;
        this.zoom = 1;
        this.gridSize = 16; // 32x32 pixels displayed in 512x512 canvas = 16px per pixel
        this.tileSize = 32;
        this.pixelData = this.createEmptyPixelData();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Event listeners
        this.onPixelChanged = null;
        this.onToolChanged = null;
        this.onColorChanged = null;
        
        // Unified drawing state tracking
        this.drawingState = {
            isDrawing: false,
            button: null, // Track which button is pressed
            lastX: 0,
            lastY: 0
        };
        
        // Touch state tracking
        this.touchState = {
            isTouching: false,
            lastTouchX: 0,
            lastTouchY: 0,
            touchStartTime: 0,
            hasMoved: false,
            pressure: 1.0,
            // Double tap detection
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            doubleTapDelay: 300, // milliseconds
            doubleTapDistance: 50 // pixels
        };
    }
    
    /**
     * Initialize the pixel editor
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    init(canvas) {
        if (!canvas) {
            console.error('Canvas element not provided');
            return;
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        console.log('🎨 Canvas element:', canvas);
        console.log('🎨 Canvas context:', this.ctx);
        console.log('🎨 Canvas size:', canvas.width, 'x', canvas.height);
        
        // Set canvas size
        this.canvas.width = APP_CONFIG.PIXEL_EDITOR.CANVAS_SIZE;
        this.canvas.height = APP_CONFIG.PIXEL_EDITOR.CANVAS_SIZE;
        
        console.log('🎨 Set canvas size to:', this.canvas.width, 'x', this.canvas.height);
        console.log('🎨 Grid size:', this.gridSize);
        
        // Disable image smoothing for pixel art
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial draw
        this.clear();
        this.drawGrid();
        this.saveToHistory();
        
        console.log('✅ Pixel editor initialized');
    }
    
    /**
     * Create empty pixel data array
     * @returns {Array} 32x32 array of white pixels
     */
    createEmptyPixelData() {
        const data = [];
        for (let y = 0; y < this.tileSize; y++) {
            data[y] = [];
            for (let x = 0; x < this.tileSize; x++) {
                data[y][x] = 'white';
            }
        }
        return data;
    }
    
    /**
     * Setup event listeners for canvas interactions
     */
    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Touch events for mobile - optimized for performance
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.gridSize);
        const y = Math.floor((e.clientY - rect.top) / this.gridSize);
        
        if (x >= 0 && x < this.tileSize && y >= 0 && y < this.tileSize) {
            // Only allow left mouse button (button 0) for painting
            if (e.button === 0) {
                console.log('🖱️ Mouse down - Left button, starting to draw');
                this.drawingState.isDrawing = true;
                this.drawingState.button = e.button;
                this.drawingState.lastX = x;
                this.drawingState.lastY = y;
                
                this.lastX = x;
                this.lastY = y;
                
                this.applyTool(x, y, false); // Always false for left mouse button
                this.updatePositionIndicator(x, y);
            } else {
                console.log('🖱️ Mouse down - Ignoring non-left button:', e.button);
            }
        }
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.gridSize);
        const y = Math.floor((e.clientY - rect.top) / this.gridSize);
        
        if (x >= 0 && x < this.tileSize && y >= 0 && y < this.tileSize) {
            this.updatePositionIndicator(x, y);
            
            // Only paint if we're drawing with left mouse button
            if (this.drawingState.isDrawing && this.drawingState.button === 0) {
                this.applyTool(x, y, false); // Always false for left mouse button
                this.lastX = x;
                this.lastY = y;
            }
        }
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        // Only handle mouse up for the button that was pressed
        if (this.drawingState.isDrawing && this.drawingState.button === e.button) {
            console.log('🖱️ Mouse up - Stopping drawing');
            this.drawingState.isDrawing = false;
            this.drawingState.button = null;
            this.saveToHistory();
            
            // Trigger pixel changed event
            if (this.onPixelChanged) {
                this.onPixelChanged(this.pixelData);
            }
        } else {
            console.log('🖱️ Mouse up - Not drawing or wrong button:', {
                isDrawing: this.drawingState.isDrawing,
                button: this.drawingState.button,
                eventButton: e.button
            });
        }
    }
    
    /**
     * Handle mouse leave event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseLeave(e) {
        this.drawingState.isDrawing = false;
        this.drawingState.button = null;
    }
    
    /**
     * Handle touch start event with enhanced support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            
            // Convert touch to pixel coordinates
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((touch.clientX - rect.left) / this.gridSize);
            const y = Math.floor((touch.clientY - rect.top) / this.gridSize);
            
            // Only prevent default if we're on the canvas area
            if (x >= 0 && x < this.tileSize && y >= 0 && y < this.tileSize) {
                e.preventDefault();
                
                // Update touch state
                this.touchState.isTouching = true;
                this.touchState.lastTouchX = touch.clientX;
                this.touchState.lastTouchY = touch.clientY;
                this.touchState.touchStartTime = Date.now();
                this.touchState.hasMoved = false;
                this.touchState.pressure = touch.force || 1.0;
                
                // Use unified drawing state
                this.drawingState.isDrawing = true;
                this.drawingState.button = 0; // Treat touch as left mouse button
                this.drawingState.lastX = x;
                this.drawingState.lastY = y;
                
                this.lastX = x;
                this.lastY = y;
                
                // Apply tool with pressure sensitivity
                this.applyToolWithPressure(x, y, this.touchState.pressure);
                this.updatePositionIndicator(x, y);
            }
        }
    }
    
    /**
     * Handle touch move event with enhanced support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        if (e.touches.length === 1 && this.touchState.isTouching) {
            const touch = e.touches[0];
            
            // Convert touch to pixel coordinates
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((touch.clientX - rect.left) / this.gridSize);
            const y = Math.floor((touch.clientY - rect.top) / this.gridSize);
            
            // Only prevent default if we're on the canvas area and drawing
            if (x >= 0 && x < this.tileSize && y >= 0 && y < this.tileSize && this.drawingState.isDrawing) {
                e.preventDefault();
                
                // Update touch state
                this.touchState.lastTouchX = touch.clientX;
                this.touchState.lastTouchY = touch.clientY;
                this.touchState.pressure = touch.force || 1.0;
                
                // Track movement
                const deltaX = Math.abs(touch.clientX - this.touchState.lastTouchX);
                const deltaY = Math.abs(touch.clientY - this.touchState.lastTouchY);
                if (deltaX > 2 || deltaY > 2) {
                    this.touchState.hasMoved = true;
                }
                
                this.updatePositionIndicator(x, y);
                
                // Apply tool with pressure sensitivity
                this.applyToolWithPressure(x, y, this.touchState.pressure);
                this.lastX = x;
                this.lastY = y;
            }
        }
    }
    
    /**
     * Handle touch end event with enhanced support
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        if (this.touchState.isTouching) {
            // Only prevent default if we were drawing
            if (this.drawingState.isDrawing) {
                e.preventDefault();
            }
            
            this.touchState.isTouching = false;
            
            if (this.drawingState.isDrawing) {
                this.drawingState.isDrawing = false;
                this.drawingState.button = null;
                this.saveToHistory();
                
                // Trigger pixel changed event
                if (this.onPixelChanged) {
                    this.onPixelChanged(this.pixelData);
                }
            }
            
            // Check for tap gesture (quick touch without movement)
            const touchDuration = Date.now() - this.touchState.touchStartTime;
            if (touchDuration < 200 && !this.touchState.hasMoved) {
                // Handle as a tap
                const touch = e.changedTouches[0];
                if (touch) {
                    const currentTime = Date.now();
                    const timeSinceLastTap = currentTime - this.touchState.lastTapTime;
                    const distanceFromLastTap = Math.sqrt(
                        Math.pow(touch.clientX - this.touchState.lastTapX, 2) +
                        Math.pow(touch.clientY - this.touchState.lastTapY, 2)
                    );
                    
                    // Check if this is a double tap
                    if (timeSinceLastTap < this.touchState.doubleTapDelay && 
                        distanceFromLastTap < this.touchState.doubleTapDistance) {
                        // Double tap detected - could be used for quick actions
                        this.handleDoubleTapGesture();
                        
                        // Reset tap tracking
                        this.touchState.lastTapTime = 0;
                        this.touchState.lastTapX = 0;
                        this.touchState.lastTapY = 0;
                    } else {
                        // Single tap - handle normal tap gesture
                        this.handleTapGesture();
                        
                        // Store tap info for potential double tap
                        this.touchState.lastTapTime = currentTime;
                        this.touchState.lastTapX = touch.clientX;
                        this.touchState.lastTapY = touch.clientY;
                    }
                }
            }
        }
    }
    
    /**
     * Apply tool with pressure sensitivity
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} pressure - Touch pressure (0-1)
     */
    applyToolWithPressure(x, y, pressure) {
        // Adjust brush size based on pressure for paint tool
        if (this.currentTool === 'paint' && pressure < 0.5) {
            // Light pressure - smaller brush or lighter color
            const adjustedColor = this.adjustColorForPressure(this.currentColor, pressure);
            this.drawPixel(x, y, adjustedColor);
        } else {
            // Normal pressure - apply tool normally
            this.applyTool(x, y, false);
        }
    }
    
    /**
     * Adjust color based on pressure
     * @param {string} color - Original color
     * @param {number} pressure - Touch pressure (0-1)
     * @returns {string} Adjusted color
     */
    adjustColorForPressure(color, pressure) {
        if (pressure >= 0.5) return color;
        
        // For light pressure, make color lighter or more transparent
        if (color.startsWith('#')) {
            // Convert hex to RGB and lighten
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const factor = 0.5 + (pressure * 0.5); // 0.5 to 1.0
            const newR = Math.min(255, Math.round(r + (255 - r) * (1 - factor)));
            const newG = Math.min(255, Math.round(g + (255 - g) * (1 - factor)));
            const newB = Math.min(255, Math.round(b + (255 - b) * (1 - factor)));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        
        return color;
    }
    
    /**
     * Handle tap gesture (quick touch without movement)
     */
    handleTapGesture() {
        // For now, just pick color at the last position
        if (this.currentTool === 'picker') {
            this.pickColor(this.lastX, this.lastY);
        }
        // Could be extended for other quick actions like:
        // - Quick tool switching
        // - Color palette access
        // - Undo/redo
    }
    
    /**
     * Handle double tap gesture
     */
    handleDoubleTapGesture() {
        // Double tap actions - could be used for:
        // - Quick tool switching
        // - Zoom to fit
        // - Reset canvas
        // - Quick color picker
        console.log('Double tap detected in pixel editor');
        
        // For now, just pick color at the last position regardless of tool
        this.pickColor(this.lastX, this.lastY);
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        // Only handle shortcuts when editor is active
        if (document.activeElement !== this.canvas) return;
        
        switch (e.key) {
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                }
                break;
            case 'b':
                e.preventDefault();
                this.setTool('paint');
                break;
            case 'e':
                e.preventDefault();
                this.setTool('eraser');
                break;
            case 'p':
                e.preventDefault();
                this.setTool('picker');
                break;
            case 'f':
                e.preventDefault();
                this.setTool('fill');
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.copyCanvas();
                }
                break;
            case 'v':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.pasteCanvas();
                }
                break;
        }
    }
    
    /**
     * Apply the current tool at the given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} isRightClick - Whether this is a right click
     */
    applyTool(x, y, isRightClick = false) {
        const tool = isRightClick ? 'eraser' : this.currentTool;
        
        switch (tool) {
            case 'paint':
                this.drawPixel(x, y, this.currentColor);
                break;
            case 'eraser':
                this.drawPixel(x, y, 'transparent');
                break;
            case 'picker':
                this.pickColor(x, y);
                break;
            case 'fill':
                this.floodFill(x, y, this.currentColor);
                break;
        }
    }
    
    /**
     * Draw a pixel at the given coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Color to draw
     */
    drawPixel(x, y, color) {
        // Safety check - only draw if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready, skipping pixel draw');
            return;
        }
        
        if (x < 0 || x >= this.tileSize || y < 0 || y >= this.tileSize) return;
        
        this.pixelData[y][x] = color;
        
        // Draw on canvas
        if (color === 'transparent') {
            this.ctx.clearRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
        } else {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
        }
        
        // Redraw grid lines
        this.drawGridLines(x, y);
    }
    
    /**
     * Pick color from pixel at coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    pickColor(x, y) {
        if (x < 0 || x >= this.tileSize || y < 0 || y >= this.tileSize) return;
        
        const color = this.pixelData[y][x];
        if (color && color !== 'transparent') {
            this.setColor(color);
        }
    }
    
    /**
     * Flood fill algorithm
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} newColor - New color to fill
     */
    floodFill(x, y, newColor) {
        if (x < 0 || x >= this.tileSize || y < 0 || y >= this.tileSize) return;
        
        const originalColor = this.pixelData[y][x];
        if (originalColor === newColor) return;
        
        const stack = [[x, y]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [currentX, currentY] = stack.pop();
            const key = `${currentX},${currentY}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (currentX < 0 || currentX >= this.tileSize || 
                currentY < 0 || currentY >= this.tileSize) continue;
            
            if (this.pixelData[currentY][currentX] !== originalColor) continue;
            
            this.drawPixel(currentX, currentY, newColor);
            
            // Add neighboring pixels to stack
            stack.push([currentX + 1, currentY]);
            stack.push([currentX - 1, currentY]);
            stack.push([currentX, currentY + 1]);
            stack.push([currentX, currentY - 1]);
        }
    }
    
    /**
     * Set the current tool
     * @param {string} tool - Tool name
     */
    setTool(tool) {
        this.currentTool = tool;
        
        // Update cursor only if canvas is ready
        if (this.canvas) {
            this.updateCursor();
        }
        
        // Trigger tool changed event
        if (this.onToolChanged) {
            this.onToolChanged(tool);
        }
        
        console.log(`🛠️ Tool changed to: ${tool}`);
    }
    
    /**
     * Set the current color
     * @param {string} color - Color hex code
     */
    setColor(color) {
        this.currentColor = color;
        
        // Trigger color changed event
        if (this.onColorChanged) {
            this.onColorChanged(color);
        }
        
        console.log(`🎨 Color changed to: ${color}`);
    }
    
    /**
     * Update cursor based on current tool
     */
    updateCursor() {
        // Safety check - only update cursor if canvas is ready
        if (!this.canvas) {
            console.log('Canvas not ready, skipping cursor update');
            return;
        }
        
        const cursors = {
            paint: 'crosshair',
            eraser: 'crosshair',
            picker: 'crosshair',
            fill: 'crosshair'
        };
        
        this.canvas.style.cursor = cursors[this.currentTool] || 'default';
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        // Safety check - only clear if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready, skipping clear');
            return;
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Clear pixel data and reset to empty state
     */
    clearPixelData() {
        // Add safety check - only clear if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready yet, skipping clear');
            return;
        }
        
        // Clear the canvas
        this.clear();
        
        // Reset pixel data to empty
        this.pixelData = this.createEmptyPixelData();
        
        // Don't call this.render() - it doesn't exist
        // Instead, just clear the canvas visually
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        console.log('✅ Pixel data cleared');
    }

    /**
     * Clear undo/redo history
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        console.log('✅ History cleared');
    }

    /**
     * Reset tool state to defaults
     */
    resetToolState() {
        this.currentTool = 'paint';
        this.currentColor = '#000000';
        this.brushSize = 1;
        
        // Only update cursor if canvas is ready
        if (this.canvas) {
            this.updateCursor();
        }
        
        console.log('✅ Tool state reset');
    }

    /**
     * Reset drawing state
     */
    resetDrawingState() {
        this.drawingState.isDrawing = false;
        this.drawingState.button = null;
        this.lastX = 0;
        this.lastY = 0;
        
        // Reset touch state
        this.touchState = {
            isTouching: false,
            lastTouchX: 0,
            lastTouchY: 0,
            touchStartTime: 0,
            hasMoved: false,
            pressure: 1.0,
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            doubleTapDelay: 300,
            doubleTapDistance: 50
        };
        
        console.log('✅ Drawing state reset');
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        if (!this.canvas) return;
        
        // Remove mouse events
        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Remove touch events
        this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Remove context menu prevention
        this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log('✅ Event listeners removed');
    }

    /**
     * Refresh touch handlers (for mobile Safari)
     */
    refreshTouchHandlers() {
        this.removeEventListeners();
        this.setupEventListeners();
        console.log('✅ Touch handlers refreshed');
    }

    /**
     * Handle WebGL context loss
     */
    handleContextLoss() {
        if (!this.canvas || !this.ctx) {
            console.warn('Canvas context lost, attempting to restore...');
            // Try to reinitialize
            this.init(this.canvas);
        }
    }

    /**
     * Revert to last saved state
     */
    revertToLastSaved() {
        if (this.history.length > 0) {
            this.pixelData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            console.log('✅ Reverted to last saved state');
        } else {
            this.clearPixelData();
            console.log('✅ No saved state, cleared pixel data');
        }
    }

    /**
     * Comprehensive state reset - clears everything
     */
    resetAllState() {
        console.log('🧹 Resetting all pixel editor state...');
        
        this.clearPixelData();
        this.clearHistory();
        this.resetToolState();
        this.resetDrawingState();
        
        // Reset zoom
        this.zoom = 1;
        
        // Clear callbacks
        this.onPixelChanged = null;
        this.onToolChanged = null;
        this.onColorChanged = null;
        
        console.log('✅ All pixel editor state reset');
    }
    
    /** Draw the grid */
    drawGrid() {
        // Safety check - only draw if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready, skipping grid draw');
            return;
        }
        
        this.ctx.strokeStyle = APP_CONFIG.CANVAS.GRID_COLOR;
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.tileSize; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.tileSize; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.canvas.width, y * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw grid lines around a specific pixel
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    drawGridLines(x, y) {
        // Safety check - only draw if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready, skipping grid lines draw');
            return;
        }
        
        this.ctx.strokeStyle = APP_CONFIG.CANVAS.GRID_COLOR;
        this.ctx.lineWidth = 1;
        
        // Draw surrounding grid lines
        this.ctx.beginPath();
        this.ctx.moveTo(x * this.gridSize, y * this.gridSize);
        this.ctx.lineTo((x + 1) * this.gridSize, y * this.gridSize);
        this.ctx.lineTo((x + 1) * this.gridSize, (y + 1) * this.gridSize);
        this.ctx.lineTo(x * this.gridSize, (y + 1) * this.gridSize);
        this.ctx.lineTo(x * this.gridSize, y * this.gridSize);
        this.ctx.stroke();
    }
    
    /**
     * Load pixel data into editor
     * @param {Array} data - 32x32 pixel data array
     */
    loadPixelData(data) {
        console.log('🎨 loadPixelData called with:', data);
        console.log('🎨 Data type:', typeof data);
        console.log('🎨 Data length:', Array.isArray(data) ? data.length : 'not array');
        
        if (!data || data.length !== this.tileSize) {
            console.error('Invalid pixel data - expected length:', this.tileSize, 'got:', data ? data.length : 'null');
            return;
        }
        
        this.pixelData = data;
        console.log('🎨 Pixel data loaded, redrawing...');
        console.log('🎨 Sample of loaded data - first row:', this.pixelData[0]);
        console.log('🎨 Sample of loaded data - position 16,0:', this.pixelData[0][16]);
        console.log('🎨 Sample of loaded data - position 17,0:', this.pixelData[0][17]);
        this.redraw();
        console.log('🎨 After redraw - position 16,0:', this.pixelData[0][16]);
        console.log('🎨 After redraw - position 17,0:', this.pixelData[0][17]);
        this.saveToHistory();
        console.log('🎨 After saveToHistory - position 16,0:', this.pixelData[0][16]);
        console.log('🎨 After saveToHistory - position 17,0:', this.pixelData[0][17]);
        console.log('🎨 Pixel data loading complete');
    }
    
    /**
     * Get current pixel data
     * @returns {Array} 32x32 pixel data array
     */
    getPixelData() {
        return this.pixelData;
    }
    
    /**
     * Get pixel data as JSON string
     * @returns {string} JSON string of pixel data
     */
    getPixelDataJson() {
        return JSON.stringify(this.pixelData);
    }
    
    /**
     * Load pixel data from JSON string
     * @param {string} jsonData - JSON string of pixel data
     */
    loadPixelDataJson(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            this.loadPixelData(data);
        } catch (error) {
            console.error('Failed to load pixel data from JSON:', error);
        }
    }
    
    /**
     * Redraw the entire canvas
     */
    redraw() {
        // Safety check - only redraw if canvas is ready
        if (!this.canvas || !this.ctx) {
            console.log('Canvas not ready, skipping redraw');
            return;
        }
        
        console.log('🎨 Redrawing canvas...');
        this.clear();
        
        // Debug: Check first few rows of pixel data
        console.log('🎨 First row of pixel data:', this.pixelData[0]);
        console.log('🎨 Second row of pixel data:', this.pixelData[1]);
        console.log('🎨 Pixel data type check:', typeof this.pixelData[0], typeof this.pixelData[0][16]);
        
        // Draw all pixels
        let pixelCount = 0;
        let totalPixels = 0;
        for (let y = 0; y < this.tileSize; y++) {
            for (let x = 0; x < this.tileSize; x++) {
                const color = this.pixelData[y] && this.pixelData[y][x];
                totalPixels++;
                if (color && color !== 'white') {
                    console.log(`🎨 Drawing pixel at (${x}, ${y}) with color: ${color}`);
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                    pixelCount++;
                } else if (color === 'white') {
                    // Draw white pixels
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
        
        console.log(`🎨 Total pixels checked: ${totalPixels}, non-white pixels: ${pixelCount}`);
        console.log(`🎨 Sample pixel data:`, {
            '0,0': this.pixelData[0] && this.pixelData[0][0],
            '16,0': this.pixelData[0] && this.pixelData[0][16],
            '17,0': this.pixelData[0] && this.pixelData[0][17],
            '20,0': this.pixelData[0] && this.pixelData[0][20],
            '21,0': this.pixelData[0] && this.pixelData[0][21]
        });
        
        console.log('🎨 Drew', pixelCount, 'pixels');
        this.drawGrid();
        console.log('🎨 Redraw complete');
    }
    
    /**
     * Save current state to history
     */
    saveToHistory() {
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add current state to history
        this.history.push(JSON.parse(JSON.stringify(this.pixelData)));
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // Update undo/redo buttons if navigation manager exists
        if (window.navigationManager && window.navigationManager.updateUndoRedoButtons) {
            window.navigationManager.updateUndoRedoButtons();
        }
    }
    
    /**
     * Undo last action
     */
    undo() {
        console.log('⏪ Undo called - History index:', this.historyIndex, 'History length:', this.history.length);
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pixelData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            
            console.log('⏪ Undo action completed');
            
            // Update undo/redo buttons
            if (window.navigationManager && window.navigationManager.updateUndoRedoButtons) {
                console.log('🔄 Updating undo/redo buttons');
                window.navigationManager.updateUndoRedoButtons();
            } else {
                console.log('⚠️ Navigation manager not available for button update');
            }
        } else {
            console.log('⚠️ Cannot undo - no history available');
        }
    }
    
    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.pixelData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            
            console.log('⏩ Redo action');
            
            // Update undo/redo buttons
            if (window.navigationManager && window.navigationManager.updateUndoRedoButtons) {
                window.navigationManager.updateUndoRedoButtons();
            }
        }
    }
    
    /**
     * Copy canvas to clipboard (as data URL)
     */
    copyCanvas() {
        try {
            const dataUrl = this.canvas.toDataURL();
            // Note: Actually copying to clipboard requires additional API calls
            // For now, we'll just log it
            console.log('📋 Canvas copied to clipboard (data URL)');
        } catch (error) {
            console.error('Failed to copy canvas:', error);
        }
    }
    
    /**
     * Paste canvas from clipboard
     */
    pasteCanvas() {
        // This would require additional implementation to handle clipboard data
        console.log('📄 Paste canvas (not yet implemented)');
    }
    
    /**
     * Export canvas as image
     * @param {string} format - Image format (png, jpeg, etc.)
     * @param {number} scale - Scale factor for export
     * @returns {string} Data URL of the image
     */
    exportAsImage(format = 'png', scale = 1) {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCanvas.width = this.tileSize * scale;
        exportCanvas.height = this.tileSize * scale;
        
        // Disable image smoothing
        exportCtx.imageSmoothingEnabled = false;
        
        // Draw pixels at export scale
        for (let y = 0; y < this.tileSize; y++) {
            for (let x = 0; x < this.tileSize; x++) {
                const color = this.pixelData[y][x];
                if (color) {
                    exportCtx.fillStyle = color;
                    exportCtx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        return exportCanvas.toDataURL(`image/${format}`);
    }
    
    /**
     * Generate thumbnail of current canvas
     * @param {number} size - Thumbnail size in pixels
     * @returns {string} Data URL of thumbnail
     */
    generateThumbnail(size = 64) {
        return this.exportAsImage('png', size / this.tileSize);
    }
    
    /**
     * Update position indicator
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    updatePositionIndicator(x, y) {
        const indicator = document.getElementById('position-indicator');
        if (indicator) {
            indicator.textContent = `Position: (${x}, ${y})`;
        }
    }
    
    /**
     * Check if canvas has any pixels drawn
     * @returns {boolean} True if canvas has pixels
     */
    hasPixels() {
        for (let y = 0; y < this.tileSize; y++) {
            for (let x = 0; x < this.tileSize; x++) {
                if (this.pixelData[y][x] !== 'white') {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Get canvas statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        let pixelCount = 0;
        let colorCount = 0;
        const colors = new Set();
        
        for (let y = 0; y < this.tileSize; y++) {
            for (let x = 0; x < this.tileSize; x++) {
                const color = this.pixelData[y][x];
                if (color && color !== 'white') {
                    pixelCount++;
                    colors.add(color);
                }
            }
        }
        
        return {
            pixelCount,
            colorCount: colors.size,
            colors: Array.from(colors),
            totalPixels: this.tileSize * this.tileSize,
            fillPercentage: (pixelCount / (this.tileSize * this.tileSize)) * 100
        };
    }
}

// Create global instance
const pixelEditor = new PixelEditor();

// Export for use in other modules
window.PixelEditor = pixelEditor;

// Integration with main app
if (window.ArtPartySocial) {
    // Set up event listeners for integration
    pixelEditor.onToolChanged = (tool) => {
        window.ArtPartySocial.selectTool(tool);
    };
    
    pixelEditor.onColorChanged = (color) => {
        window.ArtPartySocial.selectColor(color);
    };
    
    pixelEditor.onPixelChanged = (pixelData) => {
        // Enable save button when pixels are drawn
        const saveBtn = document.getElementById('save-tile-btn');
        if (saveBtn) {
            saveBtn.disabled = !pixelEditor.hasPixels();
        }
    };
}

console.log('✅ Pixel editor loaded'); 