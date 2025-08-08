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
    }

    /**
     * Open tile editor
     */
    async openTileEditor(tile) {
        try {
            console.log('🔄 Opening tile editor for tile:', tile.id);
            
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
            
            // First, try to acquire a lock for this tile
            try {
                if (window.API && window.API.tiles) {
                    const lockResult = await window.API.tiles.acquireTileLock(fullTileData.id);
                    this.currentLock = {
                        tileId: fullTileData.id,
                        lockId: lockResult.lock_id,
                        expiresAt: new Date(lockResult.expires_at)
                    };
                    console.log('🔒 Acquired tile lock:', this.currentLock);
                    
                    // Start lock extension interval (extend every 25 minutes)
                    this.startLockExtension();
                }
            } catch (error) {
                if (error.status === 403) {
                    // Permission denied - user cannot edit this tile
                    const errorMessage = 'You can only edit your own tiles in this canvas mode. This tile was created by another user.';
                    if (window.UIManager) {
                        window.UIManager.showToast(errorMessage, 'error');
                    }
                    console.warn('🔒 Permission denied: Cannot edit tile created by another user');
                    return;
                } else if (error.status === 409) {
                    // Tile is locked by another user
                    if (window.UIManager) {
                        window.UIManager.showToast('This tile is currently being edited by another user', 'error');
                    }
                    return;
                } else if (error.status === 404) {
                    // Tile not found
                    if (window.UIManager) {
                        window.UIManager.showToast('Tile not found. It may have been deleted.', 'error');
                    }
                    return;
                } else {
                    console.warn('⚠️ Could not acquire tile lock:', error);
                    // Continue without lock for now, but warn the user
                    if (window.UIManager) {
                        window.UIManager.showToast('Warning: Could not acquire tile lock. Changes may not be saved.', 'warning');
                    }
                }
            }
            
            // Get canvas data to access palette type
            let canvasData = null;
            try {
                if (window.API && window.API.canvas) {
                    canvasData = await window.API.canvas.get(fullTileData.canvas_id);
                    console.log('🎨 Fetched canvas data:', canvasData);
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch canvas data:', error);
            }
            
            // Add canvas data to tile object
            fullTileData.canvas = canvasData;
            
            this.currentTile = fullTileData;
            
            // FIXED: Update canvas name in editor header
            this.updateCanvasName(canvasData);
            
            this.initializeTileEditor(fullTileData);
            this.setupToolButtons();
            this.setupUndoRedoButtons();
            
            // Set default tool to paint and activate the paint button
            this.selectTool('paint');
            
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
            const canvasName = tile.canvas_name || 'Unknown';
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
        // Setup original header save button
        const saveBtn = document.getElementById('save-tile-btn');
        // Setup new floating save button
        const floatingSaveBtn = document.getElementById('floating-save-btn');
        
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
                newBtn.addEventListener('click', async () => {
                    console.log(`💾 ${type} save button clicked for tile:`, tile.id);
                    await this.saveTile(tile.id);
                });
                
                // Enable the save button
                newBtn.disabled = false;
                if (type === 'floating') {
                    newBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                } else {
                    newBtn.innerHTML = '<i class="fas fa-save"></i> Save Tile';
                }
                newBtn.style.backgroundColor = '#4CAF50';
                newBtn.title = 'Save your changes to this tile';
                
                console.log(`✅ ${type} save button enabled for editable tile`);
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
            
            const pixelData = window.PixelEditor.getPixelData();
            console.log('💾 Raw pixel data to save:', pixelData);
            
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
        const backBtn = document.getElementById('back-to-grid-btn');
        const floatingBackBtn = document.getElementById('floating-back-btn');
        
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
            element.onclick = backHandler;
            console.log(`✅ ${type} back button setup complete`);
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
} 