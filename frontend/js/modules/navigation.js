/**
 * Navigation Module
 * Handles section navigation and modal management
 */

import appState from './app-state.js';
import canvasService from '../services/canvas.js';
import { eventManager } from '../utils/events.js';

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
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
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
                CONFIG_UTILS.setAuthToken(data.access_token);
                CONFIG_UTILS.setUserData(data.user);
                
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
                const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
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
                    CONFIG_UTILS.setAuthToken(data.access_token);
                    CONFIG_UTILS.setUserData(data.user);
                    
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
            console.log('Opening canvas:', canvas);
            
            // Set current canvas in app state
            appState.setCurrentCanvas(canvas);
            
            // Show viewer section instead of editor
            this.showSection('viewer');
            
            // Initialize canvas service if needed
            if (!canvasService.initialized) {
                canvasService.init();
            }
            
            // Load canvas data
            const canvasData = await canvasService.getCanvasData(canvas.id);
            
            // Update canvas title and info in viewer
            const canvasTitle = document.getElementById('viewer-canvas-title');
            if (canvasTitle) {
                canvasTitle.textContent = canvas.name;
            }
            
            const canvasDimensions = document.getElementById('viewer-canvas-dimensions');
            if (canvasDimensions) {
                canvasDimensions.textContent = `${canvas.width}×${canvas.height}`;
            }
            
            // Update canvas stats
            this.updateCanvasStats(canvas);
            
            // Initialize canvas viewer
            await this.initializeCanvasViewer(canvas, canvasData);
            
            // Emit canvas opened event for other listeners
            eventManager.emit('canvas:opened', canvasData);
            
            console.log('✅ Canvas opened successfully');
            
        } catch (error) {
            console.error('Failed to open canvas:', error);
            this.showCanvasError(`Failed to open canvas: ${error.message}`);
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
            const miniMapElement = document.getElementById('viewer-mini-map');
            
            if (!canvasElement) {
                throw new Error('Canvas viewer element not found');
            }
            
            // Initialize canvas viewer
            if (window.CanvasViewer) {
                window.CanvasViewer.init(canvasElement, miniMapElement);
                window.CanvasViewer.setCanvasData(canvasData);
                
                // Set up tile click handler to open editor
                window.CanvasViewer.onTileClick = (tile) => {
                    console.log('Tile clicked, opening editor for tile:', tile);
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
                    window.CanvasViewer.loadTiles(canvasData.tiles);
                }
                
                console.log('✅ Canvas viewer initialized');
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
            console.log('Opening tile editor for tile:', tile);
            
            // Set current tile in app state
            appState.setCurrentTile(tile);
            
            // Show editor section
            this.showSection('editor');
            
            // Update editor with tile data
            const canvasTitle = document.getElementById('canvas-title');
            if (canvasTitle) {
                const canvas = appState.get('currentCanvas');
                canvasTitle.textContent = canvas ? canvas.name : 'Canvas';
            }
            
            const tileCoords = document.getElementById('current-tile-coords');
            if (tileCoords) {
                tileCoords.textContent = `Tile: (${tile.x}, ${tile.y})`;
            }
            
            // Emit tile opened event
            eventManager.emit('tile:opened', tile);
            
            console.log('✅ Tile editor opened');
            
        } catch (error) {
            console.error('Failed to open tile editor:', error);
            this.showCanvasError(`Failed to open tile editor: ${error.message}`);
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
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
            
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