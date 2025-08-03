/**
 * Canvas List Manager
 * Handles canvas list display, user tile counts, and canvas card interactions
 */

import appState from '../app-state.js';

export class CanvasListManager {
    constructor(canvasApi, tileApi, eventManager) {
        console.log('🔧 CanvasListManager constructor called with:', {
            canvasApi: canvasApi,
            canvasApiType: typeof canvasApi,
            canvasApiMethods: canvasApi ? Object.getOwnPropertyNames(Object.getPrototypeOf(canvasApi)) : 'null',
            tileApi: tileApi,
            eventManager: eventManager
        });
        
        this.canvasApi = canvasApi;
        this.tileApi = tileApi;
        this.eventManager = eventManager;
        this.canvasListContainer = document.getElementById('canvas-grid');
        
        console.log('🔧 CanvasListManager initialized with canvasApi methods:', 
            this.canvasApi ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.canvasApi)) : 'null');
    }

    /**
     * Load and display all canvases
     */
    async loadCanvases() {
        try {
            console.log('🔄 Loading canvases...');
            console.log('🔧 this.canvasApi:', this.canvasApi);
            console.log('🔧 this.canvasApi.list:', this.canvasApi?.list);
            console.log('🔧 typeof this.canvasApi.list:', typeof this.canvasApi?.list);
            
            if (!this.canvasApi || typeof this.canvasApi.list !== 'function') {
                throw new Error(`CanvasAPI not properly initialized. canvasApi: ${this.canvasApi}, list: ${this.canvasApi?.list}`);
            }
            
            const canvases = await this.canvasApi.list();
            this.renderCanvasList(canvases);
            console.log(`✅ Loaded ${canvases.length} canvases`);
        } catch (error) {
            console.error('❌ Failed to load canvases:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to load canvases', 'error');
            }
        }
    }

    /**
     * Render canvas list with cards
     */
    renderCanvasList(canvases) {
        if (!this.canvasListContainer) {
            console.error('Canvas list container not found');
            return;
        }

        this.canvasListContainer.innerHTML = '';
        
        if (canvases.length === 0) {
            this.canvasListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-palette"></i>
                    <h3>No canvases yet</h3>
                    <p>Create your first canvas to get started!</p>
                    <button class="btn btn-primary" onclick="navigationManager.showModal('create-canvas')">
                        Create Canvas
                    </button>
                </div>
            `;
            return;
        }

        canvases.forEach(canvas => {
            const cardElement = this.createCanvasCard(canvas);
            this.canvasListContainer.appendChild(cardElement);
        });
    }

    /**
     * Create a canvas card element
     */
    createCanvasCard(canvas) {
        const currentUser = appState.get('currentUser');
        const isOwner = currentUser && canvas.creator_id === currentUser.id;
        
        const card = document.createElement('div');
        card.className = 'canvas-card';
        card.innerHTML = `
            <div class="canvas-card-header">
                <h3>${canvas.name}</h3>
                ${isOwner ? '<button class="canvas-settings-btn" title="Edit Canvas Settings"><i class="fas fa-cog"></i></button>' : ''}
            </div>
            <div class="canvas-card-body">
                <div class="canvas-info">
                    <div class="info-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${canvas.width} × ${canvas.height}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${canvas.user_count || 0} users</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-th"></i>
                        <span>${canvas.total_tiles || 0} tiles</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-palette"></i>
                        <span>${canvas.palette_type || 'classic'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user-lock"></i>
                        <span>Max ${canvas.max_tiles_per_user || 10} tiles/user</span>
                    </div>
                </div>
                <div class="user-tiles-info">
                    <span class="user-tiles-count">Loading...</span>
                </div>
            </div>
            <div class="canvas-card-footer">
                <button class="btn btn-primary open-canvas-btn" data-canvas='${JSON.stringify(canvas)}'>
                    Open Canvas
                </button>
            </div>
        `;

        // Add settings button event listener
        const settingsBtn = card.querySelector('.canvas-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showCanvasSettingsModal(canvas.id);
            });
        }

        // Add open canvas button event listener
        const openBtn = card.querySelector('.open-canvas-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const canvasData = JSON.parse(openBtn.dataset.canvas);
                if (window.canvasViewerManager) {
                    window.canvasViewerManager.openCanvas(canvasData);
                }
            });
        }

        // Load user tile count for this canvas
        this.loadUserTileCountForCanvas(canvas.id, card);

        return card;
    }

    /**
     * Load user's tile count for a specific canvas
     */
    async loadUserTileCountForCanvas(canvasId, cardElement) {
        try {
            const currentUser = appState.get('currentUser');
            if (!currentUser || !currentUser.id) {
                return;
            }

            const tileCount = await this.tileApi.getUserTileCount(currentUser.id, canvasId);
            const tileCountElement = cardElement.querySelector('.user-tiles-count');
            if (tileCountElement) {
                tileCountElement.textContent = `${tileCount.tile_count} your tiles`;
            }
        } catch (error) {
            console.warn('Failed to load user tile count for canvas:', canvasId, error);
            const tileCountElement = cardElement.querySelector('.user-tiles-count');
            if (tileCountElement) {
                tileCountElement.textContent = '0 your tiles';
            }
        }
    }

    /**
     * Show canvas settings modal
     */
    showCanvasSettingsModal(canvasId) {
        if (window.modalManager) {
            window.modalManager.showCanvasSettingsModal(canvasId);
        }
    }
} 