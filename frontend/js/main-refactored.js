/**
 * Main Application Entry Point - Refactored with SOLID Principles
 * This file orchestrates the various modules and initializes the application
 */

// Import focused modules
import appState from './modules/app-state.js';
import authManager from './modules/auth.js';
import navigationManager, { showSection, hideLoading, hideModal } from './modules/navigation.js';
import uiUtils, { showToast } from './modules/ui-utils.js';

// Import existing modules (will be refactored next)
import './config.js';
import './form-validation.js';

/**
 * Application class that orchestrates all modules
 */
class StellarArtCollabApp {
    constructor() {
        this.initialized = false;
        this.modules = {
            appState,
            authManager,
            navigationManager,
            uiUtils
        };
        
        console.log('🚀 StellarArtCollabApp constructor called');
    }
    
    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) {
            console.warn('Application already initialized');
            return;
        }
        
        try {
            console.log('🚀 Initializing StellarArtCollab...');
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                console.log('⏳ Waiting for DOM to be ready...');
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            console.log('✅ DOM is ready');
            
            // Initialize core modules
            await this.initializeCore();
            
            // Setup authentication
            await this.initializeAuth();
            
            // Setup event listeners
            this.initializeEventListeners();
            
            // Initialize UI components
            this.initializeUI();
            
            // Hide loading screen
            hideLoading();
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            showToast('Failed to initialize application', 'error');
            hideLoading();
        }
    }
    
    /**
     * Initialize core application functionality
     */
    async initializeCore() {
        console.log('🔧 Initializing core modules...');
        
        // Initialize color palette
        this.initializeColorPalette();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✅ Core modules initialized');
    }
    
    /**
     * Initialize authentication and check current status
     */
    async initializeAuth() {
        console.log('🔧 Initializing authentication...');
        
        // Check if user is already authenticated
        if (CONFIG_UTILS.isAuthenticated()) {
            const userData = CONFIG_UTILS.getUserData();
            if (userData) {
                // User data exists in localStorage
                appState.setAuthenticated(userData);
                showSection('canvas');
                await this.loadCanvases();
            } else {
                // Token exists but no user data, verify with server
                const isValid = await authManager.verifyToken();
                if (isValid) {
                    showSection('canvas');
                    await this.loadCanvases();
                } else {
                    showSection('welcome');
                }
            }
        } else {
            showSection('welcome');
        }
        
        console.log('✅ Authentication initialized');
    }
    
    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Check if elements exist before adding listeners
        const createCanvasBtn = document.getElementById('create-canvas-btn');
        console.log('🔍 Create Canvas button found:', createCanvasBtn);
        
        // Navigation events
        document.getElementById('login-btn')?.addEventListener('click', () => {
            console.log('🔘 Login button clicked');
            navigationManager.showModal('login');
        });
        
        document.getElementById('register-btn')?.addEventListener('click', () => {
            console.log('🔘 Register button clicked');
            navigationManager.showModal('register');
        });
        
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            console.log('🔘 Logout button clicked');
            authManager.logout();
        });
        
        // Welcome section events
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            console.log('🔘 Get Started button clicked');
            this.handleGetStarted();
        });
        
        // Canvas section events
        createCanvasBtn?.addEventListener('click', () => {
            console.log('🔘 Create Canvas button clicked!');
            navigationManager.showModal('create-canvas');
        });
        
        document.getElementById('refresh-canvases-btn')?.addEventListener('click', () => {
            console.log('🔘 Refresh Canvases button clicked');
            this.loadCanvases();
        });
        
        document.getElementById('back-to-canvases-btn')?.addEventListener('click', () => {
            console.log('🔘 Back to Canvases button clicked');
            showSection('canvas');
        });
        
        document.getElementById('back-to-grid-btn')?.addEventListener('click', () => {
            console.log('🔘 Back to Grid View button clicked');
            const currentCanvas = appState.get('currentCanvas');
            if (currentCanvas) {
                // Refresh canvas data from server to show saved tiles
                this.refreshCurrentCanvas();
            }
        });
        
        // Form events
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            console.log('📝 Login form submitted');
            authManager.handleLogin(e);
        });
        
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            console.log('📝 Register form submitted');
            authManager.handleRegister(e);
        });
        
        document.getElementById('create-canvas-form')?.addEventListener('submit', (e) => {
            console.log('📝 Create Canvas form submitted');
            this.handleCreateCanvas(e);
        });
        
        // Save tile button
        document.getElementById('save-tile-btn')?.addEventListener('click', () => {
            console.log('💾 Save tile button clicked');
            this.handleSaveTile();
        });
        
        // Tool events (these will be moved to a ToolManager module later)
        document.getElementById('paint-tool')?.addEventListener('click', () => this.selectTool('paint'));
        document.getElementById('eraser-tool')?.addEventListener('click', () => this.selectTool('eraser'));
        document.getElementById('picker-tool')?.addEventListener('click', () => this.selectTool('picker'));
        
        // Window events
        window.addEventListener('popstate', navigationManager.handlePopState.bind(navigationManager));
        
        console.log('✅ Event listeners initialized');
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        console.log('🔧 Initializing UI components...');
        
        // Initialize form validation
        if (window.initializeFormValidation) {
            window.initializeFormValidation();
        }
        
        console.log('✅ UI components initialized');
    }
    
    /**
     * Initialize color palette
     */
    initializeColorPalette() {
        const colorPalette = document.getElementById('color-palette');
        if (!colorPalette) {
            console.log('⚠️ Color palette element not found');
            return;
        }
        
        colorPalette.innerHTML = '';
        
        const defaultColors = [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
            '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080'
        ];
        
        defaultColors.forEach(color => {
            const colorSquare = document.createElement('div');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = color;
            colorSquare.title = color;
            colorSquare.addEventListener('click', () => this.selectColor(color));
            colorPalette.appendChild(colorSquare);
        });
        
        // Set first color as active
        const firstColor = colorPalette.firstElementChild;
        if (firstColor) {
            firstColor.classList.add('active');
            appState.setCurrentColor(defaultColors[0]);
        }
        
        console.log('✅ Color palette initialized');
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (e.key) {
                case 'p':
                case 'P':
                    this.selectTool('paint');
                    break;
                case 'e':
                case 'E':
                    this.selectTool('eraser');
                    break;
                case 'i':
                case 'I':
                    this.selectTool('picker');
                    break;
                case 'Escape':
                    navigationManager.hideAllModals();
                    break;
            }
        });
    }
    
    /**
     * Handle get started button click
     */
    async handleGetStarted() {
        console.log('🔧 Handling get started...');
        
        if (appState.get('isAuthenticated')) {
            showSection('canvas');
            await this.loadCanvases();
        } else {
            navigationManager.showModal('register');
        }
    }
    
    /**
     * Load canvases and display them in the grid
     */
    async loadCanvases() {
        console.log('🔧 Loading canvases...');
        
        const canvasGrid = document.getElementById('canvas-grid');
        if (!canvasGrid) {
            console.error('❌ Canvas grid element not found');
            return;
        }
        
        try {
            // Show loading state
            canvasGrid.innerHTML = '<div class="loading">Loading canvases...</div>';
            
            // Get auth token
            const token = window.CONFIG_UTILS.getAuthToken();
            
            // Make API call
            const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/canvas/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
            
            if (response.ok) {
                const canvases = await response.json();
                console.log('✅ Canvases loaded:', canvases);
                
                // Display canvases
                this.displayCanvases(canvases);
                
            } else {
                console.error('❌ Failed to load canvases:', response.status);
                canvasGrid.innerHTML = '<div class="error">Failed to load canvases. Please try again.</div>';
                
                if (response.status === 401) {
                    showToast('Please log in to view canvases', 'error');
                } else {
                    showToast('Failed to load canvases', 'error');
                }
            }
            
        } catch (error) {
            console.error('❌ Canvas loading error:', error);
            canvasGrid.innerHTML = '<div class="error">Network error. Please check your connection.</div>';
            showToast('Network error loading canvases', 'error');
        }
    }
    
    /**
     * Display canvases in the grid
     */
    displayCanvases(canvases) {
        const canvasGrid = document.getElementById('canvas-grid');
        
        if (!canvases || canvases.length === 0) {
            canvasGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No canvases yet</h3>
                    <p>Create your first canvas to get started!</p>
                    <button class="btn btn-primary" id="empty-state-create-btn">
                        <i class="fas fa-plus"></i> Create Canvas
                    </button>
                </div>
            `;
            
            // Add event listener to the button
            const createBtn = document.getElementById('empty-state-create-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    navigationManager.showModal('create-canvas');
                });
            }
            
            return;
        }
        
        // Generate canvas cards
        const canvasCards = canvases.map(canvas => `
            <div class="canvas-card" data-canvas-id="${canvas.id}">
                <div class="canvas-card-header">
                    <h3 class="canvas-card-title">${this.escapeHtml(canvas.name)}</h3>
                    <div class="canvas-card-actions">
                        <button class="btn btn-sm btn-primary canvas-open-btn" data-canvas-id="${canvas.id}">
                            <i class="fas fa-paint-brush"></i> Open
                        </button>
                    </div>
                </div>
                ${canvas.description ? `<p class="canvas-card-description">${this.escapeHtml(canvas.description)}</p>` : ''}
                <div class="canvas-card-stats">
                    <div class="canvas-stat">
                        <i class="fas fa-expand-arrows-alt"></i>
                        <span>${canvas.width}x${canvas.height}</span>
                    </div>
                    <div class="canvas-stat">
                        <i class="fas fa-th"></i>
                        <span>Max ${canvas.max_tiles_per_user} tiles/user</span>
                    </div>
                    <div class="canvas-stat">
                        <i class="fas fa-calendar"></i>
                        <span>${this.formatDate(canvas.created_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        canvasGrid.innerHTML = canvasCards;
        
        // Add event listeners to open buttons
        const openButtons = document.querySelectorAll('.canvas-open-btn');
        openButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const canvasId = e.target.closest('.canvas-open-btn').dataset.canvasId;
                this.openCanvas(canvasId);
            });
        });
        
        console.log(`✅ Displayed ${canvases.length} canvases`);
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    /**
     * Handle create canvas form submission
     */
    async handleCreateCanvas(e) {
        e.preventDefault();
        console.log('🔧 Creating canvas...');
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);
        
        // Get form data
        const canvasData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            width: parseInt(formData.get('width')) || 1024,
            height: parseInt(formData.get('height')) || 1024,
            max_tiles_per_user: parseInt(formData.get('max_tiles_per_user')) || 10
        };
        
        // Validate required fields
        if (!canvasData.name || canvasData.name.trim().length === 0) {
            showToast('Canvas name is required', 'error');
            return;
        }
        
        try {
            // Set loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading-spinner"></span> Creating...';
            
            // Get auth token
            const token = window.CONFIG_UTILS.getAuthToken();
            if (!token) {
                showToast('Please log in to create a canvas', 'error');
                return;
            }
            
            // Make API call
            const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/canvas/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(canvasData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                showToast(`Canvas "${canvasData.name}" created successfully!`, 'success');
                navigationManager.hideModal('create-canvas');
                form.reset();
                
                // Refresh canvas list
                await this.loadCanvases();
                
                console.log('✅ Canvas created:', result);
            } else {
                // Handle API errors
                if (response.status === 422) {
                    // Validation errors
                    const errorMessage = result.detail?.[0]?.msg || result.detail || 'Validation error';
                    showToast(errorMessage, 'error');
                } else if (response.status === 401) {
                    showToast('Please log in to create a canvas', 'error');
                } else {
                    showToast(result.detail || 'Failed to create canvas', 'error');
                }
                console.error('❌ Canvas creation failed:', result);
            }
            
        } catch (error) {
            console.error('❌ Canvas creation error:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = 'Create Canvas';
        }
    }
    
    /**
     * Handle save tile functionality
     */
    async handleSaveTile() {
        console.log('💾 Saving tile...');
        
        const saveBtn = document.getElementById('save-tile-btn');
        if (!saveBtn) return;
        
        const currentTile = appState.get('currentTile');
        const pixelData = appState.get('currentPixelData');
        
        if (!currentTile || !pixelData) {
            showToast('No tile data to save', 'error');
            return;
        }
        
        try {
            // Set loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
            
            // Get auth token with debugging
            const token = window.CONFIG_UTILS.getAuthToken();
            console.log('🔑 Auth token exists:', !!token);
            console.log('🔑 Token length:', token ? token.length : 'N/A');
            
            if (!token) {
                console.error('❌ No auth token found');
                showToast('Please log in to save tile', 'error');
                // Try to redirect to login
                navigationManager.showModal('login');
                return;
            }
            
            // Check if user is still authenticated
            const userData = window.CONFIG_UTILS.getUserData();
            const isAuthenticated = window.CONFIG_UTILS.isAuthenticated();
            console.log('👤 User authenticated:', isAuthenticated);
            console.log('👤 User data exists:', !!userData);
            
            if (!isAuthenticated) {
                console.error('❌ User not authenticated');
                showToast('Session expired. Please log in again.', 'error');
                navigationManager.showModal('login');
                return;
            }
            
            // Convert flat pixel array to 2D array (32x32)
            const pixelData2D = [];
            for (let row = 0; row < 32; row++) {
                const rowData = [];
                for (let col = 0; col < 32; col++) {
                    const index = row * 32 + col;
                    rowData.push(pixelData[index] || '#ffffff');
                }
                pixelData2D.push(rowData);
            }
            
            // Prepare tile data
            const tileData = {
                canvas_id: currentTile.canvasId,
                x: currentTile.x,
                y: currentTile.y,
                pixel_data: JSON.stringify(pixelData2D)
            };
            
            console.log('📤 Sending tile data:', tileData);
            console.log('🌐 API URL:', `${window.API_CONFIG.BASE_URL}/api/v1/tiles/`);
            
            // Make API call with better error handling
            const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/tiles/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(tileData)
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('❌ Failed to parse response JSON:', jsonError);
                result = { detail: 'Invalid response from server' };
            }
            
            if (response.ok) {
                // Success
                showToast('Tile saved successfully!', 'success');
                console.log('✅ Tile saved:', result);
                
                // Update current canvas data to include the new tile
                const currentCanvas = appState.get('currentCanvas');
                if (currentCanvas) {
                    // Update or add the tile to the canvas data
                    if (!currentCanvas.tiles) {
                        currentCanvas.tiles = [];
                    }
                    
                    // Find existing tile or add new one
                    const existingTileIndex = currentCanvas.tiles.findIndex(
                        tile => tile.x === currentTile.x && tile.y === currentTile.y
                    );
                    
                    if (existingTileIndex >= 0) {
                        // Update existing tile
                        currentCanvas.tiles[existingTileIndex] = {
                            ...currentCanvas.tiles[existingTileIndex],
                            pixel_data: JSON.stringify(pixelData2D)
                        };
                    } else {
                        // Add new tile
                        currentCanvas.tiles.push({
                            x: currentTile.x,
                            y: currentTile.y,
                            pixel_data: JSON.stringify(pixelData2D),
                            id: result.tile?.id || Date.now()
                        });
                    }
                    
                    // Update app state
                    appState.set('currentCanvas', currentCanvas);
                }
                
            } else {
                // Handle API errors
                console.error('❌ API Error Response:', result);
                
                if (response.status === 422) {
                    // Validation errors
                    const errorMessage = result.detail?.[0]?.msg || result.detail || 'Validation error';
                    showToast(errorMessage, 'error');
                } else if (response.status === 401) {
                    // Authentication error
                    console.error('❌ Authentication failed - clearing token and redirecting to login');
                    showToast('Session expired. Please log in again.', 'error');
                    
                    // Clear authentication data
                    window.CONFIG_UTILS.removeAuthToken();
                    window.CONFIG_UTILS.removeUserData();
                    appState.setAuthenticated(false);
                    
                    // Redirect to login
                    navigationManager.showModal('login');
                } else {
                    showToast(result.detail || 'Failed to save tile', 'error');
                }
            }
            
        } catch (error) {
            console.error('❌ Tile save error:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Tile';
        }
    }
    
    /**
     * Select a tool (placeholder - will be moved to ToolManager)
     */
    selectTool(tool) {
        console.log(`🔧 Selected tool: ${tool}`);
        appState.setCurrentTool(tool);
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolBtn = document.getElementById(`${tool}-tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
    }
    
    /**
     * Select a color (placeholder - will be moved to ToolManager)
     */
    selectColor(color) {
        console.log(`🔧 Selected color: ${color}`);
        appState.setCurrentColor(color);
        
        // Update UI
        document.querySelectorAll('.color-square').forEach(square => {
            square.classList.remove('active');
        });
        
        const colorSquare = document.querySelector(`[style*="${color}"]`);
        if (colorSquare) {
            colorSquare.classList.add('active');
        }
    }
    
    /**
     * Get application state
     */
    getState() {
        return appState.getState();
    }
    
    /**
     * Get specific module
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    
    /**
     * Open a canvas for editing
     */
    async openCanvas(canvasId) {
        console.log(`🔧 Opening canvas ${canvasId}...`);
        
        try {
            // Get auth token
            const token = window.CONFIG_UTILS.getAuthToken();
            if (!token) {
                showToast('Please log in to open canvas', 'error');
                return;
            }
            
            // Fetch canvas details with tiles
            const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/canvas/${canvasId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load canvas: ${response.status}`);
            }
            
            const canvasData = await response.json();
            console.log('✅ Canvas loaded:', canvasData);
            
            // Store current canvas in app state
            appState.set('currentCanvas', canvasData);
            
            // Show editor section
            showSection('editor');
            
            // Setup canvas view
            this.setupCanvasView(canvasData);
            
        } catch (error) {
            console.error('❌ Failed to open canvas:', error);
            showToast('Failed to open canvas. Please try again.', 'error');
        }
    }
    
    /**
     * Refresh current canvas data from server and return to grid view
     */
    async refreshCurrentCanvas() {
        console.log('🔄 Refreshing current canvas...');
        
        const currentCanvas = appState.get('currentCanvas');
        if (!currentCanvas) return;
        
        try {
            // Get auth token
            const token = window.CONFIG_UTILS.getAuthToken();
            if (!token) {
                showToast('Please log in to refresh canvas', 'error');
                return;
            }
            
            // Fetch updated canvas data with tiles
            const response = await fetch(`${window.API_CONFIG.BASE_URL}/api/v1/canvas/${currentCanvas.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to refresh canvas: ${response.status}`);
            }
            
            const updatedCanvasData = await response.json();
            console.log('✅ Canvas refreshed:', updatedCanvasData);
            
            // Update app state with fresh data
            appState.set('currentCanvas', updatedCanvasData);
            
            // Switch to tile grid mode and redraw
            this.showTileGridMode();
            this.setupCanvasView(updatedCanvasData);
            
            showToast('Canvas refreshed!', 'success');
            
        } catch (error) {
            console.error('❌ Failed to refresh canvas:', error);
            showToast('Failed to refresh canvas. Please try again.', 'error');
            
            // Fallback to cached data
            this.showTileGridMode();
            this.setupCanvasView(currentCanvas);
        }
    }
    
    /**
     * Setup the canvas view with tile grid
     */
    setupCanvasView(canvasData) {
        // Update canvas info in header
        const canvasTitle = document.getElementById('canvas-title');
        const canvasDimensions = document.getElementById('canvas-dimensions');
        
        if (canvasTitle) {
            canvasTitle.textContent = canvasData.name;
        }
        
        if (canvasDimensions) {
            canvasDimensions.textContent = `${canvasData.width}x${canvasData.height}`;
        }
        
        // Calculate tile grid dimensions
        const tilesPerRow = Math.floor(canvasData.width / canvasData.tile_size);
        const tilesPerCol = Math.floor(canvasData.height / canvasData.tile_size);
        
        console.log(`Canvas: ${canvasData.width}x${canvasData.height}, Tile size: ${canvasData.tile_size}`);
        console.log(`Tile grid: ${tilesPerRow}x${tilesPerCol} tiles`);
        
        // Hide pixel editor tools initially and show tile grid
        this.showTileGridMode();
        
        // Show tile grid view
        this.showTileGridView(canvasData, tilesPerRow, tilesPerCol);
    }
    
    /**
     * Show tile grid mode - hide pixel editor tools, show tile grid
     */
    showTileGridMode() {
        const editorPanel = document.querySelector('.editor-panel');
        const sharedPanel = document.querySelector('.shared-panel');
        const backToCanvasesBtn = document.getElementById('back-to-canvases-btn');
        const backToGridBtn = document.getElementById('back-to-grid-btn');
        
        // Hide pixel editor tools
        if (editorPanel) {
            editorPanel.style.display = 'none';
        }
        
        // Show tile grid panel
        if (sharedPanel) {
            sharedPanel.style.display = 'block';
        }
        
        // Show back to canvases button, hide back to grid button
        if (backToCanvasesBtn) backToCanvasesBtn.style.display = 'inline-flex';
        if (backToGridBtn) backToGridBtn.style.display = 'none';
    }
    
    /**
     * Show pixel editor mode - hide tile grid, show pixel editor tools
     */
    showPixelEditorMode() {
        const editorPanel = document.querySelector('.editor-panel');
        const sharedPanel = document.querySelector('.shared-panel');
        const backToCanvasesBtn = document.getElementById('back-to-canvases-btn');
        const backToGridBtn = document.getElementById('back-to-grid-btn');
        
        // Show pixel editor tools
        if (editorPanel) {
            editorPanel.style.display = 'block';
        }
        
        // Hide tile grid panel
        if (sharedPanel) {
            sharedPanel.style.display = 'none';
        }
        
        // Hide back to canvases button, show back to grid button
        if (backToCanvasesBtn) backToCanvasesBtn.style.display = 'none';
        if (backToGridBtn) backToGridBtn.style.display = 'inline-flex';
    }
    
    /**
     * Show the tile grid view where users can select tiles
     */
    showTileGridView(canvasData, tilesPerRow, tilesPerCol) {
        console.log('🎨 Setting up tile grid view...');
        
        // Get canvas element and context
        const sharedCanvas = document.getElementById('shared-canvas');
        console.log('🖼️ Canvas element found:', !!sharedCanvas);
        
        if (!sharedCanvas) {
            console.error('❌ Canvas element not found!');
            return;
        }
        
        const ctx = sharedCanvas.getContext('2d');
        console.log('🖼️ Canvas context found:', !!ctx);
        
        if (!ctx) {
            console.error('❌ Canvas context not found!');
            return;
        }
        
        // Set canvas dimensions
        const canvasWidth = 800;
        const canvasHeight = 600;
        
        // Resize canvas to fit display
        sharedCanvas.width = canvasWidth;
        sharedCanvas.height = canvasHeight;
        
        // Make tiles much larger - 64x64 pixels each
        const tileDisplayWidth = 64;
        const tileDisplayHeight = 64;
        
        // Initialize or get current pan offset
        if (!this.panOffset) {
            this.panOffset = { x: 0, y: 0 };
        }
        
        // Add bounds checking to prevent panning off the grid
        const maxPanX = 0; // Don't pan beyond left edge
        const minPanX = canvasWidth - (tilesPerRow * tileDisplayWidth); // Don't pan beyond right edge
        const maxPanY = 0; // Don't pan beyond top edge
        const minPanY = canvasHeight - (tilesPerCol * tileDisplayHeight); // Don't pan beyond bottom edge
        
        // Clamp pan offset to bounds
        this.panOffset.x = Math.max(minPanX, Math.min(maxPanX, this.panOffset.x));
        this.panOffset.y = Math.max(minPanY, Math.min(maxPanY, this.panOffset.y));
        
        console.log('🖼️ Canvas dimensions:', sharedCanvas.width, 'x', sharedCanvas.height);
        console.log('🖼️ Canvas style display:', sharedCanvas.style.display);
        console.log('🖼️ Canvas computed style:', window.getComputedStyle(sharedCanvas).display);
        console.log('🖼️ Canvas visibility:', window.getComputedStyle(sharedCanvas).visibility);
        console.log('🖼️ Canvas parent element:', sharedCanvas.parentElement);
        
        console.log(`🔍 Canvas: ${canvasWidth}x${canvasHeight}, Tiles: ${tilesPerRow}x${tilesPerCol}`);
        console.log(`🔍 Tile display size: ${tileDisplayWidth}x${tileDisplayHeight} pixels`);
        console.log(`🔍 Pan offset: ${this.panOffset.x}, ${this.panOffset.y}`);
        
        // Clear canvas with light background FIRST, before any drawing
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        console.log('✅ Canvas cleared with background');
        
        // Create tile map for quick lookup
        const tileMap = new Map();
        if (canvasData.tiles) {
            console.log('🔍 Loading tiles from server:', canvasData.tiles.length);
            canvasData.tiles.forEach(tile => {
                const key = `${tile.x},${tile.y}`;
                tileMap.set(key, tile);
                console.log(`📍 Stored tile at key "${key}" with pixel_data:`, tile.pixel_data ? 'Present' : 'Missing');
            });
        }
        
        console.log('🗺️ Tile map created with keys:', Array.from(tileMap.keys()));
        
        // Set up tile border styling - subtle borders
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Calculate which tiles are visible
        const startCol = Math.max(0, Math.floor(-this.panOffset.x / tileDisplayWidth));
        const endCol = Math.min(tilesPerRow, Math.ceil((canvasWidth - this.panOffset.x) / tileDisplayWidth));
        const startRow = Math.max(0, Math.floor(-this.panOffset.y / tileDisplayHeight));
        const endRow = Math.min(tilesPerCol, Math.ceil((canvasHeight - this.panOffset.y) / tileDisplayHeight));
        
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const x = col * tileDisplayWidth + this.panOffset.x;
                const y = row * tileDisplayHeight + this.panOffset.y;
                
                // Skip tiles that are completely outside the canvas
                if (x + tileDisplayWidth < 0 || x > canvasWidth || 
                    y + tileDisplayHeight < 0 || y > canvasHeight) {
                    continue;
                }
                
                // Use tile coordinates (col, row) instead of pixel coordinates
                const tileKey = `${col},${row}`;
                
                // Check if tile exists
                const tile = tileMap.get(tileKey);
                
                // Debug logging for first few tiles
                if (row < 2 && col < 2) {
                    console.log(`🔍 Looking for tile at key "${tileKey}", found:`, tile ? 'YES' : 'NO');
                }
                
                // Fill background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, tileDisplayWidth, tileDisplayHeight);
                
                // Render pixel data if tile exists
                if (tile && tile.pixel_data) {
                    this.renderTilePixelData(ctx, tile, x, y, tileDisplayWidth, tileDisplayHeight);
                }
                
                // Draw subtle tile border
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, tileDisplayWidth, tileDisplayHeight);
                
                // Add tile coordinates label (very light)
                ctx.fillStyle = '#d1d5db';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${col},${row}`, x + tileDisplayWidth/2, y + tileDisplayHeight/2);
            }
        }
        
        // Add interaction handlers
        this.setupCanvasInteraction(sharedCanvas, canvasData, tilesPerRow, tilesPerCol, tileDisplayWidth, tileDisplayHeight);
        
        console.log('✅ Tile grid view setup complete with panning');
    }
    
    /**
     * Setup canvas interaction including panning and tile selection
     */
    setupCanvasInteraction(canvas, canvasData, tilesPerRow, tilesPerCol, tileDisplayWidth, tileDisplayHeight) {
        // Remove existing listeners by clearing them directly (don't replace the canvas)
        // Replacing the canvas would clear all the drawn content!
        const newCanvas = canvas;
        
        // Remove all existing event listeners by cloning and replacing
        // Actually, let's just reuse the same canvas to preserve drawn content
        
        let isPanning = false;
        let lastPanPoint = { x: 0, y: 0 };
        
        // Mouse down handler
        const handleMouseDown = (e) => {
            if (e.button === 1) { // Middle mouse button
                isPanning = true;
                lastPanPoint = { x: e.clientX, y: e.clientY };
                newCanvas.style.cursor = 'move';
                e.preventDefault();
            }
        };
        
        // Mouse move handler
        const handleMouseMove = (e) => {
            if (isPanning) {
                const deltaX = e.clientX - lastPanPoint.x;
                const deltaY = e.clientY - lastPanPoint.y;
                
                this.panOffset.x += deltaX;
                this.panOffset.y += deltaY;
                
                lastPanPoint = { x: e.clientX, y: e.clientY };
                
                // Redraw canvas with new pan offset
                this.showTileGridView(canvasData, tilesPerRow, tilesPerCol);
                e.preventDefault();
            }
        };
        
        // Mouse up handler
        const handleMouseUp = (e) => {
            if (e.button === 1) { // Middle mouse button
                isPanning = false;
                newCanvas.style.cursor = 'pointer';
            }
        };
        
        // Click handler for tile selection
        const handleClick = (e) => {
            if (e.button !== 0) return; // Only left click
            
            const rect = newCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left - this.panOffset.x;
            const y = e.clientY - rect.top - this.panOffset.y;
            
            // Calculate which tile was clicked
            const tileCol = Math.floor(x / tileDisplayWidth);
            const tileRow = Math.floor(y / tileDisplayHeight);
            
            if (tileCol >= 0 && tileCol < tilesPerRow && tileRow >= 0 && tileRow < tilesPerCol) {
                // Use tile coordinates (tileCol, tileRow) instead of pixel coordinates
                // API expects tile coordinates (0-31), not pixel coordinates (0-1023)
                console.log(`🎯 Clicked tile at grid (${tileCol}, ${tileRow})`);
                
                // Open tile editor with tile coordinates
                this.openTileEditor(canvasData, tileCol, tileRow, tileCol, tileRow);
            }
        };
        
        // Add event listeners
        newCanvas.addEventListener('mousedown', handleMouseDown);
        newCanvas.addEventListener('mousemove', handleMouseMove);
        newCanvas.addEventListener('mouseup', handleMouseUp);
        newCanvas.addEventListener('click', handleClick);
        newCanvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent right-click menu
        
        // Set default cursor
        newCanvas.style.cursor = 'pointer';
    }
    
    /**
     * Render pixel data for a single tile scaled down to fit in the display area
     */
    renderTilePixelData(ctx, tile, displayX, displayY, displayWidth, displayHeight) {
        if (!tile.pixel_data) return;
        
        console.log(`🎨 Rendering tile at (${displayX}, ${displayY}) with size ${displayWidth}x${displayHeight}`);
        console.log(`📊 Raw pixel_data:`, tile.pixel_data.substring(0, 100) + '...');
        
        try {
            // Parse pixel data (should be a 32x32 2D array)
            const pixelData = JSON.parse(tile.pixel_data);
            console.log(`📋 Parsed pixel data type:`, Array.isArray(pixelData) ? 'Array' : typeof pixelData);
            console.log(`📋 Pixel data length:`, pixelData.length);
            console.log(`📋 First element type:`, Array.isArray(pixelData[0]) ? 'Array (2D)' : typeof pixelData[0]);
            
            const tileSize = 32; // 32x32 pixels per tile
            
            // Calculate scaling factor
            const scaleX = displayWidth / tileSize;
            const scaleY = displayHeight / tileSize;
            
            let pixelsRendered = 0;
            
            // Handle both 2D array and flat array formats
            if (Array.isArray(pixelData) && Array.isArray(pixelData[0])) {
                // 2D array format (new format)
                console.log(`🔄 Using 2D array format`);
                for (let py = 0; py < tileSize && py < pixelData.length; py++) {
                    for (let px = 0; px < tileSize && px < pixelData[py].length; px++) {
                        const pixelColor = pixelData[py][px];
                        
                        if (pixelColor && pixelColor !== '#ffffff' && pixelColor !== 'transparent') {
                            // Only draw non-white/transparent pixels
                            ctx.fillStyle = pixelColor;
                            
                            const pixelX = displayX + px * scaleX;
                            const pixelY = displayY + py * scaleY;
                            
                            ctx.fillRect(pixelX, pixelY, Math.ceil(scaleX), Math.ceil(scaleY));
                            pixelsRendered++;
                        }
                    }
                }
            } else {
                // Flat array format (legacy format)
                console.log(`🔄 Using flat array format`);
                for (let py = 0; py < tileSize; py++) {
                    for (let px = 0; px < tileSize; px++) {
                        const pixelIndex = py * tileSize + px;
                        const pixelColor = pixelData[pixelIndex];
                        
                        if (pixelColor && pixelColor !== '#ffffff' && pixelColor !== 'transparent') {
                            // Only draw non-white/transparent pixels
                            ctx.fillStyle = pixelColor;
                            
                            const pixelX = displayX + px * scaleX;
                            const pixelY = displayY + py * scaleY;
                            
                            ctx.fillRect(pixelX, pixelY, Math.ceil(scaleX), Math.ceil(scaleY));
                            pixelsRendered++;
                        }
                    }
                }
            }
            
            console.log(`✅ Rendered ${pixelsRendered} non-white pixels for this tile`);
            
        } catch (error) {
            console.warn('Failed to render tile pixel data:', error);
        }
    }
    
    /**
     * Open tile editor for a specific tile
     */
    openTileEditor(canvasData, tileX, tileY, tileCol, tileRow) {
        console.log(`🎨 Opening tile editor for tile at (${tileX}, ${tileY})`);
        
        // Store current tile info
        appState.set('currentTile', {
            canvasId: canvasData.id,
            x: tileX,
            y: tileY,
            col: tileCol,
            row: tileRow
        });
        
        // Switch to pixel editor mode
        this.showPixelEditorMode();
        
        // Switch to pixel editor view
        this.showPixelEditorView(canvasData, tileX, tileY);
        
        showToast(`Editing tile at (${tileCol}, ${tileRow})`, 'info');
    }
    
    /**
     * Show the pixel editor view for a specific tile
     */
    showPixelEditorView(canvasData, tileX, tileY) {
        console.log(`🎨 Setting up pixel editor for tile at (${tileX}, ${tileY})`);
        
        const pixelCanvas = document.getElementById('pixel-canvas');
        if (!pixelCanvas) return;
        
        const gridSize = 32; // 32x32 pixel grid for the tile
        const cellSize = 512 / gridSize;
        
        // Initialize pixel data array
        let pixelData = new Array(gridSize * gridSize).fill('#ffffff');
        
        // Load existing pixel data if tile exists
        const currentTile = appState.get('currentTile');
        if (currentTile) {
            const tileMap = new Map();
            if (canvasData.tiles) {
                canvasData.tiles.forEach(tile => {
                    const key = `${tile.x},${tile.y}`;
                    tileMap.set(key, tile);
                });
            }
            
            const existingTile = tileMap.get(`${tileX},${tileY}`);
            if (existingTile && existingTile.pixel_data) {
                try {
                    const parsedData = JSON.parse(existingTile.pixel_data);
                    
                    // Handle both 2D array and flat array formats
                    if (Array.isArray(parsedData) && Array.isArray(parsedData[0])) {
                        // 2D array format (new format) - convert to flat array
                        pixelData = [];
                        for (let py = 0; py < 32; py++) {
                            for (let px = 0; px < 32; px++) {
                                if (parsedData[py] && parsedData[py][px]) {
                                    pixelData.push(parsedData[py][px]);
                                } else {
                                    pixelData.push('#ffffff');
                                }
                            }
                        }
                    } else {
                        // Flat array format (legacy format)
                        pixelData = parsedData;
                    }
                } catch (e) {
                    console.warn('Failed to parse existing pixel data:', e);
                }
            }
        }
        
        // Store pixel data in app state
        appState.set('currentPixelData', pixelData);
        
        // Drawing state
        let isDrawing = false;
        
        // Remove existing event listeners by replacing canvas
        pixelCanvas.replaceWith(pixelCanvas.cloneNode(true));
        
        // Get fresh references
        const canvas = document.getElementById('pixel-canvas');
        const ctx = canvas.getContext('2d');
        
        // Render function
        const renderPixelGrid = () => {
            // Clear canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            
            // Draw pixels
            for (let py = 0; py < gridSize; py++) {
                for (let px = 0; px < gridSize; px++) {
                    const pixelIndex = py * gridSize + px;
                    const pixelColor = pixelData[pixelIndex];
                    
                    if (pixelColor && pixelColor !== '#ffffff') {
                        ctx.fillStyle = pixelColor;
                        ctx.fillRect(px * cellSize, py * cellSize, cellSize, cellSize);
                    }
                }
            }
            
            // Draw grid lines
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            
            for (let i = 0; i <= gridSize; i++) {
                // Vertical lines
                ctx.beginPath();
                ctx.moveTo(i * cellSize, 0);
                ctx.lineTo(i * cellSize, 512);
                ctx.stroke();
                
                // Horizontal lines
                ctx.beginPath();
                ctx.moveTo(0, i * cellSize);
                ctx.lineTo(512, i * cellSize);
                ctx.stroke();
            }
        };
        
        // Get pixel coordinates
        const getPixelCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const pixelX = Math.floor(x / cellSize);
            const pixelY = Math.floor(y / cellSize);
            
            return { x: pixelX, y: pixelY };
        };
        
        // Paint pixel
        const paintPixel = (pixelX, pixelY) => {
            if (pixelX >= 0 && pixelX < gridSize && pixelY >= 0 && pixelY < gridSize) {
                const pixelIndex = pixelY * gridSize + pixelX;
                const currentTool = appState.get('currentTool') || 'paint';
                const currentColor = appState.get('currentColor') || '#000000';
                
                if (currentTool === 'paint') {
                    pixelData[pixelIndex] = currentColor;
                } else if (currentTool === 'eraser') {
                    pixelData[pixelIndex] = '#ffffff';
                } else if (currentTool === 'picker') {
                    const pickedColor = pixelData[pixelIndex];
                    if (pickedColor && pickedColor !== '#ffffff') {
                        appState.setCurrentColor(pickedColor);
                        this.updateColorPalette(pickedColor);
                    }
                    return; // Don't re-render for picker
                }
                
                // Update app state
                appState.set('currentPixelData', pixelData);
                
                // Re-render
                renderPixelGrid();
                
                // Enable save button
                const saveBtn = document.getElementById('save-tile-btn');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            }
        };
        
        // Event handlers
        const handleMouseDown = (e) => {
            isDrawing = true;
            const coords = getPixelCoords(e);
            paintPixel(coords.x, coords.y);
        };
        
        const handleMouseMove = (e) => {
            if (!isDrawing) return;
            const coords = getPixelCoords(e);
            paintPixel(coords.x, coords.y);
        };
        
        const handleMouseUp = () => {
            isDrawing = false;
        };
        
        // Add event listeners
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        
        // Set cursor style
        canvas.style.cursor = 'crosshair';
        
        // Initial render
        renderPixelGrid();
        
        console.log('✅ Pixel editor view setup complete with painting functionality');
    }
    
    /**
     * Update color palette to show selected color
     */
    updateColorPalette(color) {
        document.querySelectorAll('.color-square').forEach(square => {
            square.classList.remove('active');
            if (square.style.backgroundColor === color) {
                square.classList.add('active');
            }
        });
    }
}

// Create application instance
const app = new StellarArtCollabApp();

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM content loaded, initializing app...');
        app.init();
    });
} else {
    console.log('📄 DOM already ready, initializing app...');
    app.init();
}

// Export for global access
window.StellarArtCollab = app;

// Export for module usage
export default app; 

// Add debug function to check authentication state
window.debugAuth = function() {
    console.log('=== Authentication Debug ===');
    
    // Check stored authentication data
    const token = localStorage.getItem('stellarcollab_token');
    const userData = localStorage.getItem('stellarcollab_user');
    
    console.log('Stored token:', token ? 'Present' : 'Missing');
    console.log('Stored user data:', userData ? 'Present' : 'Missing');
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            console.log('User data:', user);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Check app state
    console.log('App state authenticated:', appState.get('isAuthenticated'));
    console.log('App state user:', appState.get('currentUser'));
    
    // Check navigation elements
    const navigationElements = {
        loginBtn: document.getElementById('login-btn'),
        registerBtn: document.getElementById('register-btn'),
        userInfo: document.getElementById('user-info'),
        username: document.getElementById('username'),
        logoutBtn: document.getElementById('logout-btn'),
        profileBtn: document.getElementById('profile-btn')
    };
    
    console.log('Navigation elements found:');
    Object.entries(navigationElements).forEach(([key, element]) => {
        console.log(`  ${key}:`, element ? 'Found' : 'Missing');
        if (element) {
            const styles = window.getComputedStyle(element);
            console.log(`    Display: ${styles.display}`);
            console.log(`    Visibility: ${styles.visibility}`);
            console.log(`    Hidden class: ${element.classList.contains('hidden')}`);
        }
    });
    
    // Force navigation update
    console.log('\nForcing navigation update...');
    navigationManager.updateNavigation();
    
    console.log('=== Debug Complete ===');
};

// Call debug function on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        console.log('Page loaded, checking authentication...');
        window.debugAuth();
    }, 1000);
}); 