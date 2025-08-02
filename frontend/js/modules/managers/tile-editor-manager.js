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
        // Update tile info
        this.updateTileInfo(tile);
        
        // Initialize pixel editor
        if (window.pixelEditor) {
            window.pixelEditor.initialize(tile.pixel_data, tile.palette_type);
        }
        
        // Setup save button
        this.setupSaveButton(tile);
    }

    /**
     * Update tile information display
     */
    updateTileInfo(tile) {
        const tileInfo = document.getElementById('editor-tile-info');
        if (tileInfo) {
            tileInfo.innerHTML = `
                <div class="tile-info-item">
                    <strong>Position:</strong> (${tile.x}, ${tile.y})
                </div>
                <div class="tile-info-item">
                    <strong>Creator:</strong> ${tile.creator_username || 'Unknown'}
                </div>
                <div class="tile-info-item">
                    <strong>Created:</strong> ${new Date(tile.created_at).toLocaleDateString()}
                </div>
                <div class="tile-info-item">
                    <strong>Likes:</strong> ${tile.likes_count || 0}
                </div>
            `;
        }
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
        const tools = ['pencil', 'eraser', 'fill', 'eyedropper'];
        
        tools.forEach(tool => {
            const btn = document.getElementById(`${tool}-tool-btn`);
            if (btn) {
                btn.onclick = () => {
                    this.selectTool(tool);
                };
            }
        });
    }

    /**
     * Select a tool
     */
    selectTool(tool) {
        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${tool}-tool-btn`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Set tool in pixel editor
        if (window.pixelEditor) {
            window.pixelEditor.setTool(tool);
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