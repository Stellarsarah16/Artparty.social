/**
 * Pixel Art Editor for 32x32 tiles
 * Handles drawing, tools, and canvas operations
 */

class PixelEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
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
        
        // Set canvas size
        this.canvas.width = APP_CONFIG.PIXEL_EDITOR.CANVAS_SIZE;
        this.canvas.height = APP_CONFIG.PIXEL_EDITOR.CANVAS_SIZE;
        
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
     * @returns {Array} 32x32 array of transparent pixels
     */
    createEmptyPixelData() {
        const data = [];
        for (let y = 0; y < this.tileSize; y++) {
            data[y] = [];
            for (let x = 0; x < this.tileSize; x++) {
                data[y][x] = 'transparent';
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
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
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
            this.isDrawing = true;
            this.lastX = x;
            this.lastY = y;
            
            this.applyTool(x, y, e.button === 2); // Right click for erase
            this.updatePositionIndicator(x, y);
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
            
            if (this.isDrawing) {
                this.applyTool(x, y, e.button === 2);
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
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveToHistory();
            
            // Trigger pixel changed event
            if (this.onPixelChanged) {
                this.onPixelChanged(this.pixelData);
            }
        }
    }
    
    /**
     * Handle mouse leave event
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseLeave(e) {
        this.isDrawing = false;
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e - Touch event
     */
    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
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
        
        // Update cursor
        this.updateCursor();
        
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
     * Update canvas cursor based on current tool
     */
    updateCursor() {
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pixelData = this.createEmptyPixelData();
        this.drawGrid();
        this.saveToHistory();
    }
    
    /**
     * Draw the grid
     */
    drawGrid() {
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
        if (!data || data.length !== this.tileSize) {
            console.error('Invalid pixel data');
            return;
        }
        
        this.pixelData = data;
        this.redraw();
        this.saveToHistory();
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
        this.clear();
        
        // Draw all pixels
        for (let y = 0; y < this.tileSize; y++) {
            for (let x = 0; x < this.tileSize; x++) {
                const color = this.pixelData[y][x];
                if (color && color !== 'transparent') {
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x * this.gridSize, y * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
        
        this.drawGrid();
    }
    
    /**
     * Save current state to history
     */
    saveToHistory() {
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add current state
        this.history.push(JSON.parse(JSON.stringify(this.pixelData)));
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pixelData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.redraw();
            
            console.log('⏪ Undo action');
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
                if (color && color !== 'transparent') {
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
                if (this.pixelData[y][x] !== 'transparent') {
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
                if (color && color !== 'transparent') {
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