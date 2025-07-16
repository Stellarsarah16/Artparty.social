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
                bottom: null,
                center: null
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
            this.canvases.center = document.getElementById('neighbor-center-canvas');
            
            // Check if all elements are available
            const missingElements = Object.keys(this.canvases).filter(key => !this.canvases[key]);
            if (missingElements.length > 0) {
                console.warn('⚠️ Some neighbor canvas elements not found:', missingElements);
                console.log('⚠️ This is normal if the editor section is not loaded yet');
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
                    neighborsCount: neighbors.length
                });
                
                // Clear all canvases
                this.clearAllCanvases();
                
                // Draw current tile in center
                this.drawTile('center', tile);
                
                // Draw neighbors
                this.drawNeighbor('top', this.neighbors.top);
                this.drawNeighbor('left', this.neighbors.left);
                this.drawNeighbor('right', this.neighbors.right);
                this.drawNeighbor('bottom', this.neighbors.bottom);
                
                // Update cell styling
                this.updateCellStyling();
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
            
            neighbors.forEach(neighbor => {
                if (!neighbor || typeof neighbor.x !== 'number' || typeof neighbor.y !== 'number') {
                    console.warn('⚠️ Invalid neighbor data:', neighbor);
                    return;
                }
                
                const dx = neighbor.x - this.currentTile.x;
                const dy = neighbor.y - this.currentTile.y;
                
                if (dx === 0 && dy === -1) {
                    organized.top = neighbor;
                } else if (dx === -1 && dy === 0) {
                    organized.left = neighbor;
                } else if (dx === 1 && dy === 0) {
                    organized.right = neighbor;
                } else if (dx === 0 && dy === 1) {
                    organized.bottom = neighbor;
                }
            });
            
            return organized;
        }
        
        /**
         * Draw a tile on a specific canvas
         * @param {string} position - Position key (top, left, right, bottom, center)
         * @param {Object} tile - Tile data
         */
        drawTile(position, tile) {
            const canvas = this.canvases[position];
            const ctx = this.ctxs[position];
            
            if (!canvas || !ctx) return;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (!tile || !tile.pixel_data) {
                // Draw empty tile pattern
                this.drawEmptyTile(ctx, canvas.width, canvas.height);
                return;
            }
            
            // Parse pixel data
            let pixelData;
            try {
                pixelData = typeof tile.pixel_data === 'string' 
                    ? JSON.parse(tile.pixel_data) 
                    : tile.pixel_data;
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
            
            // Draw pixels
            const pixelSize = canvas.width / 32; // 32x32 tile scaled to 64x64 canvas
            
            for (let y = 0; y < 32; y++) {
                for (let x = 0; x < 32; x++) {
                    const color = pixelData[y] && pixelData[y][x];
                    if (color && color !== 'transparent') {
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            x * pixelSize,
                            y * pixelSize,
                            pixelSize,
                            pixelSize
                        );
                    }
                }
            }
        }
        
        /**
         * Draw a neighbor tile
         * @param {string} position - Position key
         * @param {Object} neighbor - Neighbor tile data
         */
        drawNeighbor(position, neighbor) {
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
                bottom: document.getElementById('neighbor-bottom'),
                center: document.getElementById('neighbor-center')
            };
            
            Object.keys(cells).forEach(position => {
                const cell = cells[position];
                if (!cell) return;
                
                // Remove all classes
                cell.classList.remove('empty', 'has-tile', 'current');
                
                if (position === 'center') {
                    cell.classList.add('current');
                } else if (this.neighbors[position]) {
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
    }
    
    // Create singleton instance and make it globally available
    window.neighborDisplay = new NeighborDisplay();
    console.log('🔧 Neighbor display loaded and available globally');
    
})(); 