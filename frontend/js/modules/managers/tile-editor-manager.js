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
        
        // Initialize pixel editor
        if (window.pixelEditor) {
            console.log('✅ Pixel editor available, initializing...');
            window.pixelEditor.initialize(tile.pixel_data, tile.palette_type);
        } else {
            console.warn('⚠️ Pixel editor not available');
        }
        
        // Setup save button
        this.setupSaveButton(tile);
        
        // Setup tool buttons
        this.setupToolButtons();
        
        // Setup undo/redo buttons
        this.setupUndoRedoButtons();
        
        console.log('✅ Tile editor initialization complete');
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
            saveBtn.onclick = async () => {
                await this.saveTile(tile.id);
            };
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
            if (!window.pixelEditor) {
                throw new Error('Pixel editor not available');
            }
            
            const pixelData = window.pixelEditor.getPixelData();
            
            await this.apiService.update(tileId, {
                pixel_data: pixelData
            });
            
            if (window.UIManager) {
                window.UIManager.showToast('Tile saved successfully!', 'success');
            }
            
            // Clear undo/redo stacks after save
            this.undoStack = [];
            this.redoStack = [];
            this.updateUndoRedoButtons();
            
        } catch (error) {
            console.error('Failed to save tile:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to save tile', 'error');
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
        if (window.pixelEditor) {
            window.pixelEditor.setTool(tool);
            console.log(`✅ Tool set in pixel editor: ${tool}`);
        } else {
            console.warn('⚠️ Pixel editor not available');
        }
    }

    /**
     * Setup undo/redo buttons
     */
    setupUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
            undoBtn.onclick = () => this.undo();
        }
        
        if (redoBtn) {
            redoBtn.onclick = () => this.redo();
        }
        
        this.updateUndoRedoButtons();
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length > 0 && window.pixelEditor) {
            const currentState = window.pixelEditor.getPixelData();
            this.redoStack.push(currentState);
            
            const previousState = this.undoStack.pop();
            window.pixelEditor.setPixelData(previousState);
            
            this.updateUndoRedoButtons();
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length > 0 && window.pixelEditor) {
            const currentState = window.pixelEditor.getPixelData();
            this.undoStack.push(currentState);
            
            const nextState = this.redoStack.pop();
            window.pixelEditor.setPixelData(nextState);
            
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
} 