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
        this.neighborTiles = {}; // Store neighbor tile data for color picking
        
        // Set up mobile-specific event listeners for lock cleanup
        this.setupMobileLockCleanup();
    }

    /**
     * Open tile editor for a specific tile
     */
    async openTileEditor(tile) {
        console.log('🎨 Opening tile editor for tile:', tile);
        
        try {
            // 🚨 CRITICAL FIX: Clear pixel editor state before loading new tile
            // This prevents pixel data bleeding between different tiles
            this.clearPixelEditorState();
            
            // For blank tiles (undefined id), we need to create them first
            if (!tile.id) {
                console.log('🆕 Creating new tile for blank position...');
                
                // Create the tile first
                const createData = {
                    canvas_id: tile.canvas_id,
                    x: tile.x,
                    y: tile.y,
                    pixel_data: this.createEmptyPixelData(),
                    title: `Tile at (${tile.x}, ${tile.y})`,
                    description: 'New tile',
                    is_public: true
                };
                
                console.log('📝 Creating tile with data:', createData);
                
                const newTile = await this.apiService.create(createData);
                console.log('✅ Tile created successfully:', newTile);
                
                // Extract tile data from response (backend returns {message: "...", tile: {...}})
                const tileData = newTile.tile || newTile;
                console.log('📋 Extracted tile data:', tileData);
                
                // Update the tile object with the new ID
                tile.id = tileData.id;
                tile.creator_id = tileData.creator_id;
                tile.created_at = tileData.created_at;
                tile.updated_at = tileData.updated_at;
                
                console.log('🔄 Updated tile object with new data:', tile);
            }
            
            // Fetch full tile details including creator information
            let fullTileData = tile;
            try {
                if (window.API && window.API.tiles) {
                    const tileDetails = await window.API.tiles.get(tile.id);
                    fullTileData = tileDetails;
                    console.log('✅ Fetched full tile details:', tileDetails);
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch full tile details, using provided tile data:', error);
                // Continue with the provided tile data
            }
            
            // Get canvas data to access palette type and collaboration mode
            let canvasData = null;
            try {
                if (window.API && window.API.canvas) {
                    canvasData = await window.API.canvas.get(fullTileData.canvas_id);
                    console.log('🎨 Fetched canvas data:', canvasData);
                    
                    // Add canvas data to tile object for permission checking
                    fullTileData.canvas = canvasData;
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch canvas data:', error);
            }
            
            // Update canvas name in editor header
            if (canvasData) {
                this.updateCanvasName(canvasData);
            }
            
            // Check if user can edit this tile
            const canEdit = this.checkEditPermissions(fullTileData);
            console.log('🔐 User can edit tile:', canEdit);
            
            if (!canEdit) {
                console.log('❌ User cannot edit this tile, staying on viewer');
                window.UIManager.showToast('You cannot edit this tile', 'warning');
                
                // Throw error to prevent editor from opening
                throw new Error('User does not have permission to edit this tile');
            }
            
            // Try to acquire tile lock
            try {
                console.log('🔒 Attempting to acquire tile lock...');
                const lockResult = await window.API.tiles.acquireTileLock(tile.id);
                console.log('✅ Tile lock acquired:', lockResult);
                
                // FIXED: Store the lock information for later release
                this.currentLock = {
                    tileId: tile.id,
                    lockId: lockResult.lock_id,
                    userId: window.CONFIG_UTILS ? window.CONFIG_UTILS.getUserData()?.id : null
                };
                
                console.log('💾 Stored lock info:', this.currentLock);
                
            } catch (lockError) {
                console.error('❌ Failed to acquire tile lock:', lockError);
                
                // Show user-friendly error message
                let lockErrorMessage = 'Failed to acquire tile lock';
                if (lockError.data && lockError.data.detail) {
                    lockErrorMessage = lockError.data.detail;
                } else if (lockError.message) {
                    lockErrorMessage = lockError.message;
                }
                
                window.UIManager.showToast(lockErrorMessage, 'error');
                
                // Re-throw the error so canvas-viewer-manager can handle navigation
                throw lockError;
            }
            
            // Store the current tile data
            this.currentTile = fullTileData;
            
            // Initialize the tile editor with the tile data
            await this.initializeTileEditor(fullTileData);
            
            // NOTE: Editor section is now shown by canvas-viewer-manager.js
            // after this method completes successfully
            console.log('✅ Tile editor initialized successfully');
            
        } catch (error) {
            console.error('❌ Error opening tile editor:', error);
            
            // Show error message
            let errorMessage = 'Failed to open tile editor';
            if (error.data && error.data.detail) {
                errorMessage = error.data.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            window.UIManager.showToast(errorMessage, 'error');
            
            // Re-throw the error so canvas-viewer-manager can handle navigation
            throw error;
        }
    }
    
    /**
     * Create empty pixel data for new tiles
     * @returns {Array} 2D array of transparent pixels
     */
    createEmptyPixelData() {
        const tileSize = 64; // Default tile size
        const emptyPixelData = [];
        
        for (let y = 0; y < tileSize; y++) {
            const row = [];
            for (let x = 0; x < tileSize; x++) {
                // RGBA format: [R, G, B, A] where A=0 means transparent
                row.push([0, 0, 0, 0]); // Transparent black
            }
            emptyPixelData.push(row);
        }
        
        // Return as JSON string since backend expects pixel_data to be a JSON string
        return JSON.stringify(emptyPixelData);
    }

    /**
     * Initialize tile editor with tile data
     */
    initializeTileEditor(tile) {
        console.log('🎨 Initializing tile editor with tile:', tile);
        
        // FIXED: Use the correct canvas element ID
        const canvasElement = document.getElementById('pixel-canvas');
        console.log('🔍 Canvas element found:', canvasElement);
        
        if (!canvasElement) {
            console.error('❌ Pixel editor canvas element not found!');
            console.log('🔍 Available canvas elements:', document.querySelectorAll('canvas'));
            return;
        }
        
        // Get canvas data to determine tile size
        if (window.API && window.API.canvas) {
            window.API.canvas.get(tile.canvas_id).then(canvasData => {
                console.log('🎨 Canvas data for tile editor:', canvasData);
                
                // FIXED: Pass the correct tile size to pixel editor
                const tileSize = canvasData.tile_size || 64;
                console.log(`🎨 Using tile size: ${tileSize}×${tileSize}`);
                
                // Initialize pixel editor with correct tile size
                if (window.PixelEditor) {
                    console.log(' Initializing PixelEditor with canvas:', canvasElement, 'and tile size:', tileSize);
                    window.PixelEditor.init(canvasElement, tileSize);
                    
                    // Load existing pixel data if tile exists
                    if (tile.pixel_data) {
                        try {
                            const pixelData = JSON.parse(tile.pixel_data);
                            window.PixelEditor.loadPixelData(pixelData);
                            console.log('✅ Loaded existing pixel data');
                        } catch (error) {
                            console.warn('⚠️ Could not parse pixel data, using empty canvas');
                        }
                    }
                } else {
                    console.error('❌ PixelEditor not available!');
                }
                
                // Update tile info display
                this.updateTileInfo(tile);
                
            }).catch(error => {
                console.error('❌ Failed to get canvas data:', error);
                // Fallback to default tile size
                if (window.PixelEditor) {
                    window.PixelEditor.init(canvasElement, 64);
                }
            });
        } else {
            console.error('❌ Canvas API not available!');
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
        
        // 🚨 CRITICAL FIX: Initialize color palette (was missing after refactoring)
        this.initializeColorPalette(tile);
        
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
            // Classic RGB palette - fundamental colors
            classic: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FF0000', // Pure Red
                '#00FF00', // Pure Green
                '#0000FF', // Pure Blue
                '#FFFF00', // Yellow
                '#FF00FF', // Magenta
                '#00FFFF'  // Cyan
            ],
            
            // Van Gogh inspired - warm, vibrant earth tones
            earth: [
                '#000000', // Black
                '#FFFFFF', // White
                '#8B4513', // Saddle Brown - Dark
                '#A0522D', // Sienna - Medium
                '#CD853F', // Peru - Light
                '#D2691E', // Chocolate - Rich
                '#B8860B', // Dark Goldenrod - Deep
                '#DAA520', // Goldenrod - Medium
                '#F4A460', // Sandy Brown - Light
                '#DEB887', // Burlywood - Soft
                '#8B7355', // Dark Khaki - Muted
                '#A0522D'  // Sienna - Warm
            ],
            
            // Monet inspired - soft, harmonious pastels
            pastel: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FFB6C1', // Light Pink - Soft
                '#87CEEB', // Sky Blue - Gentle
                '#98FB98', // Pale Green - Fresh
                '#F0E68C', // Khaki - Warm
                '#DDA0DD', // Plum - Delicate
                '#FFA07A', // Light Salmon - Soft
                '#B0E0E6', // Powder Blue - Airy
                '#F5DEB3', // Wheat - Natural
                '#E6E6FA', // Lavender - Dreamy
                '#FFE4E1'  // Misty Rose - Tender
            ],
            
            // 80s Synthwave inspired - electric and vibrant
            neon: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FF1493', // Deep Pink - Electric
                '#00FFFF', // Cyan - Bright
                '#00FF00', // Lime - Vibrant
                '#FFFF00', // Yellow - Glowing
                '#FF00FF', // Magenta - Bold
                '#FF4500', // Orange Red - Hot
                '#9400D3', // Dark Violet - Electric
                '#00CED1', // Dark Turquoise - Bright
                '#FF69B4', // Hot Pink - Neon
                '#32CD32'  // Lime Green - Electric
            ],
            
            // Ansel Adams inspired - dramatic monochrome
            monochrome: [
                '#000000', // Pure Black
                '#1A1A1A', // Very Dark Gray
                '#333333', // Dark Gray
                '#4D4D4D', // Medium Dark Gray
                '#666666', // Medium Gray
                '#808080', // Gray
                '#999999', // Light Gray
                '#B3B3B3', // Very Light Gray
                '#CCCCCC', // Light Gray
                '#E6E6E6', // Very Light Gray
                '#F5F5F5', // Almost White
                '#FFFFFF'  // Pure White
            ],
            
            // Wes Anderson inspired - quirky, retro charm
            retro: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FF6B6B', // Coral - Warm
                '#4ECDC4', // Turquoise - Fresh
                '#45B7D1', // Sky Blue - Vintage
                '#96CEB4', // Sage Green - Muted
                '#FFEAA7', // Cream - Soft
                '#DDA0DD', // Plum - Retro
                '#98D8C8', // Mint - Pastel
                '#F7DC6F', // Golden - Warm
                '#E8A87C', // Peach - Gentle
                '#C38D9E'  // Mauve - Vintage
            ],
            
            // A refined, artistic palette with specific tones and their variations.
            artistic: [
                '#000000', // Black
                '#FFFFFF', // White
                '#5D3C2A', // Burnt Umber - Dark
                '#794D36', // Burnt Umber - Medium
                '#9B6A56', // Burnt Umber - Light
                '#2A3644', // Payne's Grey - Dark
                '#3B4E63', // Payne's Grey - Medium
                '#4F6782', // Payne's Grey - Light
                '#9A326B', // Magenta - Dark
                '#C73E8A', // Magenta - Medium
                '#F35FAD', // Magenta - Light
                '#B7811A', // Yellow Ochre - Dark
                '#DDA032', // Yellow Ochre - Medium
                '#FDD477', // Yellow Ochre - Light
                '#1E6351', // Blue Shade Green - Dark
                '#2A8C73', // Blue Shade Green - Medium
                '#38A98E'  // Blue Shade Green - Light
            ],
            
            // Turner inspired - dramatic sunset and storm colors
            sunset: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FF6B35', // Orange Red - Bright
                '#F7931E', // Orange - Warm
                '#FFB347', // Sandy Orange - Soft
                '#FFD700', // Gold - Radiant
                '#FF69B4', // Hot Pink - Vibrant
                '#FF1493', // Deep Pink - Bold
                '#DC143C', // Crimson - Rich
                '#8B0000', // Dark Red - Deep
                '#FF8C00', // Dark Orange - Warm
                '#FF4500'  // Orange Red - Fiery
            ],
            
            // Hokusai inspired - ocean waves and sea colors
            ocean: [
                '#000000', // Black
                '#FFFFFF', // White
                '#006994', // Deep Sea Blue - Dark
                '#1E90FF', // Dodger Blue - Bright
                '#00BFFF', // Deep Sky Blue - Clear
                '#87CEEB', // Sky Blue - Light
                '#4682B4', // Steel Blue - Medium
                '#191970', // Midnight Blue - Deep
                '#000080', // Navy - Rich
                '#4169E1', // Royal Blue - Classic
                '#6495ED', // Cornflower Blue - Soft
                '#B0C4DE'  // Light Steel Blue - Gentle
            ],
            
            // Rousseau inspired - lush jungle and forest colors
            forest: [
                '#000000', // Black
                '#FFFFFF', // White
                '#228B22', // Forest Green - Classic
                '#32CD32', // Lime Green - Bright
                '#90EE90', // Light Green - Fresh
                '#98FB98', // Pale Green - Soft
                '#006400', // Dark Green - Deep
                '#556B2F', // Dark Olive Green - Rich
                '#8FBC8F', // Dark Sea Green - Muted
                '#2E8B57', // Sea Green - Natural
                '#3CB371', // Medium Sea Green - Fresh
                '#20B2AA'  // Light Sea Green - Bright
            ],
            
            // Blade Runner inspired - futuristic cyberpunk
            cyberpunk: [
                '#000000', // Black
                '#FFFFFF', // White
                '#E6007A', // Hot Pink - Electric
                '#00FFFF', // Cyan - Bright
                '#00FF00', // Lime - Neon
                '#FFFF00', // Yellow - Glowing
                '#FF4500', // Orange Red - Hot
                '#8A2BE2', // Blue Violet - Electric
                '#32CD32', // Lime Green - Bright
                '#1E90FF', // Dodger Blue - Electric
                '#FF1493', // Deep Pink - Bold
                '#00CED1'  // Dark Turquoise - Bright
            ],
            
            // Edward Hopper inspired - vintage Americana
            vintage: [
                '#000000', // Black
                '#FFFFFF', // White
                '#A0522D', // Sienna - Classic
                '#D2B48C', // Tan - Warm
                '#CD853F', // Peru - Rich
                '#F5DEB3', // Wheat - Soft
                '#8B4513', // Saddle Brown - Deep
                '#695E54', // Dark Brown - Muted
                '#D3C1AE', // Beige - Gentle
                '#E9D8A6', // Cream - Soft
                '#B8860B', // Dark Goldenrod - Rich
                '#DAA520'  // Goldenrod - Warm
            ],
            
            // Georgia O'Keeffe inspired - desert landscapes
            desert: [
                '#000000', // Black
                '#FFFFFF', // White
                '#FAD7A0', // Peach - Soft
                '#F7DC6F', // Golden - Warm
                '#E6B0AA', // Light Pink - Dusty
                '#D7BDE2', // Light Purple - Soft
                '#C39BD3', // Light Purple - Medium
                '#A569BD', // Medium Purple - Rich
                '#7D3C98', // Purple - Deep
                '#512E5F', // Dark Purple - Rich
                '#D4AC0D', // Golden - Bright
                '#E67E22'  // Carrot Orange - Warm
            ],
            
            // Klimt inspired - rich jewel tones
            grapevine: [
                '#000000', // Black
                '#FFFFFF', // White
                '#5B2C6F', // Dark Purple - Rich
                '#8E44AD', // Purple - Medium
                '#BB8FCE', // Light Purple - Soft
                '#E8DAEF', // Very Light Purple - Gentle
                '#D4E6F1', // Light Blue - Soft
                '#A9CCE3', // Light Blue - Medium
                '#5499C7', // Blue - Medium
                '#2874A6', // Dark Blue - Rich
                '#922B21', // Dark Red - Rich
                '#C0392B'  // Red - Medium
            ],
            
            // Rothko inspired - deep, contemplative colors
            midnightSky: [
                '#000000', // Black
                '#FFFFFF', // White
                '#000033', // Deep Blue Black - Dark
                '#191970', // Midnight Blue - Rich
                '#4169E1', // Royal Blue - Medium
                '#6495ED', // Cornflower Blue - Soft
                '#ADD8E6', // Light Blue - Gentle
                '#B0E0E6', // Powder Blue - Airy
                '#F0F8FF', // Alice Blue - Very Light
                '#2F4F4F', // Dark Slate Gray - Deep
                '#708090', // Slate Gray - Medium
                '#C0C0C0'  // Silver - Light
            ]
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
     * FIXED: Update canvas name in editor header
     */
    updateCanvasName(canvasData) {
        if (canvasData && canvasData.name) {
            const canvasTitle = document.getElementById('canvas-title');
            if (canvasTitle) {
                canvasTitle.textContent = canvasData.name;
                console.log('✅ Updated canvas name in editor:', canvasData.name);
            } else {
                console.warn('⚠️ Canvas title element not found in editor');
            }
        } else {
            console.warn('⚠️ No canvas data or name provided');
        }
    }

    /**
     * Update tile information display
     */
    updateTileInfo(tile) {
        // Get current user for ownership comparison
        const currentUser = window.CONFIG_UTILS ? window.CONFIG_UTILS.getUserData() : null;
        const isOwner = currentUser && tile.creator_id === currentUser.id;
        
        // Update current tile coordinates
        const coordsElement = document.getElementById('current-tile-coords');
        if (coordsElement) {
            coordsElement.textContent = `Tile: (${tile.x}, ${tile.y})`;
        }
        
        // Update tile owner with ownership indicator
        const ownerElement = document.getElementById('tile-info-owner');
        if (ownerElement) {
            const ownerName = tile.creator_username || 'Unknown';
            const ownershipIcon = isOwner ? '👤' : '🔒';
            const ownershipText = isOwner ? 'Your tile' : `Created by ${ownerName}`;
            ownerElement.innerHTML = `${ownershipIcon} ${ownershipText}`;
            
            // Add visual styling for ownership
            if (isOwner) {
                ownerElement.style.color = '#4CAF50'; // Green for owned tiles
                ownerElement.title = 'You can edit this tile';
            } else {
                ownerElement.style.color = '#FF9800'; // Orange for other users' tiles
                ownerElement.title = 'You cannot edit tiles created by other users in this canvas mode';
            }
        }
        
        // Update tile canvas info
        const canvasElement = document.getElementById('tile-info-canvas');
        if (canvasElement) {
            const canvasName = tile.canvas?.name || tile.canvas_name || 'Unknown';
            const collaborationMode = tile.canvas?.collaboration_mode || 'unknown';
            canvasElement.innerHTML = `Canvas: ${canvasName} <span style="font-size: 0.8em; color: #666;">(${collaborationMode} mode)</span>`;
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
        
        // Add collaboration mode warning if user doesn't own the tile
        if (!isOwner && tile.canvas?.collaboration_mode !== 'free') {
            const warningElement = document.getElementById('tile-edit-warning');
            if (warningElement) {
                warningElement.innerHTML = `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin: 10px 0;">
                        <strong>⚠️ Read-only tile</strong><br>
                        You can only edit your own tiles in ${tile.canvas?.collaboration_mode || 'restricted'} mode.
                        <br><small>Try creating a new tile in an empty position instead.</small>
                    </div>
                `;
                warningElement.style.display = 'block';
            }
        } else {
            // Hide warning if user owns the tile or canvas is in free mode
            const warningElement = document.getElementById('tile-edit-warning');
            if (warningElement) {
                warningElement.style.display = 'none';
            }
        }
        
        console.log('✅ Tile info updated:', tile);
    }

    /**
     * Setup save button (both header and floating)
     */
    setupSaveButton(tile) {
        console.log('🔧 Setting up save buttons for tile:', tile.id);
        
        // Setup original header save button
        const saveBtn = document.getElementById('save-tile-btn');
        // Setup new floating save button
        const floatingSaveBtn = document.getElementById('floating-save-btn');
        
        console.log('🔍 Save button elements found:', {
            header: saveBtn ? 'found' : 'not found',
            floating: floatingSaveBtn ? 'found' : 'not found'
        });
        
        const buttons = [
            { element: saveBtn, id: 'save-tile-btn', type: 'header' },
            { element: floatingSaveBtn, id: 'floating-save-btn', type: 'floating' }
        ].filter(btn => btn.element); // Filter out null buttons
        
        // Check if user can edit this tile
        const currentUser = window.CONFIG_UTILS ? window.CONFIG_UTILS.getUserData() : null;
        const isOwner = currentUser && tile.creator_id === currentUser.id;
        const isFreeMode = tile.canvas?.collaboration_mode === 'free';
        const canEdit = isOwner || isFreeMode;
        
        buttons.forEach(({ element, id, type }) => {
            console.log(`🔧 Setting up ${type} save button`);
            
            // Remove any existing event listeners by cloning
            const newBtn = element.cloneNode(true);
            element.parentNode.replaceChild(newBtn, element);
            
            if (canEdit) {
                // User can edit this tile
                const saveHandler = async () => {
                    console.log(`💾 ${type} save button clicked for tile:`, tile.id);
                    await this.saveTile(tile.id);
                };
                
                // FIXED: Use unified touch event system
                this.setupUnifiedTouchEvents(newBtn, saveHandler, type);
                
                // Enable the save button
                newBtn.disabled = false;
                if (type === 'floating') {
                    newBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                } else {
                    newBtn.innerHTML = '<i class="fas fa-save"></i> Save Tile';
                }
                newBtn.style.backgroundColor = '#4CAF50';
                newBtn.title = 'Save your changes to this tile';
                
                console.log(`✅ ${type} save button enabled for editable tile with unified touch support`);
            } else {
                // User cannot edit this tile
                newBtn.disabled = true;
                if (type === 'floating') {
                    newBtn.innerHTML = '<i class="fas fa-lock"></i> Locked';
                } else {
                    newBtn.innerHTML = '<i class="fas fa-lock"></i> Read Only';
                }
                newBtn.style.backgroundColor = '#9E9E9E';
                newBtn.title = 'You can only edit your own tiles in this canvas mode';
                
                console.log(`🔒 ${type} save button disabled for read-only tile`);
            }
        });
        
        if (buttons.length === 0) {
            console.warn('⚠️ No save buttons found');
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
            
            // 🚨 CRITICAL FIX: Verify we're editing the correct tile
            if (this.currentTile && this.currentTile.id && this.currentTile.id.toString() !== tileId.toString()) {
                console.error('❌ TILE ID MISMATCH! Current tile ID:', this.currentTile.id, 'but trying to save tile ID:', tileId);
                throw new Error('Tile ID mismatch - trying to save data for wrong tile');
            }
            
            const pixelData = window.PixelEditor.getPixelData();
            console.log('💾 Raw pixel data to save:', pixelData);
            
            // 🚨 CRITICAL FIX: Validate pixel data integrity
            if (!pixelData || !Array.isArray(pixelData)) {
                console.error('❌ Invalid pixel data - not an array:', pixelData);
                throw new Error('Invalid pixel data - corrupted or missing');
            }
            
            // Validate pixel data dimensions
            const expectedSize = window.PixelEditor.tileSize || 32;
            if (pixelData.length !== expectedSize || (pixelData[0] && pixelData[0].length !== expectedSize)) {
                console.error('❌ Pixel data dimension mismatch - expected:', expectedSize, 'got:', {
                    rows: pixelData.length,
                    cols: pixelData[0] ? pixelData[0].length : 'undefined'
                });
                throw new Error(`Pixel data dimension mismatch - expected ${expectedSize}×${expectedSize}`);
            }
            
            // Convert pixel data to JSON string if it's an array
            let pixelDataToSend = pixelData;
            if (Array.isArray(pixelData)) {
                pixelDataToSend = JSON.stringify(pixelData);
            }
            console.log('💾 Converted pixel data to JSON string:', pixelDataToSend);
            
            // Determine if this is a new tile or existing tile
            // Handle both undefined and string "undefined" cases
            const isNewTile = !tileId || tileId === 'undefined' || tileId === undefined || tileId === null;
            
            if (isNewTile) {
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
                
                // FIXED: Update the current tile with the new data (includes created_at/updated_at)
                this.currentTile = newTile;
                this.updateTileInfo(newTile);
                
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
                
                // FIXED: Update current tile data with the response (includes updated_at)
                this.currentTile = updatedTile;
                this.updateTileInfo(updatedTile);
                
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
            console.log('🔓 Starting lock release after successful save...');
            await this.releaseCurrentLock();
            console.log('✅ Lock release completed, proceeding with navigation...');
            
            // Detect if we're on mobile for additional delay
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const navigationDelay = isMobile ? 1000 : 500; // Extra delay on mobile
            
            console.log(`🔄 Navigating back to viewer in ${navigationDelay}ms (mobile: ${isMobile})...`);
            
            // Return to canvas viewer after successful save
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
                console.log('✅ Navigation to viewer completed');
            }, navigationDelay);
            
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
            
            // Handle specific error types with better user feedback
            let errorMessage = 'Failed to save tile';
            
            if (error.status === 403) {
                // Permission denied - likely collaboration mode restriction
                errorMessage = 'You can only edit your own tiles in this canvas mode. This tile was created by another user.';
            } else if (error.status === 409) {
                // Conflict - tile is locked by another user
                errorMessage = 'This tile is currently being edited by another user. Please try again later.';
            } else if (error.status === 404) {
                // Not found
                errorMessage = 'Tile not found. It may have been deleted by another user.';
            } else if (error.status === 422) {
                // Validation error
                errorMessage = 'Invalid tile data. Please check your changes and try again.';
            } else if (error.status >= 500) {
                // Server error
                errorMessage = 'Server error occurred. Please try again later.';
            } else if (error.message) {
                // Use the specific error message if available
                errorMessage = error.message;
            }
            
            // Show error message
            window.UIManager.showToast(errorMessage, 'error');
            
            // For permission errors, also show a more detailed message in console
            if (error.status === 403) {
                console.warn('🔒 Permission denied: This tile was created by another user and cannot be modified in the current canvas mode.');
                console.warn('💡 Tip: Try creating a new tile in an empty position instead.');
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
            { id: 'picker-tool', tool: 'picker' }  // Fixed: was 'eyedropper', should be 'picker'
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
            'picker': 'picker-tool'  // Fixed: was 'eyedropper', should be 'picker'
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
     * Setup back button (both header and floating)
     */
    setupBackButton() {
        console.log('🔧 Setting up back buttons...');
        
        const backBtn = document.getElementById('back-to-grid-btn');
        const floatingBackBtn = document.getElementById('floating-back-btn');
        
        console.log('🔍 Back button elements found:', {
            header: backBtn ? 'found' : 'not found',
            floating: floatingBackBtn ? 'found' : 'not found'
        });
        
        const buttons = [
            { element: backBtn, type: 'header' },
            { element: floatingBackBtn, type: 'floating' }
        ].filter(btn => btn.element);
        
        const backHandler = async () => {
            console.log('🔙 Back button clicked, returning to canvas viewer');
            
            // Release the lock before going back
            await this.releaseCurrentLock();
            
            if (window.navigationManager) {
                window.navigationManager.showSection('viewer');
            }
        };
        
        buttons.forEach(({ element, type }) => {
            // FIXED: Use unified touch event system
            this.setupUnifiedTouchEvents(element, backHandler, type);
            
            console.log(`✅ ${type} back button setup complete with unified touch support`);
        });
        
        if (buttons.length === 0) {
            console.warn('⚠️ No back buttons found');
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
            
            // Get canvas data to determine tile size
            const canvasData = await window.API.canvas.get(currentTile.canvas_id);
            console.log('🔧 Canvas data for neighbor tiles:', {
                canvasId: currentTile.canvas_id,
                tileSize: canvasData.tile_size,
                canvasName: canvasData.name
            });
            
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
            
            // Find neighbor tiles (8 directions) with correct tile size
            const neighbors = this.findNeighborTiles(currentTile, allTiles, canvasData.tile_size);
            
            // Display neighbor tiles with correct tile size
            this.displayNeighborTiles(neighbors, canvasData.tile_size);
            
            console.log('✅ Neighbor tiles loaded:', Object.keys(neighbors).length);
            
        } catch (error) {
            console.error('❌ Failed to load neighbor tiles:', error);
        }
    }
    
    /**
     * Find neighbor tiles in all 8 directions
     */
    findNeighborTiles(currentTile, allTiles, tileSize) {
        const neighbors = {};
        
        // Use provided tile size or fallback to current tile's tile_size
        const actualTileSize = tileSize || currentTile.tile_size || 32;
        const gridSize = 1024 / actualTileSize;
        
        console.log('🔧 Finding neighbors with:', {
            currentTileId: currentTile.id,
            currentTileX: currentTile.x,
            currentTileY: currentTile.y,
            tileSize: actualTileSize,
            gridSize: gridSize
        });
        
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
            
            // Check boundaries based on grid size
            if (neighborX >= 0 && neighborX < gridSize && neighborY >= 0 && neighborY < gridSize) {
                const neighbor = allTiles.find(tile => 
                    tile.x === neighborX && tile.y === neighborY
                );
                
                if (neighbor) {
                    neighbors[key] = neighbor;
                    console.log(`✅ Found ${key} neighbor at (${neighborX}, ${neighborY})`);
                } else {
                    console.log(`❌ No ${key} neighbor at (${neighborX}, ${neighborY})`);
                }
            } else {
                console.log(`❌ ${key} neighbor position (${neighborX}, ${neighborY}) out of bounds`);
            }
        });
        
        return neighbors;
    }
    
    /**
     * Display neighbor tiles on the neighbor canvases
     */
    displayNeighborTiles(neighbors, tileSize) {
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
                    this.drawNeighborTile(canvas, neighbor, tileSize);
                    
                    // Store neighbor data for color picking
                    this.neighborTiles[position] = neighbor;
                    
                    // Add click handler for color picking
                    this.setupNeighborCanvasClickHandler(canvas, neighbor, position);
                    
                } else {
                    // Add empty class and clear canvas
                    cell.classList.add('empty');
                    this.clearNeighborCanvas(canvas);
                    
                    // Remove neighbor data and click handler
                    delete this.neighborTiles[position];
                    this.removeNeighborCanvasClickHandler(canvas);
                }
            }
        });
    }
    
    /**
     * Draw a neighbor tile on its canvas
     */
    drawNeighborTile(canvas, neighbor, tileSize) {
        const ctx = canvas.getContext('2d');
        
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
            
            // FIXED: Use provided tile size or calculate from pixel data
            const actualTileSize = tileSize || (pixelData && Array.isArray(pixelData) ? pixelData.length : 32);
            const pixelSize = canvas.width / actualTileSize;
            
            console.log(`🎨 Drawing neighbor tile: ${actualTileSize}x${actualTileSize}, pixelSize: ${pixelSize}, canvas width: ${canvas.width}`);
            
            if (pixelData && Array.isArray(pixelData)) {
                for (let y = 0; y < actualTileSize; y++) {
                    for (let x = 0; x < actualTileSize; x++) {
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
                                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                            }
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
     * Setup click handler for neighbor canvas color picking
     */
    setupNeighborCanvasClickHandler(canvas, neighbor, position) {
        // Remove any existing click handler
        this.removeNeighborCanvasClickHandler(canvas);
        
        // Add new click handler
        const clickHandler = (event) => {
            // Only handle clicks if picker tool is active
            if (window.PixelEditor && window.PixelEditor.currentTool === 'picker') {
                event.preventDefault();
                event.stopPropagation();
                
                // Parse neighbor pixel data
                let pixelData;
                if (typeof neighbor.pixel_data === 'string') {
                    try {
                        pixelData = JSON.parse(neighbor.pixel_data);
                    } catch (error) {
                        console.error('❌ Failed to parse neighbor pixel data for color picking:', error);
                        return;
                    }
                } else {
                    pixelData = neighbor.pixel_data;
                }
                
                if (pixelData && Array.isArray(pixelData)) {
                    // Use the pixel editor's external color picking method
                    window.PixelEditor.pickColorFromExternalCanvas(
                        canvas, 
                        event.clientX, 
                        event.clientY, 
                        pixelData
                    );
                }
            }
        };
        
        // Store the handler reference for later removal
        canvas._neighborClickHandler = clickHandler;
        canvas.addEventListener('click', clickHandler);
        
        console.log(`✅ Added color picker click handler to ${position} neighbor canvas`);
    }
    
    /**
     * Remove click handler from neighbor canvas
     */
    removeNeighborCanvasClickHandler(canvas) {
        if (canvas._neighborClickHandler) {
            canvas.removeEventListener('click', canvas._neighborClickHandler);
            delete canvas._neighborClickHandler;
        }
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
     * Release current tile lock with retry logic for mobile reliability
     */
    async releaseCurrentLock(retries = 3) {
        if (!this.currentLock || !window.API || !window.API.tiles) {
            console.log('🔓 No lock to release or API not available');
            this.currentLock = null;
            return;
        }

        const tileId = this.currentLock.tileId;
        console.log(`🔓 Attempting to release tile lock for tile ${tileId}...`);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`🔓 Lock release attempt ${attempt}/${retries} for tile ${tileId}`);
                
                await window.API.tiles.releaseTileLock(tileId);
                
                console.log(`✅ Successfully released tile lock for tile ${tileId} on attempt ${attempt}`);
                
                // Clear local lock reference only after successful release
                this.currentLock = null;
                
                // Clear lock refresh interval
                if (this.lockInterval) {
                    clearInterval(this.lockInterval);
                    this.lockInterval = null;
                }
                
                console.log('🧹 Lock cleanup completed successfully');
                return; // Success - exit the retry loop
                
            } catch (error) {
                console.error(`❌ Lock release attempt ${attempt}/${retries} failed:`, {
                    tileId: tileId,
                    attempt: attempt,
                    error: error.message,
                    status: error.status,
                    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                });
                
                if (attempt === retries) {
                    // Final attempt failed
                    console.error(`❌ All ${retries} lock release attempts failed for tile ${tileId}`);
                    
                    // Show user-friendly error message
                    if (window.UIManager) {
                        window.UIManager.showToast(
                            'Warning: Tile lock may not have been released properly. Please refresh the page if you encounter issues.',
                            'warning'
                        );
                    }
                    
                    // Still clear local state to prevent further issues
                    this.currentLock = null;
                    if (this.lockInterval) {
                        clearInterval(this.lockInterval);
                        this.lockInterval = null;
                    }
                } else {
                    // Wait before retrying (exponential backoff)
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.log(`⏳ Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
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
        
        // Clean up neighbor canvas click handlers
        const neighborPositions = [
            'top', 'top-right', 'right', 'bottom-right',
            'bottom', 'bottom-left', 'left', 'top-left'
        ];
        
        neighborPositions.forEach(position => {
            const canvasId = `neighbor-${position}-canvas`;
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                this.removeNeighborCanvasClickHandler(canvas);
            }
        });
        
        // Clear neighbor tiles data
        this.neighborTiles = {};
    }

    /**
     * Check if the current user can edit the given tile.
     * This includes ownership and collaboration mode checks.
     */
    checkEditPermissions(tile) {
        const currentUser = window.CONFIG_UTILS ? window.CONFIG_UTILS.getUserData() : null;
        const isOwner = currentUser && tile.creator_id === currentUser.id;
        const isFreeMode = tile.canvas?.collaboration_mode === 'free';
        return isOwner || isFreeMode;
    }

    /**
     * FIXED: Unified touch event system for better mobile compatibility
     * This method handles both click and touch events in a unified way
     * to prevent conflicts and ensure consistent behavior across devices
     */
    setupUnifiedTouchEvents(element, handler, buttonType) {
        // State tracking for touch events
        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let touchEnded = false;
        
        // Prevent multiple rapid triggers
        let isProcessing = false;
        
        // Unified handler that prevents conflicts
        const unifiedHandler = async (event) => {
            // Prevent multiple rapid triggers
            if (isProcessing) {
                console.log(`🔄 ${buttonType} button: preventing rapid trigger`);
                return;
            }
            
            isProcessing = true;
            
            try {
                console.log(`🎯 ${buttonType} button: unified handler triggered`);
                await handler();
            } catch (error) {
                console.error(`❌ ${buttonType} button: handler error:`, error);
            } finally {
                // Reset processing flag after a short delay
                setTimeout(() => {
                    isProcessing = false;
                }, 100);
            }
        };
        
        // Mouse click events (for desktop)
        element.addEventListener('click', (e) => {
            // Only handle mouse clicks, not touch-triggered clicks
            if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) {
                console.log(`🖱️ ${buttonType} button: ignoring touch-triggered click`);
                return;
            }
            
            console.log(`🖱️ ${buttonType} button: mouse click detected`);
            unifiedHandler(e);
        });
        
        // Touch start event
        element.addEventListener('touchstart', (e) => {
            // Prevent default to avoid conflicts with click events
            e.preventDefault();
            
            const touch = e.touches[0];
            touchStartTime = Date.now();
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
            touchEnded = false;
            
            // Add visual feedback
            element.classList.add('touch-active');
            
            console.log(`📱 ${buttonType} button: touch started at (${touchStartX}, ${touchStartY})`);
        }, { passive: false });
        
        // Touch move event
        element.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartX);
                const deltaY = Math.abs(touch.clientY - touchStartY);
                
                // Mark as moved if significant movement detected
                if (deltaX > 10 || deltaY > 10) {
                    touchMoved = true;
                    console.log(`📱 ${buttonType} button: touch moved (${deltaX}, ${deltaY})`);
                }
            }
        }, { passive: true });
        
        // Touch end event
        element.addEventListener('touchend', (e) => {
            // Prevent default to avoid conflicts
            e.preventDefault();
            
            const touchDuration = Date.now() - touchStartTime;
            touchEnded = true;
            
            // Remove visual feedback
            element.classList.remove('touch-active');
            
            console.log(`📱 ${buttonType} button: touch ended, duration: ${touchDuration}ms, moved: ${touchMoved}`);
            
            // Only trigger if it's a valid tap (quick, minimal movement)
            if (touchDuration < 500 && !touchMoved) {
                console.log(`📱 ${buttonType} button: valid tap detected, triggering handler`);
                
                // Small delay for visual feedback
                setTimeout(() => {
                    unifiedHandler(e);
                }, 50);
            } else {
                console.log(`📱 ${buttonType} button: invalid tap (too long or moved), ignoring`);
            }
        }, { passive: false });
        
        // Touch cancel event
        element.addEventListener('touchcancel', (e) => {
            element.classList.remove('touch-active');
            touchEnded = true;
            console.log(`📱 ${buttonType} button: touch cancelled`);
        }, { passive: true });
        
        // Add CSS classes for better touch styling
        element.classList.add('touch-enabled');
        
        console.log(`✅ ${buttonType} button: unified touch events configured`);
    }

    /**
     * 🚨 CRITICAL FIX: Clear pixel editor state to prevent data bleeding
     * This method ensures that each tile starts with a clean slate
     */
    clearPixelEditorState() {
        console.log('🧹 Clearing pixel editor state to prevent data bleeding...');
        
        if (window.PixelEditor) {
            try {
                // Use the new reset method for complete state clearing
                if (typeof window.PixelEditor.reset === 'function') {
                    window.PixelEditor.reset();
                    console.log('✅ PixelEditor.reset() called successfully');
                } else {
                    // Fallback to manual clearing if reset method doesn't exist
                    console.warn('⚠️ PixelEditor.reset() not available, using manual clearing');
                    
                    // Clear the pixel data array
                    if (window.PixelEditor.pixelData) {
                        // Create a completely fresh empty pixel data array
                        const tileSize = window.PixelEditor.tileSize || 32;
                        const emptyData = [];
                        
                        for (let y = 0; y < tileSize; y++) {
                            const row = [];
                            for (let x = 0; x < tileSize; x++) {
                                row.push([0, 0, 0, 0]); // Transparent black
                            }
                            emptyData.push(row);
                        }
                        
                        // Replace the pixel data completely
                        window.PixelEditor.pixelData = emptyData;
                        console.log('✅ Pixel data array cleared and reset');
                    }
                    
                    // Clear any history/undo stacks
                    if (window.PixelEditor.history) {
                        window.PixelEditor.history = [];
                        window.PixelEditor.historyIndex = -1;
                        console.log('✅ History/undo stacks cleared');
                    }
                    
                    // Clear the canvas if it exists
                    if (window.PixelEditor.canvas && window.PixelEditor.ctx) {
                        window.PixelEditor.ctx.clearRect(0, 0, window.PixelEditor.canvas.width, window.PixelEditor.canvas.height);
                        console.log('✅ Canvas cleared');
                    }
                    
                    // Reset drawing state
                    if (window.PixelEditor.drawingState) {
                        window.PixelEditor.drawingState.isDrawing = false;
                        window.PixelEditor.drawingState.button = null;
                        window.PixelEditor.drawingState.lastX = 0;
                        window.PixelEditor.drawingState.lastY = 0;
                        console.log('✅ Drawing state reset');
                    }
                    
                    // Reset touch state
                    if (window.PixelEditor.touchState) {
                        window.PixelEditor.touchState.isTouching = false;
                        window.PixelEditor.touchState.lastTouchX = 0;
                        window.PixelEditor.touchState.lastTouchY = 0;
                        window.PixelEditor.touchState.touchStartTime = 0;
                        window.PixelEditor.touchState.hasMoved = false;
                        window.PixelEditor.touchState.pressure = 1.0;
                        window.PixelEditor.touchState.lastTapTime = 0;
                        window.PixelEditor.touchState.lastTapX = 0;
                        window.PixelEditor.touchState.lastTapY = 0;
                        console.log('✅ Touch state reset');
                    }
                    
                    console.log('✅ Pixel editor state manually cleared');
                }
                
            } catch (error) {
                console.error('❌ Error clearing pixel editor state:', error);
                // Don't throw - we want to continue even if cleanup fails
            }
        } else {
            console.warn('⚠️ PixelEditor not available for state clearing');
        }
        
        // Also clear our local state
        this.undoStack = [];
        this.redoStack = [];
        console.log('✅ Local undo/redo stacks cleared');
    }

    /**
     * Set up mobile-specific event listeners for lock cleanup
     */
    setupMobileLockCleanup() {
        // Release locks when page visibility changes (mobile browsers often pause/suspend)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.currentLock) {
                console.log('📱 Page became hidden with active lock, attempting cleanup...');
                // Don't await this to avoid blocking the visibility change
                this.releaseCurrentLock().catch(error => {
                    console.warn('⚠️ Failed to release lock on visibility change:', error);
                });
            }
        });

        // Release locks when page is about to unload (mobile navigation)
        window.addEventListener('beforeunload', () => {
            if (this.currentLock) {
                console.log('📱 Page unloading with active lock, attempting cleanup...');
                // Use navigator.sendBeacon for more reliable mobile cleanup
                if (navigator.sendBeacon && window.API && window.API.tiles) {
                    try {
                        const lockData = JSON.stringify({
                            action: 'release_lock',
                            tile_id: this.currentLock.tileId
                        });
                        navigator.sendBeacon('/api/v1/tile-locks/cleanup', lockData);
                        console.log('📱 Sent beacon for lock cleanup');
                    } catch (error) {
                        console.warn('⚠️ Failed to send cleanup beacon:', error);
                    }
                }
            }
        });

        // Handle mobile app state changes (iOS/Android)
        window.addEventListener('pagehide', () => {
            if (this.currentLock) {
                console.log('📱 Page hiding with active lock, attempting cleanup...');
                this.releaseCurrentLock().catch(error => {
                    console.warn('⚠️ Failed to release lock on page hide:', error);
                });
            }
        });

        console.log('📱 Mobile lock cleanup listeners configured');
    }
} 