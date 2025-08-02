/**
 * Tile Editor Manager
 * Handles tile editing, tools, and save operations
 */

export class TileEditorManager {
    constructor(apiService) {
        this.apiService = apiService;
        this.currentTile = null;
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Open tile editor
     */
    async openTileEditor(tile) {
        try {
            console.log('🔄 Opening tile editor for tile:', tile.id);
            
            this.currentTile = tile;
            this.initializeTileEditor(tile);
            this.setupToolButtons();
            this.setupUndoRedoButtons();
            
            // Show editor section
            if (window.navigationManager) {
                window.navigationManager.showSection('editor');
            }
            
            console.log('✅ Tile editor opened successfully');
            
        } catch (error) {
            console.error('❌ Failed to open tile editor:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to open tile editor', 'error');
            }
        }
    }

    /**
     * Initialize tile editor with tile data
     */
    initializeTileEditor(tile) {
        console.log('🎨 Initializing tile editor with tile:', tile);
        
        // Update tile info
        this.updateTileInfo(tile);
        
        // Initialize color palette
        this.initializeColorPalette(tile);
        
        // Initialize pixel editor
        if (window.PixelEditor) {
            console.log('✅ Pixel editor available, initializing...');
            
            // Get the canvas element
            const canvas = document.getElementById('pixel-canvas');
            if (canvas) {
                // Initialize the pixel editor with the canvas
                window.PixelEditor.init(canvas);
                
                // Load the tile's pixel data
                if (tile.pixel_data) {
                    console.log('🎨 Loading pixel data:', typeof tile.pixel_data, 'length:', tile.pixel_data.length);
                    
                    // Check if it's a JSON string that needs to be parsed
                    if (typeof tile.pixel_data === 'string') {
                        try {
                            const parsedData = JSON.parse(tile.pixel_data);
                            window.PixelEditor.loadPixelData(parsedData);
                            console.log('✅ Pixel data loaded from JSON string');
                        } catch (error) {
                            console.error('❌ Failed to parse pixel data JSON:', error);
                            console.log('✅ Starting with empty canvas due to parsing error');
                        }
                    } else {
                        // Assume it's already an array
                        window.PixelEditor.loadPixelData(tile.pixel_data);
                        console.log('✅ Pixel data loaded from array');
                    }
                } else {
                    console.log('✅ No pixel data found, starting with empty canvas');
                }
            } else {
                console.error('❌ Pixel canvas element not found');
            }
        } else {
            console.warn('⚠️ Pixel editor not available');
        }
        
        // Setup save button
        this.setupSaveButton(tile);
        
        // Setup tool buttons
        this.setupToolButtons();
        
        // Setup undo/redo buttons
        this.setupUndoRedoButtons();
        
        // Setup back button
        this.setupBackButton();
        
        // Load neighbor tiles
        this.loadNeighborTiles(tile);
        
        console.log('✅ Tile editor initialization complete');
    }

    /**
     * Initialize color palette
     */
    initializeColorPalette(tile) {
        console.log('🎨 Initializing color palette for tile editor');
        
        // Get the palette container
        const paletteContainer = document.getElementById('color-palette');
        if (!paletteContainer) {
            console.warn('⚠️ Color palette container not found');
            return;
        }
        
        console.log('🎨 Found palette container:', paletteContainer);
        
        // Clear existing palette
        paletteContainer.innerHTML = '';
        
        // Get palette type from canvas or use default
        const paletteType = tile.canvas_palette_type || 'classic';
        console.log('🎨 Using palette type:', paletteType);
        
        // Define color palettes
        const colorPalettes = {
            classic: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
            earth: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#D2691E', '#B8860B', '#DAA520'],
            pastel: ['#FFB6C1', '#87CEEB', '#98FB98', '#F0E68C', '#DDA0DD', '#FFA07A', '#B0E0E6', '#F5DEB3'],
            neon: ['#FF1493', '#00FFFF', '#00FF00', '#FFFF00', '#FF00FF', '#FF4500', '#9400D3', '#00CED1']
        };
        
        // Get colors for the selected palette
        const colors = colorPalettes[paletteType] || colorPalettes.classic;
        
        console.log('🎨 Creating', colors.length, 'color squares');
        
        // Create color squares
        colors.forEach((color, index) => {
            const colorSquare = document.createElement('div');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = color;
            colorSquare.setAttribute('data-color', color);
            colorSquare.title = color;
            
            colorSquare.addEventListener('click', () => {
                this.selectColor(color);
            });
            
            paletteContainer.appendChild(colorSquare);
            console.log(`🎨 Added color square ${index + 1}:`, color);
        });
        
        // Select first color by default
        if (colors.length > 0) {
            this.selectColor(colors[0]);
        }
        
        console.log('✅ Color palette initialized with', colors.length, 'colors');
        
        // Ensure the floating tools panel is visible
        const toolsPanel = document.getElementById('floating-tools-panel');
        if (toolsPanel) {
            toolsPanel.style.display = 'block';
            console.log('✅ Floating tools panel made visible');
        } else {
            console.warn('⚠️ Floating tools panel not found');
        }
    }
    
    /**
     * Select a color
     */
    selectColor(color) {
        console.log('🎨 Selecting color:', color);
        
        // Update active color square
        const colorSquares = document.querySelectorAll('.color-square');
        colorSquares.forEach(square => {
            square.classList.remove('active');
            if (square.getAttribute('data-color') === color) {
                square.classList.add('active');
            }
        });
        
        // Update pixel editor
        if (window.PixelEditor) {
            window.PixelEditor.setColor(color);
            console.log('✅ Color set in pixel editor:', color);
        } else {
            console.warn('⚠️ Pixel editor not available for color selection');
        }
    }

    /**
     * Update tile information display
     */
    updateTileInfo(tile) {
        // Update current tile coordinates
        const coordsElement = document.getElementById('current-tile-coords');
        if (coordsElement) {
            coordsElement.textContent = `Tile: (${tile.x}, ${tile.y})`;
        }
        
        // Update tile owner
        const ownerElement = document.getElementById('tile-info-owner');
        if (ownerElement) {
            ownerElement.textContent = `Owner: ${tile.creator_username || 'Unknown'}`;
        }
        
        // Update tile canvas info
        const canvasElement = document.getElementById('tile-info-canvas');
        if (canvasElement) {
            canvasElement.textContent = `Canvas: ${tile.canvas_name || 'Unknown'}`;
        }
        
        // Update created date
        const createdElement = document.getElementById('tile-info-created');
        if (createdElement) {
            createdElement.textContent = `Created: ${new Date(tile.created_at).toLocaleDateString()}`;
        }
        
        // Update updated date
        const updatedElement = document.getElementById('tile-info-updated');
        if (updatedElement) {
            updatedElement.textContent = `Updated: ${new Date(tile.updated_at || tile.created_at).toLocaleDateString()}`;
        }
        
        console.log('✅ Tile info updated:', tile);
    }

    /**
     * Setup save button
     */
    setupSaveButton(tile) {
        const saveBtn = document.getElementById('save-tile-btn');
        if (saveBtn) {
            // Remove any existing event listeners
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('save-tile-btn');
            
            newSaveBtn.addEventListener('click', async () => {
                console.log('💾 Save button clicked for tile:', tile.id);
                await this.saveTile(tile.id);
            });
            
            // Enable the save button
            newSaveBtn.disabled = false;
            
            console.log('✅ Save button setup complete');
        } else {
            console.warn('⚠️ Save button not found');
        }
    }

    /**
     * Save tile changes
     */
    async saveTile(tileId) {
        try {
            console.log('💾 Starting tile save for tile ID:', tileId);
            
            if (!window.PixelEditor) {
                throw new Error('Pixel editor not available');
            }
            
            const pixelData = window.PixelEditor.getPixelData();
            console.log('💾 Pixel data to save:', pixelData);
            
            if (!this.apiService) {
                throw new Error('API service not available');
            }
            
            console.log('💾 Calling API service update...');
            const result = await this.apiService.update(tileId, {
                pixel_data: pixelData
            });
            
            console.log('💾 API call successful:', result);
            
            if (window.UIManager) {
                window.UIManager.showToast('Tile saved successfully!', 'success');
            }
            
            // Clear undo/redo stacks after save
            this.undoStack = [];
            this.redoStack = [];
            this.updateUndoRedoButtons();
            
            console.log('✅ Tile save completed successfully');
            
        } catch (error) {
            console.error('❌ Failed to save tile:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                apiService: !!this.apiService,
                pixelEditor: !!window.PixelEditor
            });
            
            if (window.UIManager) {
                window.UIManager.showToast('Failed to save tile: ' + error.message, 'error');
            }
        }
    }

    /**
     * Setup tool buttons
     */
    setupToolButtons() {
        const tools = [
            { id: 'paint-tool', tool: 'paint' },
            { id: 'eraser-tool', tool: 'eraser' },
            { id: 'fill-tool', tool: 'fill' },
            { id: 'picker-tool', tool: 'eyedropper' }
        ];
        
        tools.forEach(({ id, tool }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = () => {
                    this.selectTool(tool);
                };
                console.log(`✅ Setup tool button: ${id} -> ${tool}`);
            } else {
                console.warn(`⚠️ Tool button not found: ${id}`);
            }
        });
    }

    /**
     * Select a tool
     */
    selectTool(tool) {
        console.log('🎨 Selecting tool:', tool);
        
        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Map tool names to button IDs
        const toolButtonMap = {
            'paint': 'paint-tool',
            'eraser': 'eraser-tool',
            'fill': 'fill-tool',
            'eyedropper': 'picker-tool'
        };
        
        const buttonId = toolButtonMap[tool];
        if (buttonId) {
            const activeBtn = document.getElementById(buttonId);
            if (activeBtn) {
                activeBtn.classList.add('active');
                console.log(`✅ Activated tool button: ${buttonId}`);
            } else {
                console.warn(`⚠️ Tool button not found: ${buttonId}`);
            }
        }
        
        // Set tool in pixel editor
        if (window.PixelEditor) {
            window.PixelEditor.setTool(tool);
            console.log(`✅ Tool set in pixel editor: ${tool}`);
        } else {
            console.warn('⚠️ Pixel editor not available');
        }
    }

    /**
     * Setup undo/redo buttons (currently hidden)
     */
    setupUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        // Hide undo and redo buttons as requested
        if (undoBtn) {
            undoBtn.style.display = 'none';
            console.log('✅ Undo button hidden');
        }
        
        if (redoBtn) {
            redoBtn.style.display = 'none';
            console.log('✅ Redo button hidden');
        }
        
        console.log('✅ Undo/redo buttons hidden as requested');
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length > 0 && window.PixelEditor) {
            const currentState = window.PixelEditor.getPixelData();
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack.pop();
            window.PixelEditor.loadPixelData(previousState);
            
            this.updateUndoRedoButtons();
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length > 0 && window.PixelEditor) {
            const currentState = window.PixelEditor.getPixelData();
            this.undoStack.push(currentState);
            
            const nextState = this.redoStack.pop();
            window.PixelEditor.loadPixelData(nextState);
            
            this.updateUndoRedoButtons();
        }
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.disabled = this.undoStack.length === 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }

    /**
     * Add state to undo stack
     */
    addToUndoStack(state) {
        this.undoStack.push(state);
        this.redoStack = []; // Clear redo stack when new action is performed
        this.updateUndoRedoButtons();
    }
    
    /**
     * Setup back button
     */
    setupBackButton() {
        const backBtn = document.getElementById('back-to-grid-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                console.log('🔙 Back button clicked, returning to canvas viewer');
                if (window.navigationManager) {
                    window.navigationManager.showSection('viewer');
                }
            };
            console.log('✅ Back button setup complete');
        } else {
            console.warn('⚠️ Back button not found');
        }
    }
    
    /**
     * Load and display neighbor tiles
     */
    async loadNeighborTiles(currentTile) {
        try {
            console.log('🔍 Loading neighbor tiles for tile:', currentTile.x, currentTile.y);
            
            // Get all tiles for the current canvas
            const allTiles = await this.apiService.getForCanvas(currentTile.canvas_id);
            
            if (!allTiles || !Array.isArray(allTiles)) {
                console.warn('⚠️ No tiles found for canvas');
                return;
            }
            
            // Find neighbor tiles (8 directions)
            const neighbors = this.findNeighborTiles(currentTile, allTiles);
            
            // Display neighbor tiles
            this.displayNeighborTiles(neighbors);
            
            console.log('✅ Neighbor tiles loaded:', Object.keys(neighbors).length);
            
        } catch (error) {
            console.error('❌ Failed to load neighbor tiles:', error);
        }
    }
    
    /**
     * Find neighbor tiles in all 8 directions
     */
    findNeighborTiles(currentTile, allTiles) {
        const neighbors = {};
        
        // Define all 8 neighbor positions
        const neighborPositions = [
            { key: 'top', dx: 0, dy: -1 },
            { key: 'top-right', dx: 1, dy: -1 },
            { key: 'right', dx: 1, dy: 0 },
            { key: 'bottom-right', dx: 1, dy: 1 },
            { key: 'bottom', dx: 0, dy: 1 },
            { key: 'bottom-left', dx: -1, dy: 1 },
            { key: 'left', dx: -1, dy: 0 },
            { key: 'top-left', dx: -1, dy: -1 }
        ];
        
        neighborPositions.forEach(({ key, dx, dy }) => {
            const neighborX = currentTile.x + dx;
            const neighborY = currentTile.y + dy;
            
            const neighbor = allTiles.find(tile => 
                tile.x === neighborX && tile.y === neighborY
            );
            
            if (neighbor) {
                neighbors[key] = neighbor;
                console.log(`✅ Found ${key} neighbor at (${neighborX}, ${neighborY})`);
            } else {
                console.log(`❌ No ${key} neighbor at (${neighborX}, ${neighborY})`);
            }
        });
        
        return neighbors;
    }
    
    /**
     * Display neighbor tiles on the neighbor canvases
     */
    displayNeighborTiles(neighbors) {
        const neighborPositions = [
            'top', 'top-right', 'right', 'bottom-right',
            'bottom', 'bottom-left', 'left', 'top-left'
        ];
        
        neighborPositions.forEach(position => {
            const neighbor = neighbors[position];
            const canvasId = `neighbor-${position}-canvas`;
            const canvas = document.getElementById(canvasId);
            const cell = document.getElementById(`neighbor-${position}`);
            
            if (canvas && cell) {
                if (neighbor) {
                    // Remove empty class and draw the neighbor
                    cell.classList.remove('empty');
                    this.drawNeighborTile(canvas, neighbor);
                } else {
                    // Add empty class and clear canvas
                    cell.classList.add('empty');
                    this.clearNeighborCanvas(canvas);
                }
            }
        });
    }
    
    /**
     * Draw a neighbor tile on its canvas
     */
    drawNeighborTile(canvas, neighbor) {
        const ctx = canvas.getContext('2d');
        const gridSize = 16; // 512px / 32 tiles = 16px per tile
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Load and draw pixel data
        if (neighbor.pixel_data) {
            let pixelData;
            
            // Parse pixel data if it's a string
            if (typeof neighbor.pixel_data === 'string') {
                try {
                    pixelData = JSON.parse(neighbor.pixel_data);
                } catch (error) {
                    console.error('❌ Failed to parse neighbor pixel data:', error);
                    return;
                }
            } else {
                pixelData = neighbor.pixel_data;
            }
            
            // Draw pixels
            if (pixelData && Array.isArray(pixelData)) {
                for (let y = 0; y < pixelData.length; y++) {
                    for (let x = 0; x < pixelData[y].length; x++) {
                        const color = pixelData[y][x];
                        if (color && color !== 'white') {
                            ctx.fillStyle = color;
                            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Clear a neighbor canvas
     */
    clearNeighborCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
} 