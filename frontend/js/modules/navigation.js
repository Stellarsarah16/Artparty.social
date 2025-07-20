/**
 * Navigation Module
 * Handles section navigation and modal management
 */

import appState from './app-state.js';
import { eventManager } from '../utils/events.js';
import canvasService from '../services/canvas.js';

class NavigationManager {
    constructor() {
        console.log('🔧 Initializing NavigationManager...');
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.setupFormHandlers();
        console.log('✅ NavigationManager initialized');
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        console.log('🔧 Initializing DOM elements...');
        const elements = {
            // Navigation
            navbar: document.getElementById('navbar'),
            loginBtn: document.getElementById('login-btn'),
            registerBtn: document.getElementById('register-btn'),
            userInfo: document.getElementById('user-info'),
            username: document.getElementById('username'),
            profileBtn: document.getElementById('profile-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            
            // Sections
            welcomeSection: document.getElementById('welcome-section'),
            canvasSection: document.getElementById('canvas-section'),
            viewerSection: document.getElementById('viewer-section'),
            editorSection: document.getElementById('editor-section'),
            gallerySection: document.getElementById('gallery-section'),
            
            // Modals
            loginModal: document.getElementById('login-modal'),
            registerModal: document.getElementById('register-modal'),
            createCanvasModal: document.getElementById('create-canvas-modal'),
            
            // Modal controls
            closeLoginModal: document.getElementById('close-login-modal'),
            closeRegisterModal: document.getElementById('close-register-modal'),
            closeCreateCanvasModal: document.getElementById('close-create-canvas-modal')
        };
        
        console.log('📋 DOM elements found:', Object.keys(elements).filter(key => elements[key] !== null));
        console.log('❌ DOM elements missing:', Object.keys(elements).filter(key => elements[key] === null));
        
        return elements;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Login and Register button click events
        this.elements.loginBtn?.addEventListener('click', () => {
            console.log('Login button clicked');
            this.showModal('login');
        });
        
        this.elements.registerBtn?.addEventListener('click', () => {
            console.log('Register button clicked');
            this.showModal('register');
        });
        
        // Get Started button click event
        const getStartedBtn = document.getElementById('get-started-btn');
        getStartedBtn?.addEventListener('click', () => {
            console.log('Get Started button clicked');
            this.showModal('register');
        });
        
        // Create Canvas button click event
        const createCanvasBtn = document.getElementById('create-canvas-btn');
        createCanvasBtn?.addEventListener('click', () => {
            console.log('Create Canvas button clicked');
            this.showModal('create-canvas');
        });
        
        // Refresh Canvases button click event
        const refreshCanvasesBtn = document.getElementById('refresh-canvases-btn');
        refreshCanvasesBtn?.addEventListener('click', () => {
            console.log('Refresh Canvases button clicked');
            this.loadCanvases();
        });
        
        // Back to Canvases button click event
        const backToCanvasesBtn = document.getElementById('back-to-canvases-btn');
        backToCanvasesBtn?.addEventListener('click', () => {
            console.log('Back to Canvases button clicked');
            this.showSection('canvas');
        });
        
        // Back to Grid View button click event (from editor to viewer)
        const backToGridBtn = document.getElementById('back-to-grid-btn');
        backToGridBtn?.addEventListener('click', () => {
            console.log('Back to Grid View button clicked');
            this.showSection('viewer');
            // Refresh canvas viewer to ensure tiles are up to date
            this.refreshCanvasViewer();
        });
        
        // Viewer Back to Canvases button click event
        const viewerBackToCanvasesBtn = document.getElementById('viewer-back-to-canvases-btn');
        viewerBackToCanvasesBtn?.addEventListener('click', () => {
            console.log('Viewer Back to Canvases button clicked');
            this.showSection('canvas');
        });
        
        // Viewer controls
        const viewerRefreshBtn = document.getElementById('viewer-refresh-btn');
        viewerRefreshBtn?.addEventListener('click', () => {
            console.log('Viewer refresh button clicked');
            this.refreshCanvas();
        });
        
        const viewerZoomFitBtn = document.getElementById('viewer-zoom-fit-btn');
        viewerZoomFitBtn?.addEventListener('click', () => {
            console.log('Viewer zoom fit button clicked');
            this.fitCanvasToScreen();
        });
        
        const viewerZoomInBtn = document.getElementById('viewer-zoom-in-btn');
        viewerZoomInBtn?.addEventListener('click', () => {
            if (window.CanvasViewer) {
                window.CanvasViewer.zoomIn();
            }
        });
        
        const viewerZoomOutBtn = document.getElementById('viewer-zoom-out-btn');
        viewerZoomOutBtn?.addEventListener('click', () => {
            if (window.CanvasViewer) {
                window.CanvasViewer.zoomOut();
            }
        });
        
        const toggleGridBtn = document.getElementById('toggle-grid-btn');
        toggleGridBtn?.addEventListener('click', () => {
            if (window.CanvasViewer) {
                window.CanvasViewer.toggleGrid();
            }
        });
        
        const toggleUserIndicatorsBtn = document.getElementById('toggle-user-indicators-btn');
        toggleUserIndicatorsBtn?.addEventListener('click', () => {
            if (window.CanvasViewer) {
                window.CanvasViewer.toggleUserIndicators();
            }
        });
        
        // Logout button click event
        this.elements.logoutBtn?.addEventListener('click', async () => {
            console.log('Logout button clicked');
            await this.handleLogout();
        });
        
        // Modal close events
        this.elements.closeLoginModal?.addEventListener('click', () => this.hideModal('login'));
        this.elements.closeRegisterModal?.addEventListener('click', () => this.hideModal('register'));
        this.elements.closeCreateCanvasModal?.addEventListener('click', () => this.hideModal('create-canvas'));
        
        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(this.getModalName(e.target));
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        // Subscribe to authentication state changes
        appState.subscribe('isAuthenticated', (isAuthenticated) => {
            this.updateNavigation();
        });
        
        appState.subscribe('currentUser', (user) => {
            this.updateUserInfo(user);
        });
        
        // Listen for canvas events
        eventManager.on('canvases:loaded', (canvases) => {
            this.renderCanvasList(canvases);
        });
        
        // Listen for canvas selection events
        eventManager.on('canvas:selected', (canvas) => {
            this.openCanvas(canvas);
        });
        
        // Listen for tile editor events
        eventManager.on('tile:opened', (tile) => {
            this.initializeTileEditor(tile);
        });
        
        console.log('✅ Event listeners set up');
    }

    /**
     * Setup form submission handlers
     */
    setupFormHandlers() {
        console.log('🔧 Setting up form handlers...');
        
        // Login form submission
        const loginForm = document.getElementById('login-form');
        loginForm?.addEventListener('submit', this.handleLoginSubmit.bind(this));
        
        // Register form submission
        const registerForm = document.getElementById('register-form');
        registerForm?.addEventListener('submit', this.handleRegisterSubmit.bind(this));
        
        // Create Canvas form submission
        const createCanvasForm = document.getElementById('create-canvas-form');
        createCanvasForm?.addEventListener('submit', this.handleCreateCanvasSubmit.bind(this));
        
        console.log('✅ Form handlers set up');
    }

    /**
     * Handle login form submission
     */
    async handleLoginSubmit(event) {
        event.preventDefault();
        console.log('Login form submitted');
        
        const form = event.target;
        const formData = new FormData(form);
        
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };
        
        console.log('Login credentials:', { username: credentials.username, password: '[HIDDEN]' });
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        try {
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
            
            // Make API call
            const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('Login successful:', data);
                
                // Store authentication data
                window.CONFIG_UTILS.setAuthToken(data.access_token);
                window.CONFIG_UTILS.setUserData(data.user);
                
                // Update app state
                appState.setAuthenticated(data.user);
                
                // Update navigation
                this.updateNavigation();
                this.updateUserInfo(data.user);
                
                // Hide modal and show canvas
                this.hideModal('login');
                this.showSection('canvas');
                
                // Reset form
                form.reset();
                
                console.log('✅ Login completed successfully');
                
            } else {
                console.error('Login failed:', data);
                // Show error message
                this.showLoginError(data.detail || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginError('Network error. Please try again.');
        } finally {
            // Restore button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle register form submission
     */
    async handleRegisterSubmit(event) {
        event.preventDefault();
        console.log('Register form submitted');
        
        const form = event.target;
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            password: formData.get('password'),
            confirm_password: formData.get('confirm_password')
        };
        
        console.log('Register data:', { ...userData, password: '[HIDDEN]', confirm_password: '[HIDDEN]' });
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        try {
            // Basic validation
            if (userData.password !== userData.confirm_password) {
                this.showRegisterError('Passwords do not match');
            } else {
                submitButton.textContent = 'Creating account...';
                submitButton.disabled = true;
                
                // Make API call
                const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.REGISTER), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    console.log('Registration successful:', data);
                    
                    // Store authentication data
                    window.CONFIG_UTILS.setAuthToken(data.access_token);
                    window.CONFIG_UTILS.setUserData(data.user);
                    
                    // Update app state
                    appState.setAuthenticated(data.user);
                    
                    // Update navigation
                    this.updateNavigation();
                    this.updateUserInfo(data.user);
                    
                    // Hide modal and show canvas
                    this.hideModal('register');
                    this.showSection('canvas');
                    
                    // Reset form
                    form.reset();
                    
                    console.log('✅ Registration completed successfully');
                    
                } else {
                    console.error('Registration failed:', data);
                    // Show error message
                    this.showRegisterError(data.detail || 'Registration failed');
                }
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegisterError('Network error. Please try again.');
        } finally {
            // Restore button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle create canvas form submission
     */
    async handleCreateCanvasSubmit(event) {
        event.preventDefault();
        console.log('Create Canvas form submitted');
        
        const form = event.target;
        const formData = new FormData(form);
        
        const canvasData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            width: parseInt(formData.get('width')),
            height: parseInt(formData.get('height')),
            palette_type: formData.get('palette_type'),
            max_tiles_per_user: parseInt(formData.get('max_tiles_per_user')),
            is_public: formData.get('is_public') === 'on'
        };
        
        console.log('Canvas data:', canvasData);
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        try {
            submitButton.textContent = 'Creating canvas...';
            submitButton.disabled = true;
            
            // Use canvas service instead of direct API call
            const result = await canvasService.createCanvas(canvasData);
            
            if (result.success) {
                console.log('Canvas created successfully:', result.canvas);
                
                // Hide modal
                this.hideModal('create-canvas');
                
                // Reset form
                form.reset();
                
                // Success message and event emission is handled by canvasService
                console.log('✅ Canvas creation completed successfully');
                
            } else {
                console.error('Canvas creation failed:', result.error);
                this.showCreateCanvasError(result.error?.detail || result.error?.message || 'Failed to create canvas');
            }
            
        } catch (error) {
            console.error('Canvas creation error:', error);
            this.showCreateCanvasError('Network error. Please try again.');
        } finally {
            // Restore button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Show login error message
     */
    showLoginError(message) {
        console.error('Login error:', message);
        // You can implement a proper error display here
        alert(`Login Error: ${message}`);
    }

    /**
     * Show register error message
     */
    showRegisterError(message) {
        console.error('Register error:', message);
        // You can implement a proper error display here
        alert(`Registration Error: ${message}`);
    }

    /**
     * Show create canvas success message
     */
    showCreateCanvasSuccess(message) {
        console.log('Canvas creation success:', message);
        // You can implement a proper success display here
        alert(`Success: ${message}`);
    }

    /**
     * Show create canvas error message
     */
    showCreateCanvasError(message) {
        console.error('Canvas creation error:', message);
        // You can implement a proper error display here
        alert(`Canvas Creation Error: ${message}`);
    }
    
    /**
     * Show a section and hide others
     */
    showSection(sectionName) {
        console.log(`Showing section: ${sectionName}`);
        
        // Hide all sections by adding hidden class
        Object.values(this.elements).forEach(element => {
            if (element && element.id && element.id.endsWith('-section')) {
                element.classList.add('hidden');
            }
        });
        
        // Show requested section by removing hidden class
        const section = this.elements[`${sectionName}Section`];
        if (section) {
            section.classList.remove('hidden');
            appState.setCurrentSection(sectionName);
            
            // Load canvases when showing canvas section
            if (sectionName === 'canvas') {
                this.loadCanvases();
            }
            
            // Update URL without triggering page reload
            history.pushState({ section: sectionName }, '', `#${sectionName}`);
            console.log(`Section shown: ${sectionName}`);
        } else {
            console.warn(`Section not found: ${sectionName}`);
        }
    }
    
    /**
     * Load canvases from server
     */
    async loadCanvases() {
        try {
            console.log('Loading canvases...');
            
            // Debug: Check if required globals are available
            console.log('CONFIG_UTILS available:', typeof CONFIG_UTILS !== 'undefined');
            console.log('API_CONFIG available:', typeof API_CONFIG !== 'undefined');
            
            // Initialize canvas service if not already initialized
            if (!canvasService.initialized) {
                canvasService.init();
            }
            
            const canvases = await canvasService.getCanvases();
            appState.setCanvasList(canvases);
            
            // Emit event for other listeners
            eventManager.emit('canvases:loaded', canvases);
        } catch (error) {
            console.error('Failed to load canvases:', error);
            console.error('Error details:', error.message, error.stack);
            
            // Show more specific error message
            const errorMessage = error.message || 'Failed to load canvases. Please try again.';
            this.showCanvasError(errorMessage);
        }
    }
    
    /**
     * Render canvas list to the UI
     */
    renderCanvasList(canvases) {
        console.log('Rendering canvas list:', canvases);
        
        const canvasGrid = document.getElementById('canvas-grid');
        if (!canvasGrid) {
            console.warn('Canvas grid element not found');
            return;
        }
        
        // Clear existing content
        canvasGrid.innerHTML = '';
        
        // Show loading state initially
        if (canvases.length === 0) {
            canvasGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No canvases found</h3>
                    <p>Create your first canvas to get started!</p>
                </div>
            `;
            return;
        }
        
        // Render canvas cards
        canvases.forEach(canvas => {
            const canvasCard = this.createCanvasCard(canvas);
            canvasGrid.appendChild(canvasCard);
        });
        
        console.log(`✅ Rendered ${canvases.length} canvas cards`);
    }
    
    /**
     * Create a canvas card element
     */
    createCanvasCard(canvas) {
        const card = document.createElement('div');
        card.className = 'canvas-card';
        card.style.cursor = 'pointer';
        card.title = `Click to open ${canvas.name}`;
        
        card.innerHTML = `
            <div class="canvas-card-header">
                <h3 class="canvas-card-title">${canvas.name}</h3>
                <p class="canvas-card-description">${canvas.description || 'No description'}</p>
            </div>
            <div class="canvas-card-stats">
                <div class="canvas-stat">
                    <i class="fas fa-expand-arrows-alt"></i>
                    <span>${canvas.width}×${canvas.height}</span>
                </div>
                <div class="canvas-stat">
                    <i class="fas fa-users"></i>
                    <span>${canvas.user_count || 0} users</span>
                </div>
                <div class="canvas-stat">
                    <i class="fas fa-palette"></i>
                    <span>${canvas.tile_count || 0} tiles</span>
                </div>
                <div class="canvas-stat">
                    <i class="fas fa-palette"></i>
                    <span>${canvas.palette_type || 'classic'} palette</span>
                </div>
            </div>
        `;
        
        // Add visual feedback on hover
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '';
        });
        
        // Add click event to open canvas
        card.addEventListener('click', () => {
            console.log('Canvas selected:', canvas);
            
            // Add visual feedback for click
            card.style.transform = 'translateY(0)';
            setTimeout(() => {
                eventManager.emit('canvas:selected', canvas);
            }, 150);
        });
        
        return card;
    }
    
    /**
     * Open a canvas for viewing
     */
    async openCanvas(canvas) {
        try {
            console.log('🎨 Opening canvas:', canvas.name || canvas.title || 'Untitled');
            
            // Set current canvas in app state
            if (window.appState) {
                window.appState.setCurrentCanvas(canvas);
                console.log('✅ Current canvas set:', canvas.id);
            }
            
            // Clear pixel data BEFORE loading new canvas
            if (window.PixelEditor) {
                window.PixelEditor.clearPixelData();
            }
            
            // Load canvas data
            console.log('Loading canvas data for ID:', canvas.id);
            const canvasData = await canvasService.getCanvasData(canvas.id);
            console.log('Canvas data received:', canvasData);
            
            // Initialize canvas viewer with data
            await this.initializeCanvasViewer(canvas, canvasData);
            
            // Show viewer section
            this.showSection('viewer');
            
        } catch (error) {
            console.error('❌ Failed to open canvas:', error);
            console.error('Error details:', error.message, error.stack);
            this.showCanvasError('Failed to open canvas: ' + error.message);
        }
    }
    
    /**
     * Initialize canvas viewer
     */
    async initializeCanvasViewer(canvas, canvasData) {
        try {
            console.log('Initializing canvas viewer...');
            
            // Get canvas elements
            const canvasElement = document.getElementById('canvas-viewer');
            
            if (!canvasElement) {
                throw new Error('Canvas viewer element not found');
            }
            
            // Initialize canvas viewer
            if (window.CanvasViewer) {
                window.CanvasViewer.init(canvasElement);
                window.CanvasViewer.setCanvasData(canvasData);
                
                if (window.ENVIRONMENT && window.ENVIRONMENT.isDevelopment) {
                    console.log('🔧 Setting up canvas viewer callbacks');
                    console.log('🔧 Canvas data:', canvasData);
                }
                
                // Set up tile click handler to open editor
                window.CanvasViewer.onTileClick = (tile) => {
                    console.log('🎯 Navigation: Tile clicked, opening editor for tile:', tile);
                    this.openTileEditor(tile);
                };
                
                // Set up tile hover handler
                window.CanvasViewer.onTileHover = (tile) => {
                    this.updateTileInfo(tile);
                };
                
                // Set up viewport change handler
                window.CanvasViewer.onViewportChange = (x, y, zoom) => {
                    this.updateViewportInfo(x, y, zoom);
                };
                
                // Load tiles if available
                if (canvasData.tiles && canvasData.tiles.length > 0) {
                    console.log('📦 Loading tiles into canvas viewer:', canvasData.tiles.length);
                    window.CanvasViewer.loadTiles(canvasData.tiles);
                } else {
                    console.log('⚠️ No tiles available to load');
                }
                
                console.log('✅ Canvas viewer initialized');
                console.log('🔧 onTileClick callback set:', !!window.CanvasViewer.onTileClick);
            } else {
                throw new Error('Canvas viewer not available');
            }
            
        } catch (error) {
            console.error('Failed to initialize canvas viewer:', error);
            throw error;
        }
    }
    
    /**
     * Open tile editor for a specific tile
     */
    async openTileEditor(tile) {
        try {
            console.log('🚀 Opening tile editor for tile:', tile);
            console.log('🚀 Tile data structure:', {
                id: tile.id,
                x: tile.x,
                y: tile.y,
                isEmpty: tile.isEmpty,
                isNew: tile.isNew,
                hasPixelData: !!tile.pixel_data,
                pixelDataType: typeof tile.pixel_data,
                pixelDataLength: tile.pixel_data ? (typeof tile.pixel_data === 'string' ? tile.pixel_data.length : Array.isArray(tile.pixel_data) ? tile.pixel_data.length : 'unknown') : 'none'
            });
            
            // Handle empty tile (create new tile)
            if (tile.isEmpty) {
                console.log('🚀 Creating new tile at position:', tile.x, tile.y);
                tile = {
                    x: tile.x,
                    y: tile.y,
                    pixel_data: this.createEmptyPixelData(),
                    isNew: true
                };
                
                // For empty tiles, fetch neighbors by position
                try {
                    const canvas = appState.get('currentCanvas');
                    if (canvas) {
                        console.log('🔍 Fetching neighbors for empty tile position:', tile.x, tile.y);
                        const neighbors = await window.API.tiles.getAdjacentNeighborsByPosition(canvas.id, tile.x, tile.y);
                        console.log('🔍 Neighbors for empty tile:', neighbors);
                        tile.adjacentNeighbors = neighbors || [];
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to fetch neighbors for empty tile:', error);
                    tile.adjacentNeighbors = [];
                }
            }
            
            // For existing tiles, ensure we have complete tile data and fetch neighbors
            if (!tile.isEmpty && !tile.isNew && tile.id) {
                console.log('🔍 Fetching complete tile data and neighbors from API...');
                try {
                    // Fetch both tile data and adjacent neighbors in parallel
                    const [completeTile, neighbors] = await Promise.all([
                        window.API.tiles.get(tile.id),
                        window.API.tiles.getAdjacentNeighbors(tile.id)
                    ]);
                    
                    console.log('🔍 API Response - Tile:', completeTile);
                    console.log('🔍 API Response - Neighbors:', neighbors);
                    console.log('🔍 Current tile position:', { x: completeTile.x, y: completeTile.y });
                    console.log('🔍 Expected neighbor positions:');
                    console.log('  Top: (', completeTile.x, ',', completeTile.y - 1, ')');
                    console.log('  Left: (', completeTile.x - 1, ',', completeTile.y, ')');
                    console.log('  Right: (', completeTile.x + 1, ',', completeTile.y, ')');
                    console.log('  Bottom: (', completeTile.x, ',', completeTile.y + 1, ')');
                    console.log('🔍 Actual neighbors returned:', neighbors.length);
                    if (neighbors.length > 0) {
                        neighbors.forEach((neighbor, index) => {
                            console.log(`  Neighbor ${index}: (${neighbor.x}, ${neighbor.y}) - ID: ${neighbor.id}`);
                        });
                    }
                    
                    if (completeTile && completeTile.pixel_data) {
                        tile = completeTile;
                        console.log('🔍 Fetched complete tile data:', tile);
                        console.log('🔍 Pixel data type:', typeof tile.pixel_data);
                        console.log('🔍 Pixel data length:', tile.pixel_data ? tile.pixel_data.length : 'null');
                        
                        // Store neighbors for reference in the editor
                        tile.adjacentNeighbors = neighbors || [];
                        console.log('🔍 Adjacent neighbors:', tile.adjacentNeighbors);
                    } else {
                        console.warn('🔍 No pixel data in API response:', completeTile);
                    }
                } catch (error) {
                    console.error('🔍 Failed to fetch tile data or neighbors:', error);
                    console.error('🔍 Error details:', error.message, error.status, error.data);
                }
            }
            
            // Set current tile in app state
            appState.setCurrentTile(tile);
            
            // Update neighbor display (if available) - don't block on this
            try {
                const neighborDisplayInstance = window.neighborDisplay;
                if (neighborDisplayInstance && typeof neighborDisplayInstance.updateDisplay === 'function') {
                    // Ensure we have valid neighbor data
                    let neighborData = [];
                    if (tile.adjacentNeighbors && Array.isArray(tile.adjacentNeighbors)) {
                        neighborData = tile.adjacentNeighbors;
                    } else if (tile.adjacentNeighbors) {
                        console.warn('⚠️ Adjacent neighbors is not an array:', tile.adjacentNeighbors);
                        neighborData = [];
                    }
                    
                    console.log('🔍 Passing neighbors to display:', {
                        neighborCount: neighborData.length,
                        neighborData: neighborData,
                        currentTile: { x: tile.x, y: tile.y }
                    });
                    
                    // Debug: Log each neighbor's coordinates
                    if (neighborData.length > 0) {
                        console.log('🔍 Neighbor details:');
                        neighborData.forEach((neighbor, index) => {
                            console.log(`  Neighbor ${index}:`, {
                                id: neighbor.id,
                                x: neighbor.x,
                                y: neighbor.y,
                                dx: neighbor.x - tile.x,
                                dy: neighbor.y - tile.y,
                                position: this.getNeighborPosition(tile.x, tile.y, neighbor.x, neighbor.y)
                            });
                        });
                    } else {
                        console.log('🔍 No neighbors found - checking expected positions:');
                        console.log('  Expected top: (3, 4)');
                        console.log('  Expected left: (2, 5)');
                        console.log('  Expected right: (4, 5)');
                        console.log('  Expected bottom: (3, 6)');
                    }
                    
                    neighborDisplayInstance.updateDisplay(tile, neighborData);
                } else {
                    console.log('⚠️ Neighbor display not available, skipping neighbor update');
                }
            } catch (error) {
                console.warn('⚠️ Error updating neighbor display:', error);
                // Don't let neighbor display errors block the editor
            }
            
            // Show editor section
            this.showSection('editor');
            
            // Initialize neighbor display after editor section is shown
            setTimeout(() => {
                const neighborDisplayInstance = window.neighborDisplay;
                if (neighborDisplayInstance) {
                    // Force re-initialization to ensure DOM elements are available
                    if (typeof neighborDisplayInstance.forceReinit === 'function') {
                        neighborDisplayInstance.forceReinit();
                    }
                    
                    // Wait a bit more for the re-initialization to complete
                    setTimeout(() => {
                        if (typeof neighborDisplayInstance.updateDisplay === 'function') {
                            // Ensure we have valid neighbor data
                            let neighborData = [];
                            if (tile.adjacentNeighbors && Array.isArray(tile.adjacentNeighbors)) {
                                neighborData = tile.adjacentNeighbors;
                            } else if (tile.adjacentNeighbors) {
                                console.warn('⚠️ Adjacent neighbors is not an array:', tile.adjacentNeighbors);
                                neighborData = [];
                            }
                            
                            console.log('🔍 Re-initializing neighbor display with:', {
                                neighborCount: neighborData.length,
                                neighborData: neighborData
                            });
                            
                            neighborDisplayInstance.updateDisplay(tile, neighborData);
                        }
                    }, 200); // Additional delay for re-initialization
                }
            }, 100); // Small delay to ensure DOM is ready
            
            // Update editor with tile data
            const canvasTitle = document.getElementById('canvas-title');
            if (canvasTitle) {
                const canvas = appState.get('currentCanvas');
                canvasTitle.textContent = canvas ? canvas.name : 'Canvas';
            }
            
            const tileCoords = document.getElementById('current-tile-coords');
            if (tileCoords) {
                const statusText = tile.isNew ? 'New Tile' : 'Tile';
                tileCoords.textContent = `${statusText}: (${tile.x}, ${tile.y})`;
            }
            
            // Update tile info fields in editor header
            this.updateEditorTileInfo(tile);
            
            // Initialize color palette with canvas palette
            if (window.UIManager) {
                window.UIManager.initColorPalette();
            }
            
            // Emit tile opened event
            eventManager.emit('tile:opened', tile);
            
            console.log('✅ Tile editor opened successfully');
            
        } catch (error) {
            console.error('❌ Failed to open tile editor:', error);
            this.showCanvasError(`Failed to open tile editor: ${error.message}`);
        }
    }

    /**
     * Get neighbor position relative to current tile
     * @param {number} tileX - Current tile X coordinate
     * @param {number} tileY - Current tile Y coordinate
     * @param {number} neighborX - Neighbor X coordinate
     * @param {number} neighborY - Neighbor Y coordinate
     * @returns {string} Position (top, left, right, bottom, or unknown)
     */
    getNeighborPosition(tileX, tileY, neighborX, neighborY) {
        const dx = neighborX - tileX;
        const dy = neighborY - tileY;
        
        if (dx === 0 && dy === -1) return 'top';
        if (dx === -1 && dy === 0) return 'left';
        if (dx === 1 && dy === 0) return 'right';
        if (dx === 0 && dy === 1) return 'bottom';
        return 'unknown';
    }
    
    /**
     * Create empty pixel data for a new tile
     */
    createEmptyPixelData() {
        const pixelData = [];
        for (let y = 0; y < 32; y++) {
            pixelData[y] = [];
            for (let x = 0; x < 32; x++) {
                pixelData[y][x] = 'white';
            }
        }
        return JSON.stringify(pixelData);
    }
    
    /**
     * Connect to WebSocket for real-time updates
     */
    async connectWebSocket(canvasId) {
        try {
            console.log('🔗 Attempting to connect to WebSocket for canvas:', canvasId);
            
            if (!window.WebSocketClient) {
                console.warn('WebSocket client not available - skipping real-time updates');
                return;
            }
            
            // Set up WebSocket event handlers
            window.WebSocketClient.on('canvas_state', (message) => {
                console.log('📊 Canvas state received:', message);
                this.updateUserCountFromWebSocket(message.user_count, message.active_users);
            });
            
            window.WebSocketClient.on('user_joined', (message) => {
                console.log('👋 User joined:', message);
                this.updateUserCountFromWebSocket(message.user_count);
            });
            
            window.WebSocketClient.on('user_left', (message) => {
                console.log('👋 User left:', message);
                this.updateUserCountFromWebSocket(message.user_count);
            });
            
            // Connect to WebSocket with timeout
            const connectPromise = window.WebSocketClient.connect(canvasId);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
            });
            
            await Promise.race([connectPromise, timeoutPromise]);
            console.log('✅ WebSocket connected successfully');
            
        } catch (error) {
            console.warn('WebSocket connection failed:', error.message);
            // Show user that they won't get real-time updates
            this.showWebSocketError();
            throw error; // Re-throw so the catch in openCanvas can handle it
        }
    }
    
    /**
     * Show WebSocket connection error to user
     */
    showWebSocketError() {
        const statusElement = document.getElementById('viewer-canvas-users');
        if (statusElement) {
            statusElement.textContent = 'Real-time updates unavailable';
            statusElement.style.color = '#f59e0b';
            statusElement.title = 'WebSocket connection failed - user count may not be up to date';
        }
    }
    
    /**
     * Set initial user count (fallback when WebSocket is not available)
     */
    setInitialUserCount() {
        // If WebSocket is not connected, show at least current user
        setTimeout(() => {
            const statusElement = document.getElementById('viewer-canvas-users');
            if (statusElement && statusElement.textContent === '0 users online') {
                statusElement.textContent = '1 user online';
                statusElement.title = 'You are currently viewing this canvas';
            }
        }, 1000); // Give WebSocket a chance to connect first
    }
    
    /**
     * Update user count from WebSocket messages
     */
    updateUserCountFromWebSocket(userCount, activeUsers = null) {
        try {
            // Update canvas header user count
            const canvasUsers = document.getElementById('viewer-canvas-users');
            if (canvasUsers) {
                canvasUsers.textContent = `${userCount} users online`;
            }
            
            // Update sidebar active users count
            const activeUsersElement = document.getElementById('viewer-active-users');
            if (activeUsersElement) {
                activeUsersElement.textContent = userCount;
            }
            
            // Update online users list if available
            if (activeUsers) {
                const usersList = document.getElementById('viewer-users-list');
                if (usersList) {
                    usersList.innerHTML = '';
                    activeUsers.forEach(user => {
                        const userElement = document.createElement('div');
                        userElement.className = 'user-item';
                        userElement.innerHTML = `
                            <i class="fas fa-user"></i>
                            <span>${user.username}</span>
                        `;
                        usersList.appendChild(userElement);
                    });
                }
            }
            
            console.log('📊 User count updated to:', userCount);
        } catch (error) {
            console.error('Failed to update user count:', error);
        }
    }
    
    /**
     * Initialize tile editor with pixel data
     */
    initializeTileEditor(tile) {
        try {
            console.log('🎨 Initializing tile editor for tile:', tile);
            
            // Get the pixel editor canvas element
            const pixelCanvas = document.getElementById('pixel-canvas');
            if (!pixelCanvas) {
                console.error('Pixel canvas element not found');
                return;
            }
            
            // Initialize the pixel editor
            if (window.PixelEditor) {
                console.log('🎨 Initializing PixelEditor...');
                window.PixelEditor.init(pixelCanvas);
                console.log('🎨 PixelEditor initialized successfully');
                
                // Clear the pixel editor to ensure fresh start
                window.PixelEditor.clearPixelData();
                console.log('🎨 PixelEditor cleared for fresh start');
                
                // Load the tile's pixel data
                console.log('🎨 Tile data received:', tile);
                console.log('🎨 Pixel data exists:', !!tile.pixel_data);
                console.log('🎨 Pixel data type:', typeof tile.pixel_data);
                console.log('🎨 Raw pixel data:', tile.pixel_data);
                
                if (tile.pixel_data) {
                    let pixelData;
                    if (typeof tile.pixel_data === 'string') {
                        try {
                            pixelData = JSON.parse(tile.pixel_data);
                            console.log('🎨 Parsed pixel data from string:', pixelData);
                            console.log('🎨 Parsed data type:', typeof pixelData);
                            console.log('🎨 Parsed data length:', Array.isArray(pixelData) ? pixelData.length : 'not array');
                            console.log('🎨 First row sample:', pixelData[0]);
                            console.log('🎨 First row length:', pixelData[0] ? pixelData[0].length : 'no first row');
                            console.log('🎨 Sample pixels from first row:', {
                                '0,0': pixelData[0] && pixelData[0][0],
                                '16,0': pixelData[0] && pixelData[0][16],
                                '17,0': pixelData[0] && pixelData[0][17],
                                '20,0': pixelData[0] && pixelData[0][20],
                                '21,0': pixelData[0] && pixelData[0][21]
                            });
                        } catch (e) {
                            console.error('Failed to parse pixel data:', e);
                            console.error('Raw pixel data:', tile.pixel_data);
                            pixelData = window.PixelEditor.createEmptyPixelData();
                        }
                    } else {
                        pixelData = tile.pixel_data;
                        console.log('🎨 Using pixel data as-is:', pixelData);
                        console.log('🎨 Data type:', typeof pixelData);
                        console.log('🎨 Data length:', Array.isArray(pixelData) ? pixelData.length : 'not array');
                    }
                    
                    // Validate pixel data structure
                    if (Array.isArray(pixelData) && pixelData.length === 32) {
                        window.PixelEditor.loadPixelData(pixelData);
                        console.log('🎨 Loaded pixel data into editor successfully');
                    } else {
                        console.warn('Invalid pixel data structure, using empty tile:', pixelData);
                        console.warn('Expected: Array with 32 elements, got:', typeof pixelData, Array.isArray(pixelData) ? pixelData.length : 'not array');
                        window.PixelEditor.loadPixelData(window.PixelEditor.createEmptyPixelData());
                    }
                } else {
                    console.log('🎨 No pixel data, starting with empty tile');
                    const emptyData = window.PixelEditor.createEmptyPixelData();
                    console.log('🎨 Empty pixel data created:', emptyData);
                    console.log('🎨 Empty data sample - first row:', emptyData[0]);
                    window.PixelEditor.loadPixelData(emptyData);
                }
                
                // Set up save button handler
                this.setupSaveButton(tile);
                
                // Set up tool buttons
                this.setupToolButtons();
                
                console.log('✅ Tile editor initialized successfully');
            } else {
                console.error('PixelEditor not available');
            }
            
        } catch (error) {
            console.error('Failed to initialize tile editor:', error);
        }
    }
    
    /**
     * Setup save button handler
     */
    setupSaveButton(tile) {
        const saveButton = document.getElementById('save-tile-btn');
        if (saveButton) {
            // Remove existing event listeners
            saveButton.replaceWith(saveButton.cloneNode(true));
            const newSaveButton = document.getElementById('save-tile-btn');
            
            newSaveButton.addEventListener('click', async () => {
                try {
                    console.log('💾 Saving tile...');
                    
                    // Get current canvas from app state - FIXED: use imported appState instead of window.appState
                    const currentCanvas = appState.getCurrentCanvas();
                    
                    if (!currentCanvas) {
                        console.error('❌ No current canvas found');
                        this.showCanvasError('No current canvas - please refresh and try again');
                        return;
                    }
                    
                    console.log('✅ Current canvas found:', currentCanvas.id);
                    
                    // Get pixel data from editor
                    let pixelData = window.PixelEditor.getPixelData();
                    
                    // Ensure we have valid pixel data (32x32 array)
                    if (!pixelData || !Array.isArray(pixelData) || pixelData.length !== 32) {
                        console.warn('Invalid pixel data, creating default 32x32 array');
                        pixelData = window.PixelEditor.createEmptyPixelData();
                    }
                    
                    // Get current canvas
                    const canvas = appState.get('currentCanvas');
                    if (!canvas) {
                        console.error('No current canvas');
                        return;
                    }
                    
                    const tileData = {
                        canvas_id: canvas.id,
                        x: tile.x,
                        y: tile.y,
                        pixel_data: JSON.stringify(pixelData)
                    };
                    
                    console.log('💾 Tile data to save:', tileData);
                    
                    // Save via API
                    let response;
                    if (tile.isNew) {
                        response = await window.API.tiles.create(tileData);
                    } else {
                        response = await window.API.tiles.update(tile.id, tileData);
                    }
                    
                    console.log('💾 Tile saved successfully:', response);
                    
                    // Update the canvas viewer with the new/updated tile
                    if (window.CanvasViewer && response.success && response.tile) {
                        window.CanvasViewer.addTile(response.tile, true);
                        console.log('🎨 Added tile to canvas viewer:', response.tile);
                    }
                    
                    // Go back to viewer
                    this.showSection('viewer');
                    
                    // Refresh canvas viewer as fallback
                    this.refreshCanvasViewer();
                    
                } catch (error) {
                    console.error('Failed to save tile:', error);
                    
                    // Show error message to user
                    if (window.UIManager) {
                        let errorMessage = 'Failed to save tile';
                        
                        // Extract error message from API response
                        if (error.data && error.data.detail) {
                            if (Array.isArray(error.data.detail)) {
                                errorMessage = error.data.detail[0]?.msg || error.data.detail[0]?.detail || errorMessage;
                            } else {
                                errorMessage = error.data.detail;
                            }
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        window.UIManager.showToast(errorMessage, 'error');
                    }
                }
            });
            
            // Initially enable save button (user can save even empty tiles)
            newSaveButton.disabled = false;
            
            // Set up pixel change listener to enable/disable save button
            if (window.PixelEditor) {
                window.PixelEditor.onPixelChanged = (pixelData) => {
                    // Enable save button when pixels are drawn
                    newSaveButton.disabled = !window.PixelEditor.hasPixels();
                };
            }
        }
    }
    
    /**
     * Setup tool buttons for pixel editor
     */
    setupToolButtons() {
        const toolButtons = {
            'paint-tool': 'paint',
            'eraser-tool': 'eraser',
            'picker-tool': 'picker',
            'fill-tool': 'fill'
        };
        
        Object.entries(toolButtons).forEach(([buttonId, toolName]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    // Remove active class from all tool buttons
                    Object.keys(toolButtons).forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) btn.classList.remove('active');
                    });
                    
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    // Set tool in pixel editor
                    if (window.PixelEditor) {
                        window.PixelEditor.setTool(toolName);
                    }
                });
            }
        });
        
        // Set up color picker
        const colorPicker = document.getElementById('custom-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                if (window.PixelEditor) {
                    window.PixelEditor.setColor(e.target.value);
                }
            });
        }
        
        // Initialize color palette with canvas palette
        if (window.UIManager) {
            window.UIManager.initColorPalette();
        }
    }
    
    /**
     * Update canvas stats
     */
    updateCanvasStats(canvas) {
        try {
            const totalTiles = document.getElementById('viewer-total-tiles');
            if (totalTiles) {
                totalTiles.textContent = canvas.tile_count || 0;
            }
            
            const activeUsers = document.getElementById('viewer-active-users');
            if (activeUsers) {
                activeUsers.textContent = canvas.user_count || 0;
            }
            
            const userTiles = document.getElementById('viewer-user-tiles');
            if (userTiles) {
                // TODO: Get user's tile count from API
                userTiles.textContent = '0';
            }
            
        } catch (error) {
            console.error('Failed to update canvas stats:', error);
        }
    }
    
    /**
     * Refresh canvas viewer with latest data
     */
    async refreshCanvasViewer() {
        try {
            const canvas = appState.get('currentCanvas');
            if (!canvas) {
                console.warn('No current canvas to refresh');
                return;
            }
            
            console.log('🔄 Refreshing canvas viewer with latest data...');
            
            // Reload canvas data from server
            const canvasData = await canvasService.getCanvasData(canvas.id);
            
            // Update canvas viewer with fresh data
            if (window.CanvasViewer) {
                window.CanvasViewer.setCanvasData(canvasData);
                
                if (canvasData.tiles && canvasData.tiles.length > 0) {
                    console.log('🔄 Reloading tiles into canvas viewer:', canvasData.tiles.length);
                    window.CanvasViewer.loadTiles(canvasData.tiles);
                } else {
                    console.log('🔄 No tiles to reload');
                }
            }
            
            console.log('✅ Canvas viewer refreshed successfully');
            
        } catch (error) {
            console.error('Failed to refresh canvas viewer:', error);
        }
    }
    
    /**
     * Update tile info display
     */
    updateTileInfo(tile) {
        try {
            const tileInfo = document.getElementById('viewer-tile-info');
            if (tileInfo && tile) {
                tileInfo.textContent = `Tile (${tile.x}, ${tile.y}) - Created by ${tile.creator_username || 'Unknown'}`;
            } else if (tileInfo) {
                tileInfo.textContent = 'Hover over tiles to see details';
            }
        } catch (error) {
            console.error('Failed to update tile info:', error);
        }
    }
    
    /**
     * Update viewport info
     */
    updateViewportInfo(x, y, zoom) {
        try {
            const zoomDisplay = document.getElementById('viewer-zoom-display');
            if (zoomDisplay) {
                zoomDisplay.textContent = `${Math.round(zoom * 100)}%`;
            }
            
            const zoomLevel = document.getElementById('viewer-zoom-level');
            if (zoomLevel) {
                zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
            }
            
        } catch (error) {
            console.error('Failed to update viewport info:', error);
        }
    }
    
    /**
     * Refresh canvas data
     */
    async refreshCanvas() {
        try {
            const canvas = appState.get('currentCanvas');
            if (!canvas) {
                console.warn('No current canvas to refresh');
                return;
            }
            
            console.log('Refreshing canvas:', canvas);
            
            // Reload canvas data
            const canvasData = await canvasService.getCanvasData(canvas.id);
            
            // Update canvas viewer
            if (window.CanvasViewer) {
                window.CanvasViewer.setCanvasData(canvasData);
                
                if (canvasData.tiles && canvasData.tiles.length > 0) {
                    window.CanvasViewer.loadTiles(canvasData.tiles);
                }
            }
            
            // Update stats
            this.updateCanvasStats(canvas);
            
            console.log('✅ Canvas refreshed');
            
        } catch (error) {
            console.error('Failed to refresh canvas:', error);
            this.showCanvasError(`Failed to refresh canvas: ${error.message}`);
        }
    }
    
    /**
     * Fit canvas to screen
     */
    fitCanvasToScreen() {
        try {
            if (window.CanvasViewer) {
                window.CanvasViewer.centerView();
                window.CanvasViewer.resetZoom();
            }
        } catch (error) {
            console.error('Failed to fit canvas to screen:', error);
        }
    }
    
    /**
     * Show canvas error message
     */
    showCanvasError(message) {
        console.error('Canvas error:', message);
        // You can implement a proper error display here
        alert(`Canvas Error: ${message}`);
    }
    
    /**
     * Show a modal
     */
    showModal(modalName) {
        console.log(`Showing modal: ${modalName}`);
        
        // Handle different modal naming conventions
        let modal;
        
        if (modalName === 'create-canvas') {
            modal = this.elements.createCanvasModal;
        } else if (modalName === 'login') {
            modal = this.elements.loginModal;
        } else if (modalName === 'register') {
            modal = this.elements.registerModal;
        } else {
            // Fallback to direct DOM lookup
            modal = document.getElementById(`${modalName}-modal`);
        }
        
        if (modal) {
            // Show modal using CSS classes and inline styles
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            
            // Focus first input in modal
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
            
            console.log(`Modal opened: ${modalName}`);
        } else {
            console.error(`Modal not found: ${modalName}`);
        }
    }
    
    /**
     * Hide a modal
     */
    hideModal(modalName) {
        console.log(`Hiding modal: ${modalName}`);
        
        let modal;
        
        if (modalName === 'create-canvas') {
            modal = this.elements.createCanvasModal;
        } else if (modalName === 'login') {
            modal = this.elements.loginModal;
        } else if (modalName === 'register') {
            modal = this.elements.registerModal;
        } else {
            // Fallback to direct DOM lookup
            modal = document.getElementById(`${modalName}-modal`);
        }
        
        if (modal) {
            // Remove active class and hide
            modal.classList.remove('active');
            // Wait for CSS transition to complete before hiding
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
            
            document.body.classList.remove('modal-open');
            console.log(`Modal closed: ${modalName}`);
        } else {
            console.warn(`Modal not found for hiding: ${modalName}`);
        }
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        console.log('Hiding all modals...');
        
        // Hide using CSS classes
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 200);
        });
        
        document.body.classList.remove('modal-open');
        
        console.log('All modals hidden');
    }
    
    /**
     * Get modal name from element
     */
    getModalName(modalElement) {
        const id = modalElement.id;
        return id.replace('-modal', '');
    }
    
    /**
     * Update navigation based on authentication state
     */
    updateNavigation() {
        const isAuthenticated = appState.get('isAuthenticated');
        console.log(`Updating navigation, authenticated: ${isAuthenticated}`);
        
        if (isAuthenticated) {
            // Show authenticated navigation
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'none';
            }
            if (this.elements.registerBtn) {
                this.elements.registerBtn.style.display = 'none';
            }
            if (this.elements.userInfo) {
                this.elements.userInfo.classList.remove('hidden');
                this.elements.userInfo.style.display = 'flex';
            }
        } else {
            // Show unauthenticated navigation
            if (this.elements.loginBtn) {
                this.elements.loginBtn.style.display = 'inline-block';
            }
            if (this.elements.registerBtn) {
                this.elements.registerBtn.style.display = 'inline-block';
            }
            if (this.elements.userInfo) {
                this.elements.userInfo.classList.add('hidden');
                this.elements.userInfo.style.display = 'none';
            }
        }
    }
    
    /**
     * Update user info display
     */
    updateUserInfo(user) {
        if (user && this.elements.username) {
            this.elements.username.textContent = user.username;
            console.log(`User info updated: ${user.username}`);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            // Clear authentication data
            window.CONFIG_UTILS.removeAuthToken();
            window.CONFIG_UTILS.removeUserData();
            
            // Update app state
            appState.setUnauthenticated();
            
            // Update navigation
            this.updateNavigation();
            
            // Show welcome section
            this.showSection('welcome');
            
            console.log('✅ User logged out successfully');
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    /**
     * Handle browser back/forward navigation
     */
    handlePopState(event) {
        const section = event.state?.section || 'welcome';
        this.showSection(section);
    }
    
    /**
     * Navigate to section with browser history
     */
    navigateTo(sectionName) {
        this.showSection(sectionName);
    }
    
    /**
     * Get current section
     */
    getCurrentSection() {
        return appState.get('currentSection');
    }
    
    /**
     * Show loading screen
     */
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /**
     * Update tile info fields in editor header
     */
    updateEditorTileInfo(tile) {
        try {
            console.log('📝 Updating editor tile info:', tile);
            
            // Update owner
            const ownerElement = document.getElementById('tile-info-owner');
            if (ownerElement) {
                const ownerName = tile.creator_username || tile.creator_id || 'Unknown';
                ownerElement.textContent = `Owner: ${ownerName}`;
            }
            
            // Update canvas name
            const canvasElement = document.getElementById('tile-info-canvas');
            if (canvasElement) {
                const canvas = appState.get('currentCanvas');
                const canvasName = canvas ? canvas.name : 'Unknown Canvas';
                canvasElement.textContent = `Canvas: ${canvasName}`;
            }
            
            // Update created date
            const createdElement = document.getElementById('tile-info-created');
            if (createdElement && tile.created_at) {
                const createdDate = new Date(tile.created_at).toLocaleDateString();
                createdElement.textContent = `Created: ${createdDate}`;
            } else if (createdElement) {
                createdElement.textContent = 'Created: -';
            }
            
            // Update updated date
            const updatedElement = document.getElementById('tile-info-updated');
            if (updatedElement && tile.updated_at) {
                const updatedDate = new Date(tile.updated_at).toLocaleDateString();
                updatedElement.textContent = `Updated: ${updatedDate}`;
            } else if (updatedElement) {
                updatedElement.textContent = 'Updated: -';
            }
            
            console.log('✅ Editor tile info updated');
        } catch (error) {
            console.error('Failed to update editor tile info:', error);
        }
    }

    /**
     * Update tile info in canvas viewer
     */
}

// Create singleton instance
const navigationManager = new NavigationManager();

// Export methods for external use
export const showSection = (sectionName) => navigationManager.showSection(sectionName);
export const showModal = (modalName) => navigationManager.showModal(modalName);
export const hideModal = (modalName) => navigationManager.hideModal(modalName);
export const showLoading = () => navigationManager.showLoading();
export const hideLoading = () => navigationManager.hideLoading();

export default navigationManager; 