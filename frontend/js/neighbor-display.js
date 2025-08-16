/**
 * Neighbor Display Module (Non-Module Version)
 * Handles displaying adjacent tiles for reference while editing
 */

(function() {
    'use strict';
    
    class NeighborDisplay {
        constructor() {
            this.canvases = {
                top: null,
                left: null,
                right: null,
                bottom: null
            };
            this.ctxs = {};
            this.currentTile = null;
            this.neighbors = {};
            this.initialized = false;
            this.initAttempted = false;
            
            console.log('🔧 Neighbor display module created (lazy initialization)');
        }
        
        /**
         * Initialize the neighbor display
         */
        init() {
            if (this.initAttempted) {
                console.log('🔧 Neighbor display already attempted initialization');
                return;
            }
            
            this.initAttempted = true;
            console.log('🔧 Attempting to initialize neighbor display...');
            
            // Get canvas elements
            this.canvases.top = document.getElementById('neighbor-top-canvas');
            this.canvases.left = document.getElementById('neighbor-left-canvas');
            this.canvases.right = document.getElementById('neighbor-right-canvas');
            this.canvases.bottom = document.getElementById('neighbor-bottom-canvas');
            // Note: center canvas is now the main pixel-canvas, handled separately
            
            console.log('🔧 Found canvas elements:', {
                top: !!this.canvases.top,
                left: !!this.canvases.left,
                right: !!this.canvases.right,
                bottom: !!this.canvases.bottom
            });
            
            // Check if all elements are available
            const missingElements = Object.keys(this.canvases).filter(key => !this.canvases[key]);
            if (missingElements.length > 0) {
                console.warn('⚠️ Some neighbor canvas elements not found:', missingElements);
                console.log('⚠️ This is normal if the editor section is not loaded yet');
                // Reset initAttempted so we can try again later when elements are available
                this.initAttempted = false;
                return;
            }
            
            // Get contexts
            Object.keys(this.canvases).forEach(key => {
                if (this.canvases[key]) {
                    try {
                        this.ctxs[key] = this.canvases[key].getContext('2d');
                        // Disable image smoothing for pixel art
                        this.ctxs[key].imageSmoothingEnabled = false;
                        this.ctxs[key].webkitImageSmoothingEnabled = false;
                        this.ctxs[key].mozImageSmoothingEnabled = false;
                        this.ctxs[key].msImageSmoothingEnabled = false;
                    } catch (error) {
                        console.error(`Failed to get context for ${key} canvas:`, error);
                    }
                }
            });
            
            this.initialized = true;
            console.log('✅ Neighbor display initialized successfully');
        }
        
        /**
         * Update the neighbor display with tile and neighbor data
         * @param {Object} tile - Current tile data
         * @param {Array} neighbors - Array of adjacent neighbor tiles
         */
        updateDisplay(tile, neighbors = []) {
            // Try to initialize if not already done
            if (!this.initialized) {
                this.init();
            }
            
            if (!this.initialized) {
                console.warn('⚠️ Neighbor display not initialized - skipping update');
                return;
            }
            
            try {
                // Validate inputs
                if (!tile) {
                    console.warn('⚠️ No tile provided to neighbor display');
                    return;
                }
                
                // Ensure neighbors is an array
                if (!Array.isArray(neighbors)) {
                    console.warn('⚠️ Neighbors is not an array, converting to empty array:', neighbors);
                    neighbors = [];
                }
                
                this.currentTile = tile;
                this.neighbors = this.organizeNeighbors(neighbors);
                
                console.log('🔄 Updating neighbor display:', {
                    tile: tile,
                    neighbors: this.neighbors,
                    neighborsCount: neighbors.length,
                    organizedNeighbors: this.neighbors
                });
                
                // Clear all canvases
                this.clearAllCanvases();
                
                // Note: Current tile is now drawn in the main pixel editor
                // Draw neighbors only
                this.drawNeighbor('top', this.neighbors.top);
                this.drawNeighbor('left', this.neighbors.left);
                this.drawNeighbor('right', this.neighbors.right);
                this.drawNeighbor('bottom', this.neighbors.bottom);
                
                // Update cell styling
                this.updateCellStyling();
                
                console.log('✅ Neighbor display updated successfully');
            } catch (error) {
                console.error('Error updating neighbor display:', error);
                // Fallback: clear everything and show empty state
                this.clearAllCanvases();
                this.updateCellStyling();
            }
        }
        
        /**
         * Organize neighbors by position relative to current tile
         * @param {Array} neighbors - Array of neighbor tiles
         * @returns {Object} Organized neighbors by position
         */
        organizeNeighbors(neighbors) {
            const organized = {
                top: null,
                left: null,
                right: null,
                bottom: null
            };
            
            if (!this.currentTile) return organized;
            
            // Ensure neighbors is an array
            if (!Array.isArray(neighbors)) {
                console.warn('⚠️ Neighbors is not an array:', neighbors);
                return organized;
            }
            
            console.log('🔍 Organizing neighbors:', {
                currentTile: { x: this.currentTile.x, y: this.currentTile.y },
                neighbors: neighbors,
                neighborsCount: neighbors.length
            });
            
            neighbors.forEach(neighbor => {
                if (!neighbor || typeof neighbor.x !== 'number' || typeof neighbor.y !== 'number') {
                    console.warn('⚠️ Invalid neighbor data:', neighbor);
                    return;
                }
                
                const dx = neighbor.x - this.currentTile.x;
                const dy = neighbor.y - this.currentTile.y;
                
                console.log(`🔍 Neighbor ${neighbor.id} at (${neighbor.x}, ${neighbor.y}) - dx: ${dx}, dy: ${dy}`);
                
                if (dx === 0 && dy === -1) {
                    organized.top = neighbor;
                    console.log('✅ Assigned to top');
                } else if (dx === -1 && dy === 0) {
                    organized.left = neighbor;
                    console.log('✅ Assigned to left');
                } else if (dx === 1 && dy === 0) {
                    organized.right = neighbor;
                    console.log('✅ Assigned to right');
                } else if (dx === 0 && dy === 1) {
                    organized.bottom = neighbor;
                    console.log('✅ Assigned to bottom');
                } else {
                    console.log('❌ No position match for this neighbor');
                }
            });
            
            console.log('🔍 Final organized neighbors:', organized);
            return organized;
        }
        
        /**
         * Draw a tile on a specific canvas
         * @param {string} position - Position key (top, left, right, bottom, center)
         * @param {Object} tile - Tile data
         */
        drawTile(position, tile) {
            console.log(`🎨 drawTile called for ${position}:`, { tile, hasCanvas: !!this.canvases[position], hasCtx: !!this.ctxs[position] });
            
            const canvas = this.canvases[position];
            const ctx = this.ctxs[position];
            
            if (!canvas || !ctx) {
                console.warn(`⚠️ Missing canvas or context for ${position}`);
                return;
            }
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (!tile || !tile.pixel_data) {
                console.log(`🎨 No tile or pixel_data for ${position}, drawing empty tile`);
                this.drawEmptyTile(ctx, canvas.width, canvas.height);
                return;
            }
            
            console.log(`🎨 Processing pixel data for ${position}:`, {
                hasPixelData: !!tile.pixel_data,
                pixelDataType: typeof tile.pixel_data,
                pixelDataLength: typeof tile.pixel_data === 'string' ? tile.pixel_data.length : 'not string'
            });
            
            // Parse pixel data
            let pixelData;
            try {
                pixelData = typeof tile.pixel_data === 'string' 
                    ? JSON.parse(tile.pixel_data) 
                    : tile.pixel_data;
                console.log(`🎨 Parsed pixel data for ${position}:`, {
                    isArray: Array.isArray(pixelData),
                    length: Array.isArray(pixelData) ? pixelData.length : 'not array',
                    firstRow: Array.isArray(pixelData) && pixelData[0] ? pixelData[0].length : 'no first row'
                });
            } catch (error) {
                console.error('Failed to parse pixel data for neighbor:', error);
                this.drawEmptyTile(ctx, canvas.width, canvas.height);
                return;
            }
            
            if (!Array.isArray(pixelData)) {
                console.error('Invalid pixel data format for neighbor');
                this.drawEmptyTile(ctx, canvas.width, canvas.height);
                return;
            }
            
            // FIXED: Calculate tile size from pixel data structure, not total length
            const tileSize = pixelData.length; // Number of rows (e.g., 32, 64, 128)
            const pixelSize = canvas.width / tileSize;
            let pixelCount = 0;
            
            console.log(`🎨 Drawing neighbor tile: ${tileSize}x${tileSize}, pixelSize: ${pixelSize}, canvas width: ${canvas.width}`);
            
            for (let y = 0; y < tileSize; y++) {
                for (let x = 0; x < tileSize; x++) {
                    const color = pixelData[y] && pixelData[y][x];
                    
                    // FIXED: Handle different color formats properly
                    if (color) {
                        let fillColor = color;
                        
                        // Handle RGBA array format
                        if (Array.isArray(color) && color.length >= 3) {
                            const [r, g, b, a = 255] = color;
                            fillColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                        }
                        // Handle hex color
                        else if (typeof color === 'string' && color.startsWith('#')) {
                            fillColor = color;
                        }
                        // Handle named colors
                        else if (typeof color === 'string' && color !== 'transparent' && color !== 'white') {
                            fillColor = color;
                        }
                        
                        if (fillColor && fillColor !== 'transparent') {
                            ctx.fillStyle = fillColor;
                            ctx.fillRect(
                                x * pixelSize,
                                y * pixelSize,
                                pixelSize,
                                pixelSize
                            );
                            pixelCount++;
                        }
                    }
                }
            }
            
            console.log(`🎨 Drew ${pixelCount} pixels for ${position} neighbor`);
        }
        
        /**
         * Draw a neighbor tile
         * @param {string} position - Position key
         * @param {Object} neighbor - Neighbor tile data
         */
        drawNeighbor(position, neighbor) {
            console.log(`🎨 Drawing neighbor at ${position}:`, neighbor);
            this.drawTile(position, neighbor);
        }
        
        /**
         * Draw empty tile pattern
         * @param {CanvasRenderingContext2D} ctx - Canvas context
         * @param {number} width - Canvas width
         * @param {number} height - Canvas height
         */
        drawEmptyTile(ctx, width, height) {
            // Draw checkerboard pattern for empty tiles
            const cellSize = 8;
            const cols = Math.ceil(width / cellSize);
            const rows = Math.ceil(height / cellSize);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const isEven = (row + col) % 2 === 0;
                    ctx.fillStyle = isEven ? '#f0f0f0' : '#e0e0e0';
                    ctx.fillRect(
                        col * cellSize,
                        row * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
        
        /**
         * Clear all canvases
         */
        clearAllCanvases() {
            Object.keys(this.ctxs).forEach(key => {
                const ctx = this.ctxs[key];
                const canvas = this.canvases[key];
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            });
        }
        
        /**
         * Update cell styling based on tile presence
         */
        updateCellStyling() {
            const cells = {
                top: document.getElementById('neighbor-top'),
                left: document.getElementById('neighbor-left'),
                right: document.getElementById('neighbor-right'),
                bottom: document.getElementById('neighbor-bottom')
            };
            
            Object.keys(cells).forEach(position => {
                const cell = cells[position];
                if (!cell) return;
                
                // Remove all classes
                cell.classList.remove('empty', 'has-tile', 'current');
                
                if (this.neighbors[position]) {
                    cell.classList.add('has-tile');
                } else {
                    cell.classList.add('empty');
                }
            });
        }
        
        /**
         * Get neighbor at specific position
         * @param {string} position - Position key
         * @returns {Object|null} Neighbor tile or null
         */
        getNeighbor(position) {
            return this.neighbors[position] || null;
        }
        
        /**
         * Check if a neighbor exists at position
         * @param {string} position - Position key
         * @returns {boolean} True if neighbor exists
         */
        hasNeighbor(position) {
            return !!this.neighbors[position];
        }
        
        /**
         * Get all neighbors
         * @returns {Object} All neighbors organized by position
         */
        getAllNeighbors() {
            return { ...this.neighbors };
        }
        
        /**
         * Clear the display
         */
        clear() {
            this.currentTile = null;
            this.neighbors = {};
            this.clearAllCanvases();
            this.updateCellStyling();
        }
        
        /**
         * Force re-initialization (useful when DOM elements become available later)
         */
        forceReinit() {
            console.log('🔧 Force re-initializing neighbor display...');
            this.initAttempted = false;
            this.initialized = false;
            
            // Wait a bit for DOM to be ready
            setTimeout(() => {
                this.init();
                
                // If we have current tile and neighbors, update display
                if (this.currentTile && this.neighbors) {
                    console.log('🔧 Re-updating display after re-init...');
                    this.updateDisplay(this.currentTile, Object.values(this.neighbors).filter(n => n !== null));
                }
            }, 100);
        }
    }
    
    // Create singleton instance and make it globally available
    window.neighborDisplay = new NeighborDisplay();
    console.log('🔧 Neighbor display loaded and available globally');
    
})(); 