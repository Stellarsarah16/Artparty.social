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
        console.log('🔧 Showing modal:', modalName);
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) {
            modal.style.display = 'flex';
            this.activeModals.add(modalName);
            document.body.classList.add('modal-open');
            
            // FIXED: Focus on first form field and reset form
            this.focusFirstField(modal);
            this.resetForm(modal);
            
            console.log('🔧 Modal displayed successfully');
        } else {
            console.error('❌ Modal not found:', `${modalName}-modal`);
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
     * FIXED: Focus on first form field in modal
     */
    focusFirstField(modal) {
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }

    /**
     * FIXED: Reset form in modal
     */
    resetForm(modal) {
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    /**
     * Show canvas settings modal
     */
    showCanvasSettingsModal(canvasId) {
        console.log('🔧 Showing canvas settings modal for canvas ID:', canvasId);
        
        // Create modal if it doesn't exist
        if (!document.getElementById('canvas-settings-modal')) {
            console.log('🔧 Creating canvas settings modal');
            this.createCanvasSettingsModal();
        }
        
        // Set canvas ID in modal dataset
        const modal = document.getElementById('canvas-settings-modal');
        if (modal) {
            modal.dataset.canvasId = canvasId;
            console.log('🔧 Modal found and canvas ID set');
        } else {
            console.error('❌ Canvas settings modal not found after creation');
            return;
        }
        
        // Show modal and load settings
        this.showModal('canvas-settings');
        console.log('🔧 Modal shown, loading settings...');
        
        // Add a small delay to ensure modal is fully rendered before populating
        setTimeout(() => {
            this.loadCanvasSettings(canvasId);
        }, 100);
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
                            <label for="settings-canvas-name">Canvas Name</label>
                            <input type="text" id="settings-canvas-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="settings-canvas-description">Description</label>
                            <textarea id="settings-canvas-description" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="settings-max-tiles-per-user">Max Tiles per User</label>
                            <input type="number" id="settings-max-tiles-per-user" name="max_tiles_per_user" min="1" max="100" value="10">
                        </div>
                        <div class="form-group">
                            <label for="settings-palette-type">Color Palette</label>
                            <select id="settings-palette-type" name="palette_type" required>
                                <option value="classic">Classic - Basic RGB colors</option>
                                <option value="earth">Earth - Van Gogh inspired earth tones</option>
                                <option value="pastel">Pastel - Monet inspired soft colors</option>
                                <option value="neon">Neon - 80s Synthwave electric colors</option>
                                <option value="monochrome">Monochrome - Ansel Adams grayscale</option>
                                <option value="retro">Retro - Wes Anderson vintage charm</option>
                                <option value="artistic">Artistic - Professional art palette</option>
                                <option value="sunset">Sunset - Turner inspired warm colors</option>
                                <option value="ocean">Ocean - Hokusai inspired sea colors</option>
                                <option value="forest">Forest - Rousseau inspired nature tones</option>
                                <option value="cyberpunk">Cyberpunk - Blade Runner futuristic</option>
                                <option value="vintage">Vintage - Edward Hopper Americana</option>
                                <option value="desert">Desert - Georgia O'Keeffe landscapes</option>
                                <option value="grapevine">Grapevine - Klimt jewel tones</option>
                                <option value="midnightSky">Midnight Sky - Rothko contemplative</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="settings-collaboration-mode">Collaboration Mode</label>
                            <select id="settings-collaboration-mode" name="collaboration_mode" required>
                                <option value="free">Free - Anyone can edit</option>
                                <option value="tile-lock">Tile Lock - Lock tiles while editing</option>
                                <option value="area-lock">Area Lock - Lock areas while editing</option>
                                <option value="review">Review - Requires approval</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="settings-is-public" name="is_public" checked>
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
        console.log('🔧 Modal appended to body');
        
        // Add form submit handler
        const form = modal.querySelector('#canvas-settings-form');
        if (form) {
            console.log('🔧 Form found in modal, adding submit handler');
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
        } else {
            console.error('❌ Form not found in modal');
        }
    }

    /**
     * Load canvas settings for editing
     */
    async loadCanvasSettings(canvasId) {
        try {
            console.log('🔧 Loading canvas settings for canvas ID:', canvasId);
            const canvas = await window.API.canvas.get(canvasId);
            console.log('🔧 Canvas data received:', canvas);
            
            // Check if form elements exist (using new unique IDs)
            const nameField = document.getElementById('settings-canvas-name');
            const descriptionField = document.getElementById('settings-canvas-description');
            const maxTilesField = document.getElementById('settings-max-tiles-per-user');
            const paletteField = document.getElementById('settings-palette-type');
            const collaborationField = document.getElementById('settings-collaboration-mode');
            const isPublicField = document.getElementById('settings-is-public');
            
            console.log('🔧 Form elements found:', {
                nameField: !!nameField,
                descriptionField: !!descriptionField,
                maxTilesField: !!maxTilesField,
                paletteField: !!paletteField,
                collaborationField: !!collaborationField,
                isPublicField: !!isPublicField
            });
            
            // Populate settings form
            if (nameField) nameField.value = canvas.name || '';
            if (descriptionField) descriptionField.value = canvas.description || '';
            if (maxTilesField) maxTilesField.value = canvas.max_tiles_per_user || 10;
            if (paletteField) paletteField.value = canvas.palette_type || 'classic';
            if (collaborationField) collaborationField.value = canvas.collaboration_mode || 'free';
            if (isPublicField) isPublicField.checked = canvas.is_public !== false;
            
            console.log('🔧 Form populated with values:', {
                name: canvas.name,
                description: canvas.description,
                max_tiles_per_user: canvas.max_tiles_per_user,
                palette_type: canvas.palette_type,
                collaboration_mode: canvas.collaboration_mode,
                is_public: canvas.is_public
            });
            
            // Verify values are actually set in the DOM
            setTimeout(() => {
                console.log('🔧 Verifying form values in DOM:', {
                    nameValue: nameField?.value,
                    descriptionValue: descriptionField?.value,
                    maxTilesValue: maxTilesField?.value,
                    paletteValue: paletteField?.value,
                    collaborationValue: collaborationField?.value,
                    isPublicValue: isPublicField?.checked
                });
                
                // Check if elements are visible
                console.log('🔧 Element visibility check:', {
                    nameVisible: nameField?.offsetParent !== null,
                    descriptionVisible: descriptionField?.offsetParent !== null,
                    maxTilesVisible: maxTilesField?.offsetParent !== null,
                    paletteVisible: paletteField?.offsetParent !== null,
                    collaborationVisible: collaborationField?.offsetParent !== null,
                    isPublicVisible: isPublicField?.offsetParent !== null
                });
                
                // Check computed styles
                if (nameField) {
                    const computedStyle = window.getComputedStyle(nameField);
                    console.log('🔧 Name field computed styles:', {
                        display: computedStyle.display,
                        visibility: computedStyle.visibility,
                        opacity: computedStyle.opacity,
                        color: computedStyle.color
                    });
                }
            }, 50);
            
        } catch (error) {
            console.error('❌ Failed to load canvas settings:', error);
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
                name: document.getElementById('settings-canvas-name').value,
                description: document.getElementById('settings-canvas-description').value,
                max_tiles_per_user: parseInt(document.getElementById('settings-max-tiles-per-user').value),
                palette_type: document.getElementById('settings-palette-type').value,
                collaboration_mode: document.getElementById('settings-collaboration-mode').value,
                is_public: document.getElementById('settings-is-public').checked
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
        // FIXED: Prevent modal from closing when clicking outside
        document.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            if (event.target.classList.contains('modal') && !event.target.closest('.modal-content')) {
                // Don't close modal when clicking outside - let user use close button
                event.stopPropagation();
            }
        });

        // Close modal when clicking close button
        document.addEventListener('click', (event) => {
            if (event.target.closest('.modal-close')) {
                const modal = event.target.closest('.modal');
                const modalName = this.getModalName(modal);
                if (modalName) {
                    this.hideModal(modalName);
                }
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideAllModals();
            }
        });

        // Handle close buttons for new modals
        document.getElementById('close-email-verification-modal')?.addEventListener('click', () => {
            this.hideModal('email-verification');
        });

        document.getElementById('close-password-reset-modal')?.addEventListener('click', () => {
            this.hideModal('password-reset');
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