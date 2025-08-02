/**
 * Modal Manager
 * Handles all modal operations and form submissions
 */

export class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.setupModalHandlers();
    }

    /**
     * Show a modal by name
     */
    showModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) {
            modal.style.display = 'flex';
            this.activeModals.add(modalName);
            document.body.classList.add('modal-open');
        }
    }

    /**
     * Hide a modal by name
     */
    hideModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) {
            modal.style.display = 'none';
            this.activeModals.delete(modalName);
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        this.activeModals.forEach(modalName => {
            this.hideModal(modalName);
        });
        this.activeModals.clear();
    }

    /**
     * Show canvas settings modal
     */
    showCanvasSettingsModal(canvasId) {
        // Create modal if it doesn't exist
        if (!document.getElementById('canvas-settings-modal')) {
            this.createCanvasSettingsModal();
        }
        
        // Set canvas ID in modal dataset
        const modal = document.getElementById('canvas-settings-modal');
        modal.dataset.canvasId = canvasId;
        
        // Show modal and load settings
        this.showModal('canvas-settings');
        this.loadCanvasSettings(canvasId);
    }

    /**
     * Create canvas settings modal
     */
    createCanvasSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'canvas-settings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Canvas Settings</h3>
                    <button class="modal-close" onclick="modalManager.hideModal('canvas-settings')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="canvas-settings-form">
                        <div class="form-group">
                            <label for="canvas-name">Canvas Name</label>
                            <input type="text" id="canvas-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="canvas-description">Description</label>
                            <textarea id="canvas-description" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="max-tiles-per-user">Max Tiles per User</label>
                            <input type="number" id="max-tiles-per-user" name="max_tiles_per_user" min="1" max="100" value="10">
                        </div>
                        <div class="form-group">
                            <label for="palette-type">Color Palette</label>
                            <select id="palette-type" name="palette_type" required>
                                <option value="classic">Classic - Basic 8-color pixel art</option>
                                <option value="earth">Earth Tones - Natural browns and tans</option>
                                <option value="pastel">Pastel - Soft, light colors</option>
                                <option value="monochrome">Monochrome - Grayscale variations</option>
                                <option value="neon">Neon - Bright, vibrant colors</option>
                                <option value="retro">Retro Gaming - Classic game boy style</option>
                                <option value="artistic">Artistic - Burnt umber, paynes grey, ochres</option>
                                <option value="sunset">Sunset - Warm oranges, pinks, and purples</option>
                                <option value="ocean">Ocean - Blues, teals, and sea greens</option>
                                <option value="forest">Forest - Greens, browns, and natural tones</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="collaboration-mode">Collaboration Mode</label>
                            <select id="collaboration-mode" name="collaboration_mode" required>
                                <option value="free">Free - Anyone can edit</option>
                                <option value="tile-lock">Tile Lock - Lock tiles while editing</option>
                                <option value="area-lock">Area Lock - Lock areas while editing</option>
                                <option value="review">Review - Requires approval</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="is-public" name="is_public" checked>
                                Make this canvas public
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="modalManager.hideModal('canvas-settings')">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                Save Settings
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add form submit handler
        const form = modal.querySelector('#canvas-settings-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const canvasId = modal.dataset.canvasId;
            if (canvasId) {
                await this.saveCanvasSettings(canvasId);
                this.hideModal('canvas-settings');
                // Refresh canvas list
                if (window.canvasListManager) {
                    window.canvasListManager.loadCanvases();
                }
            }
        });
    }

    /**
     * Load canvas settings for editing
     */
    async loadCanvasSettings(canvasId) {
        try {
            const canvas = await window.API.canvas.get(canvasId);
            
            // Populate settings form
            document.getElementById('canvas-name').value = canvas.name;
            document.getElementById('canvas-description').value = canvas.description || '';
            document.getElementById('max-tiles-per-user').value = canvas.max_tiles_per_user;
            document.getElementById('palette-type').value = canvas.palette_type;
            document.getElementById('collaboration-mode').value = canvas.collaboration_mode;
            document.getElementById('is-public').checked = canvas.is_public;
            
        } catch (error) {
            console.error('Failed to load canvas settings:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to load canvas settings', 'error');
            }
        }
    }

    /**
     * Save canvas settings
     */
    async saveCanvasSettings(canvasId) {
        try {
            const settings = {
                name: document.getElementById('canvas-name').value,
                description: document.getElementById('canvas-description').value,
                max_tiles_per_user: parseInt(document.getElementById('max-tiles-per-user').value),
                palette_type: document.getElementById('palette-type').value,
                collaboration_mode: document.getElementById('collaboration-mode').value,
                is_public: document.getElementById('is-public').checked
            };
            
            await window.API.canvas.update(canvasId, settings);
            
            if (window.UIManager) {
                window.UIManager.showToast('Canvas settings updated successfully', 'success');
            }
            
        } catch (error) {
            console.error('Failed to save canvas settings:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to save canvas settings', 'error');
            }
        }
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modalName = this.getModalName(e.target);
                if (modalName) {
                    this.hideModal(modalName);
                }
            }
        });

        // Close modals with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    /**
     * Get modal name from element
     */
    getModalName(modalElement) {
        const id = modalElement.id;
        if (id && id.endsWith('-modal')) {
            return id.replace('-modal', '');
        }
        return null;
    }
} 