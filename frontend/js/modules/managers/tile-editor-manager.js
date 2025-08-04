/**
 * Tile Editor Manager
 * Handles tile editing, tools, and save operations
 */

export class TileEditorManager {
    constructor(apiService, eventManager = null) {
        this.apiService = apiService;
        this.eventManager = eventManager;
        this.currentTile = null;
        this.undoStack = [];
        this.redoStack = [];
        this.currentLock = null;
        this.lockInterval = null;
    }

    /**
     * Open tile editor
     */
    async openTileEditor(tile) {
        try {
            console.log('🔄 Opening tile editor for tile:', tile.id);
            
            // First, try to acquire a lock for this tile
            try {
                if (window.API && window.API.tiles) {
                    const lockResult = await window.API.tiles.acquireTileLock(tile.id);
                    this.currentLock = {
                        tileId: tile.id,
                        lockId: lockResult.lock_id,
                        expiresAt: new Date(lockResult.expires_at)
                    };
                    console.log('🔒 Acquired tile lock:', this.currentLock);
                    
                    // Start lock extension interval (extend every 25 minutes)
                    this.startLockExtension();
                }
            } catch (error) {
                if (error.status === 409) {
                    // Tile is locked by another user
                    if (window.UIManager) {
                        window.UIManager.showToast('This tile is currently being edited by another user', 'error');
                    }
                    return;
                } else {
                    console.warn('⚠️ Could not acquire tile lock:', error);
                    // Continue without lock for now
                }
            }
            
            // Get canvas data to access palette type
            let canvasData = null;
            try {
                if (window.API && window.API.canvas) {
                    canvasData = await window.API.canvas.get(tile.canvas_id);
                    console.log('🎨 Fetched canvas data:', canvasData);
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch canvas data:', error);
            }
            
            // Add canvas data to tile object
            tile.canvas = canvasData;
            
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
                
                // FIXED: Always clear the pixel editor first to prevent data bleeding
                window.PixelEditor.clearPixelData();
                console.log('🧹 Cleared pixel editor to prevent data bleeding');
                
                // Load the tile's pixel data (only if it exists and is not empty)
                if (tile.pixel_data && tile.pixel_data !== '[]' && tile.pixel_data !== 'null') {
                    console.log('🎨 Loading pixel data:', typeof tile.pixel_data, 'length:', tile.pixel_data.length);
                    
                    // Check if it's a JSON string that needs to be parsed
                    if (typeof tile.pixel_data === 'string') {
                        try {
                            const parsedData = JSON.parse(tile.pixel_data);
                            
                            // FIXED: Check if parsed data is actually empty
                            if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                                // Check if the data contains any non-white pixels
                                const hasNonWhitePixels = parsedData.some(row => 
                                    row && Array.isArray(row) && row.some(pixel => pixel && pixel !== 'white')
                                );
                                
                                if (hasNonWhitePixels) {
                                    window.PixelEditor.loadPixelData(parsedData);
                                    console.log('✅ Pixel data loaded from JSON string');
                                } else {
                                    console.log('✅ Parsed data contains only white pixels, keeping empty canvas');
                                }
                            } else {
                                console.log('✅ Parsed data is empty, keeping empty canvas');
                            }
                        } catch (error) {
                            console.error('❌ Failed to parse pixel data JSON:', error);
                            console.log('✅ Starting with empty canvas due to parsing error');
                        }
                    } else {
                        // Assume it's already an array
                        if (Array.isArray(tile.pixel_data) && tile.pixel_data.length > 0) {
                            // Check if the data contains any non-white pixels
                            const hasNonWhitePixels = tile.pixel_data.some(row => 
                                row && Array.isArray(row) && row.some(pixel => pixel && pixel !== 'white')
                            );
                            
                            if (hasNonWhitePixels) {
                                window.PixelEditor.loadPixelData(tile.pixel_data);
                                console.log('✅ Pixel data loaded from array');
                            } else {
                                console.log('✅ Array data contains only white pixels, keeping empty canvas');
                            }
                        } else {
                            console.log('✅ Array data is empty, keeping empty canvas');
                        }
                    }
                } else {
                    console.log('✅ No pixel data found, starting with empty canvas');
                }
                
                // FIXED: Force a redraw to ensure the canvas is properly updated
                window.PixelEditor.redraw();
                
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
        
        // Get the current canvas to access its palette type
        let paletteType = 'classic'; // default fallback
        
        // Debug tile data
        console.log('🎨 Tile data for palette selection:', {
            tileId: tile.id,
            canvasId: tile.canvas_id,
            tileCanvasPaletteType: tile.canvas_palette_type,
            tileCanvas: tile.canvas,
            appState: !!window.appState,
            currentCanvas: window.appState ? window.appState.get('currentCanvas') : null
        });
        
        // Try to get palette type from multiple sources
        if (tile.canvas && tile.canvas.palette_type) {
            paletteType = tile.canvas.palette_type;
            console.log('🎨 Using palette type from tile.canvas.palette_type:', paletteType);
        } else if (tile.canvas_palette_type) {
            paletteType = tile.canvas_palette_type;
            console.log('🎨 Using palette type from tile.canvas_palette_type:', paletteType);
        } else if (window.appState && window.appState.get('currentCanvas')) {
            const currentCanvas = window.appState.get('currentCanvas');
            paletteType = currentCanvas.palette_type || 'classic';
            console.log('🎨 Using palette type from currentCanvas:', paletteType);
        } else if (window.canvasViewerManager && window.canvasViewerManager.currentCanvas) {
            const currentCanvas = window.canvasViewerManager.currentCanvas;
            paletteType = currentCanvas.palette_type || 'classic';
            console.log('🎨 Using palette type from canvasViewerManager.currentCanvas:', paletteType);
        } else {
            console.warn('⚠️ Could not determine palette type, using classic as default');
        }
        
        console.log('🎨 Final palette type:', paletteType);
        
        // Define color palettes
        const colorPalettes = {
            classic: ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
            earth: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#D2691E', '#B8860B', '#DAA520'],
            pastel: ['#FFB6C1', '#87CEEB', '#98FB98', '#F0E68C', '#DDA0DD', '#FFA07A', '#B0E0E6', '#F5DEB3'],
            neon: ['#FF1493', '#00FFFF', '#00FF00', '#FFFF00', '#FF00FF', '#FF4500', '#9400D3', '#00CED1'],
            monochrome: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
            retro: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
            artistic: ['#8B4513', '#2F4F4F', '#CD853F', '#8B7355', '#A0522D', '#6B4423', '#8B6914', '#B8860B'],
            sunset: ['#FF6B35', '#F7931E', '#FFB347', '#FFD700', '#FF69B4', '#FF1493', '#DC143C', '#8B0000'],
            ocean: ['#006994', '#1E90FF', '#00BFFF', '#87CEEB', '#4682B4', '#191970', '#000080', '#4169E1'],
            forest: ['#228B22', '#32CD32', '#90EE90', '#98FB98', '#006400', '#228B22', '#556B2F', '#8FBC8F']
        };
        
        // Get colors for the selected palette
        const colors = colorPalettes[paletteType] || colorPalettes.classic;
        
        console.log('🎨 Creating', colors.length, 'color squares for palette:', paletteType);
        
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
        
        console.log('✅ Color palette initialized with', colors.length, 'colors from palette:', paletteType);
        
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
            console.log('💾 Raw pixel data to save:', pixelData);
            
            // Convert pixel data to JSON string if it's an array
            let pixelDataToSend = pixelData;
            if (Array.isArray(pixelData)) {
                pixelDataToSend = JSON.stringify(pixelData);
            }
            console.log('💾 Converted pixel data to JSON string:', pixelDataToSend);
            
            // Determine if this is a new tile or existing tile
            if (!tileId || tileId === 'undefined') {
                console.log('💾 Creating new tile...');
                
                // Validate that we have a canvas_id
                if (!this.currentTile || !this.currentTile.canvas_id) {
                    throw new Error('Missing canvas_id for new tile');
                }
                
                const createData = {
                    canvas_id: this.currentTile.canvas_id,
                    x: this.currentTile.x,
                    y: this.currentTile.y,
                    pixel_data: pixelDataToSend
                };
                
                console.log('💾 Creating tile with data:', createData);
                
                // Use the correct method name: 'create' instead of 'createTile'
                const newTile = await this.apiService.create(createData);
                console.log('✅ New tile created successfully:', newTile);
                
                // Update the current tile with the new ID
                this.currentTile = newTile;
                
                // Clear undo/redo stacks
                this.undoStack = [];
                this.redoStack = [];
                
                // Show success message
                window.UIManager.showToast('Tile created successfully!', 'success');
                
                // FIXED: Emit event for other components (only if eventManager exists)
                if (this.eventManager) {
                    this.eventManager.emit('tileCreated', newTile);
                } else {
                    console.warn('⚠️ Event manager not available, skipping event emission');
                }
                
            } else {
                console.log('💾 Updating existing tile...');
                
                const updateData = {
                    pixel_data: pixelDataToSend
                };
                
                console.log('💾 Updating tile with data:', updateData);
                
                const updatedTile = await this.apiService.update(tileId, updateData);
                console.log('✅ Tile updated successfully:', updatedTile);
                
                // Clear undo/redo stacks
                this.undoStack = [];
                this.redoStack = [];
                
                // Show success message
                window.UIManager.showToast('Tile saved successfully!', 'success');
                
                // FIXED: Emit event for other components (only if eventManager exists)
                if (this.eventManager) {
                    this.eventManager.emit('tileUpdated', updatedTile);
                } else {
                    console.warn('⚠️ Event manager not available, skipping event emission');
                }
            }
            
            // Release the lock after successful save
            await this.releaseCurrentLock();
            
            // FIXED: Return to canvas viewer after successful save
            setTimeout(() => {
                if (window.navigationManager) {
                    window.navigationManager.showSection('viewer');
                } else {
                    // Fallback: hide editor section and show viewer section
                    const editorSection = document.getElementById('editor-section');
                    const viewerSection = document.getElementById('viewer-section');
                    if (editorSection) editorSection.classList.add('hidden');
                    if (viewerSection) viewerSection.classList.remove('hidden');
                }
            }, 500); // Small delay to show the success message
            
        } catch (error) {
            console.error('❌ Failed to save tile:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                apiService: !!this.apiService,
                pixelEditor: !!window.PixelEditor,
                errorType: error.constructor.name,
                tileId: tileId,
                currentTile: this.currentTile
            });
            
            // Show error message
            window.UIManager.showToast(`Failed to save tile: ${error.message}`, 'error');
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
            backBtn.onclick = async () => {
                console.log('🔙 Back button clicked, returning to canvas viewer');
                
                // Release the lock before going back
                await this.releaseCurrentLock();
                
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
            
            // Validate that we have a canvas_id
            if (!currentTile.canvas_id) {
                console.warn('⚠️ No canvas_id provided for tile, cannot load neighbors');
                return;
            }
            
            // Debug API service
            console.log('🔍 API service available:', !!this.apiService);
            console.log('🔍 API service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.apiService)));
            
            // Get all tiles for the current canvas
            let allTiles;
            if (this.apiService.getCanvasTiles) {
                allTiles = await this.apiService.getCanvasTiles(currentTile.canvas_id);
            } else if (this.apiService.getForCanvas) {
                allTiles = await this.apiService.getForCanvas(currentTile.canvas_id);
            } else {
                console.error('❌ No method available to get canvas tiles');
                return;
            }
            
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

    /**
     * Start lock extension interval
     */
    startLockExtension() {
        if (this.lockInterval) {
            clearInterval(this.lockInterval);
        }
        
        // Extend lock every 25 minutes (before 30-minute expiration)
        this.lockInterval = setInterval(async () => {
            if (this.currentLock && window.API && window.API.tiles) {
                try {
                    await window.API.tiles.extendTileLock(this.currentLock.tileId);
                    console.log('🔒 Extended tile lock');
                } catch (error) {
                    console.warn('⚠️ Failed to extend tile lock:', error);
                }
            }
        }, 25 * 60 * 1000); // 25 minutes
    }

    /**
     * Release current tile lock
     */
    async releaseCurrentLock() {
        if (this.currentLock && window.API && window.API.tiles) {
            try {
                await window.API.tiles.releaseTileLock(this.currentLock.tileId);
                console.log('🔓 Released tile lock');
            } catch (error) {
                console.warn('⚠️ Failed to release tile lock:', error);
            }
        }
        
        this.currentLock = null;
        
        if (this.lockInterval) {
            clearInterval(this.lockInterval);
            this.lockInterval = null;
        }
    }

    /**
     * Clean up when closing tile editor
     */
    async closeTileEditor() {
        await this.releaseCurrentLock();
        this.currentTile = null;
        this.undoStack = [];
        this.redoStack = [];
    }
} 