/**
 * Navigation Module (Refactored)
 * Main coordinator that delegates to specialized managers
 * Follows SOLID principles with single responsibility
 */

import appState from './app-state.js';
import { eventManager } from '../utils/events.js';
import { createManagers } from './managers/index.js';

class NavigationManager {
    constructor() {
        console.log('🔧 Initializing NavigationManager...');
        
        // Wait for API to be available before initializing managers
        this.waitForAPIAndInitialize();
    }
    
    async waitForAPIAndInitialize() {
        // Wait for API to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.API && attempts < maxAttempts) {
            console.log(`⏳ Waiting for API... (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.API) {
            console.error('❌ API not available after waiting');
            throw new Error('API not available after waiting');
        }
        
        console.log('✅ API available, initializing managers...');
        
        try {
            // Initialize all specialized managers
            console.log('🔧 About to create managers...');
            this.managers = createManagers();
            console.log('✅ Managers created successfully:', this.managers);
        } catch (error) {
            console.error('❌ Failed to create managers:', error);
            throw error;
        }
        
        // Initialize DOM elements
        this.elements = this.initializeElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup comprehensive state protection
        this.setupBrowserNavigationHandlers();
        this.setupWebSocketStateProtection();
        this.setupAsyncRaceProtection();
        
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
            
            // Modal controls
            closeLoginModal: document.getElementById('close-login-modal'),
            closeRegisterModal: document.getElementById('close-register-modal'),
            closeCreateCanvasModal: document.getElementById('close-create-canvas-modal')
        };
        
       
        return elements;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Listen for navigation events from other managers
        eventManager.on('navigateToSection', (sectionName) => {
            console.log(`🔄 Navigation event received: navigateToSection(${sectionName})`);
            this.showSection(sectionName);
        });
        
        // Login and Register button click events
        this.elements.loginBtn?.addEventListener('click', () => {
            console.log('Login button clicked');
            this.managers.modal.showModal('login');
        });
        
        this.elements.registerBtn?.addEventListener('click', () => {
            console.log('Register button clicked');
            this.managers.modal.showModal('register');
        });
        
        // Get Started button click event
        const getStartedBtn = document.getElementById('get-started-btn');
        getStartedBtn?.addEventListener('click', () => {
            console.log('Get Started button clicked');
            this.managers.modal.showModal('register');
        });
        
        // Create Canvas button click event
        const createCanvasBtn = document.getElementById('create-canvas-btn');
        createCanvasBtn?.addEventListener('click', () => {
            console.log('Create Canvas button clicked');
            this.managers.modal.showModal('create-canvas');
        });
        
        // Refresh Canvases button click event
        const refreshCanvasesBtn = document.getElementById('refresh-canvases-btn');
        refreshCanvasesBtn?.addEventListener('click', () => {
            console.log('Refresh Canvases button clicked');
            this.managers.canvasList.loadCanvases();
        });
        
        // Logout button click event
        this.elements.logoutBtn?.addEventListener('click', () => {
            console.log('Logout button clicked');
            this.managers.auth.handleLogout();
        });
        
        // Admin button click event
        const adminBtn = document.getElementById('admin-btn');
        adminBtn?.addEventListener('click', () => {
            console.log('Admin button clicked');
            this.showSection('admin');
        });
        
        // Viewer navigation buttons
        const viewerBackBtn = document.getElementById('viewer-back-to-canvases-btn');
        viewerBackBtn?.addEventListener('click', () => {
            console.log('Viewer back button clicked');
            this.showSection('canvas');
        });
        
        const viewerRefreshBtn = document.getElementById('viewer-refresh-btn');
        viewerRefreshBtn?.addEventListener('click', () => {
            console.log('Viewer refresh button clicked');
            this.refreshCurrentCanvas();
        });
        
        const viewerSettingsBtn = document.getElementById('viewer-settings-btn');
        viewerSettingsBtn?.addEventListener('click', () => {
            console.log('Viewer settings button clicked');
            this.showCanvasSettings();
        });
        
        const viewerZoomFitBtn = document.getElementById('viewer-zoom-fit-btn');
        viewerZoomFitBtn?.addEventListener('click', () => {
            console.log('Viewer zoom fit button clicked');
            if (window.CanvasViewer) {
                window.CanvasViewer.resetZoom();
            }
        });
        
        // Viewer zoom controls
        const viewerZoomOutBtn = document.getElementById('viewer-zoom-out-btn');
        viewerZoomOutBtn?.addEventListener('click', () => {
            console.log('Viewer zoom out button clicked');
            if (window.CanvasViewer) {
                window.CanvasViewer.zoomOut();
            }
        });
        
        const viewerZoomInBtn = document.getElementById('viewer-zoom-in-btn');
        viewerZoomInBtn?.addEventListener('click', () => {
            console.log('Viewer zoom in button clicked');
            if (window.CanvasViewer) {
                window.CanvasViewer.zoomIn();
            }
        });
        
        // Viewer view options
        const toggleGridBtn = document.getElementById('toggle-grid-btn');
        toggleGridBtn?.addEventListener('click', () => {
            console.log('Toggle grid button clicked');
            if (window.CanvasViewer) {
                window.CanvasViewer.toggleGrid();
            }
        });
        
        const toggleUserIndicatorsBtn = document.getElementById('toggle-user-indicators-btn');
        toggleUserIndicatorsBtn?.addEventListener('click', () => {
            console.log('Toggle user indicators button clicked');
            if (window.CanvasViewer) {
                window.CanvasViewer.toggleUserIndicators();
            }
        });
        
        // Debug toggle button - CRITICAL FIX: Use delayed setup like forceSetupDebugButton
        this.setupDebugButtonWithDelay();
        
        // Close modal buttons
        this.elements.closeLoginModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('login');
        });
        
        this.elements.closeRegisterModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('register');
        });
        
        this.elements.closeCreateCanvasModal?.addEventListener('click', () => {
            this.managers.modal.hideModal('create-canvas');
        });
        
        console.log('✅ Event listeners setup complete');
    }
    
    /**
     * Show a section by name
     */
    showSection(sectionName) {
        console.log(`🔄 NavigationManager.showSection called with: ${sectionName}`);
        console.log(`🔧 this context in showSection:`, this);
        
        // Hide all sections
        const sections = [
            'welcome-section',
            'canvas-section', 
            'viewer-section',
            'editor-section',
            'gallery-section',
            'admin-section'
        ];
        
        console.log('🔧 Hiding all sections...');
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                element.classList.add('hidden');
                console.log(`✅ Hidden section: ${section}`);
            } else {
                console.warn(`⚠️ Section element not found: ${section}`);
            }
        });
        
        // Show requested section
        const targetSection = document.getElementById(`${sectionName}-section`);
        console.log(`🔧 Looking for section: ${sectionName}-section`);
        console.log(`🔧 Target section element:`, targetSection);
        
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log(`✅ Section ${sectionName} shown successfully`);

            // CRITICAL FIX: Emit section change event for debug overlay
            if (window.eventManager) {
                window.eventManager.emit('sectionChanged', sectionName);
                console.log(`📡 Emitted sectionChanged event: ${sectionName}`);
            }

            // When showing the viewer, force a resize after a tick to ensure correct initial size
            if (sectionName === 'viewer' && window.CanvasViewer) {
                console.log('🔧 Viewer section shown, triggering canvas resize...');
                requestAnimationFrame(() => {
                    try {
                        window.CanvasViewer.resizeCanvas();
                        // Double-tick to catch late layout on mobile browsers
                        setTimeout(() => window.CanvasViewer.resizeCanvas(), 50);
                        console.log('✅ Canvas resize triggered');
                    } catch (e) {
                        console.warn('Viewer resize after show failed:', e);
                    }
                });
            }
            
            // When showing the admin panel, initialize it
            if (sectionName === 'admin' && this.managers.admin) {
                console.log('🔧 Initializing admin panel...');
                this.managers.admin.init();
                
                // FIXED: Ensure admin panel is ready before showing
                setTimeout(() => {
                    if (this.managers.admin.initialized) {
                        console.log('✅ Admin panel ready, showing dashboard...');
                        this.managers.admin.showView('dashboard');
                    }
                }, 100);
            }
            
            // FIXED: Load canvases when showing canvas section
            if (sectionName === 'canvas' && this.managers.canvasList) {
                console.log('🔄 Loading canvases for canvas section...');
                // Use setTimeout to ensure DOM is ready
                setTimeout(() => {
                    this.managers.canvasList.loadCanvases();
                }, 100);
            }
        } else {
            console.error(`❌ Section ${sectionName} not found`);
        }
        
        // Update navigation state
        console.log('🔧 Updating navigation state...');
        this.updateNavigation();
        console.log(`✅ Section ${sectionName} display process completed`);
    }
    
    /**
     * Open a canvas (delegate to original CanvasViewer)
     */
    async openCanvas(canvas) {
        try {
            console.log('🔄 NavigationManager.openCanvas called with:', canvas);
            
            // Check if CanvasViewer is available
            if (!window.CanvasViewer) {
                console.error('❌ CanvasViewer not available');
                throw new Error('CanvasViewer not available');
            }
            
            // Initialize CanvasViewer if not already initialized
            if (!window.CanvasViewer.isInitialized()) {
                console.log('🔄 Initializing CanvasViewer with canvas element...');
                const canvasElement = document.getElementById('canvas-viewer');
                if (canvasElement) {
                    window.CanvasViewer.init(canvasElement);
                    console.log('✅ CanvasViewer initialized');
                } else {
                    console.error('❌ Canvas viewer element not found');
                    throw new Error('Canvas viewer element not found');
                }
            }
            
            // Set up tile click callback to open tile editor
            if (window.CanvasViewer && this.managers.tileEditor) {
                console.log('🔄 Setting up tile click callback...');
                window.CanvasViewer.onTileClick = (tile) => {
                    console.log('🎯 Tile clicked, opening tile editor:', tile);
                    this.managers.tileEditor.openTileEditor(tile);
                };
                console.log('✅ Tile click callback configured');
            }
            
            // Set canvas data and load tiles
            console.log('🔄 Setting canvas data in CanvasViewer...');
            console.log('🔄 Canvas data structure:', {
                id: canvas.id,
                name: canvas.name,
                width: canvas.width,
                height: canvas.height,
                tile_size: canvas.tile_size,
                hasTiles: !!(canvas.tiles && canvas.tiles.length > 0)
            });
            
            // Set canvas data first
            window.CanvasViewer.setCanvasData(canvas);
            
            // Always load tiles for the canvas (they're not included in canvas data)
            console.log('🔄 Loading tiles for canvas...');
            let tiles = [];
            try {
                tiles = await this.managers.canvasList.tileApi.getForCanvas(canvas.id);
                if (tiles && tiles.length > 0) {
                    console.log(`📦 Loaded ${tiles.length} tiles for canvas`);
                    window.CanvasViewer.loadTiles(tiles);
                } else {
                    console.log('📦 No tiles found for this canvas');
                    tiles = [];
                }
            } catch (error) {
                console.error('❌ Failed to load tiles for canvas:', error);
                tiles = [];
            }
            
            // Update canvas stats and title - FIX ISSUE DATA POPULATION
            this.updateCanvasStats(canvas, tiles);
            this.updateCanvasTitle(canvas);
            
            // Initialize chat and presence for the canvas
            console.log('🔄 Initializing chat and presence for canvas...');
            try {
                // Connect WebSocket for real-time updates
                if (this.managers.webSocket && typeof this.managers.webSocket.connect === 'function') {
                    console.log('🔌 Connecting WebSocket for real-time updates...');
                    await this.managers.webSocket.connect(canvas.id);
                    console.log('✅ WebSocket connected for canvas');
                }
                
                if (this.managers.chat && typeof this.managers.chat.initialize === 'function') {
                    await this.managers.chat.initialize();
                    await this.managers.chat.openCanvasChat(canvas.id);
                    console.log('✅ Chat manager initialized for canvas');
                }
                
                if (this.managers.presence && typeof this.managers.presence.initialize === 'function') {
                    await this.managers.presence.initialize();
                    console.log('✅ Presence manager initialized for canvas');
                }
                
                // Set current canvas in app state for WebSocket context
                if (window.appState) {
                    window.appState.set('currentCanvas', canvas);
                    console.log('✅ Current canvas set in app state:', canvas.id);
                }
                
                // Emit canvas changed event for chat and presence
                eventManager.emit('canvasChanged', canvas);
                
            } catch (error) {
                console.warn('⚠️ Failed to initialize chat/presence (non-critical):', error);
            }
            
            // Show viewer section
            console.log('🔄 Attempting to show viewer section...');
            this.showSection('viewer');
            console.log('✅ showSection call completed');
            
        } catch (error) {
            console.error('❌ Failed to open canvas:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to open canvas', 'error');
            }
        }
    }
    
    /**
     * Load canvases (delegate to canvas list manager)
     */
    async loadCanvases() {
        return this.managers.canvasList.loadCanvases();
    }
    
    /**
     * Show modal (delegate to modal manager)
     */
    showModal(modalName) {
        return this.managers.modal.showModal(modalName);
    }
    
    /**
     * Hide modal (delegate to modal manager)
     */
    hideModal(modalName) {
        return this.managers.modal.hideModal(modalName);
    }
    
    /**
     * Show loading (delegate to UI manager)
     */
    showLoading() {
        if (window.UIManager) {
            window.UIManager.showLoading();
        }
    }
    
    /**
     * Hide loading (delegate to UI manager)
     */
    hideLoading() {
        if (window.UIManager) {
            window.UIManager.hideLoading();
        }
    }
    
    /**
     * Update canvas stats display
     */
    updateCanvasStats(canvas, tiles) {
        try {
            console.log('🔧 Updating canvas stats...');
            
            // Get current user
            const currentUser = window.appState ? window.appState.get('currentUser') : null;
            const currentUserId = currentUser ? currentUser.id : null;
            
            // Calculate stats
            const totalTiles = tiles.length;
            const userTiles = currentUserId ? tiles.filter(tile => tile.creator_id === currentUserId).length : 0;
            
            // For now, set active users to 1 (current user) - could be enhanced with WebSocket data
            const activeUsers = currentUser ? 1 : 0;
            
            // Update DOM elements
            const totalTilesEl = document.getElementById('viewer-total-tiles');
            const activeUsersEl = document.getElementById('viewer-active-users');  
            const userTilesEl = document.getElementById('viewer-user-tiles');
            
            if (totalTilesEl) totalTilesEl.textContent = totalTiles;
            if (activeUsersEl) activeUsersEl.textContent = activeUsers;
            if (userTilesEl) userTilesEl.textContent = userTiles;
            
            console.log('✅ Canvas stats updated:', { totalTiles, activeUsers, userTiles });
            
        } catch (error) {
            console.error('❌ Failed to update canvas stats:', error);
        }
    }
    
    /**
     * Update canvas title and header info
     */
    updateCanvasTitle(canvas) {
        try {
            console.log('🔧 Updating canvas title...');
            
            // Update canvas title
            const titleElement = document.getElementById('viewer-canvas-title');
            if (titleElement && canvas.name) {
                titleElement.textContent = canvas.name;
                console.log('✅ Updated canvas title:', canvas.name);
            } else {
                console.warn('⚠️ Canvas title element not found or no canvas name');
            }
            
            // Update canvas dimensions (moved to header)
            const dimensionsElement = document.getElementById('viewer-canvas-dimensions');
            if (dimensionsElement && canvas.width && canvas.height) {
                dimensionsElement.textContent = `${canvas.width}×${canvas.height}`;
                console.log('✅ Updated canvas dimensions:', `${canvas.width}×${canvas.height}`);
            }
            
            // Update tile size (new element in header)
            const tileSizeElement = document.getElementById('viewer-canvas-tile-size');
            if (tileSizeElement && canvas.tile_size) {
                tileSizeElement.textContent = `${canvas.tile_size}px tiles`;
                console.log('✅ Updated tile size:', `${canvas.tile_size}px tiles`);
            }
            
            // Update users online (moved to sidebar)
            const usersElement = document.getElementById('viewer-canvas-users');
            if (usersElement) {
                const userCount = canvas.user_count || 1; // Default to 1 (current user)
                usersElement.textContent = `(${userCount})`;
                console.log('✅ Updated users online in sidebar:', userCount);
            }
            
        } catch (error) {
            console.error('❌ Failed to update canvas title:', error);
        }
    }
    
    /**
     * Refresh current canvas
     */
    async refreshCurrentCanvas() {
        try {
            console.log('🔄 Refreshing current canvas...');
            if (window.CanvasViewer && window.CanvasViewer.canvasData) {
                const canvasId = window.CanvasViewer.canvasData.id;
                console.log(`🔄 Refreshing canvas ${canvasId}...`);
                
                // Reload canvas data
                const canvasData = await this.managers.canvasList.canvasApi.get(canvasId);
                const tiles = await this.managers.canvasList.tileApi.getForCanvas(canvasId);
                
                // Update canvas viewer
                window.CanvasViewer.setCanvasData(canvasData);
                if (tiles && tiles.length > 0) {
                    window.CanvasViewer.loadTiles(tiles);
                }
                
                // Update canvas stats and title
                this.updateCanvasStats(canvasData, tiles || []);
                this.updateCanvasTitle(canvasData);
                
                // Center and reset view after refresh - FIX ISSUE 1
                window.CanvasViewer.resetZoom();
                window.CanvasViewer.centerView();
                
                console.log('✅ Canvas refreshed and centered successfully');
            } else {
                console.warn('⚠️ No current canvas to refresh');
            }
        } catch (error) {
            console.error('❌ Failed to refresh canvas:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to refresh canvas', 'error');
            }
        }
    }
    
    /**
     * Show canvas settings modal
     */
    showCanvasSettings() {
        try {
            if (window.CanvasViewer && window.CanvasViewer.canvasData) {
                const canvasId = window.CanvasViewer.canvasData.id;
                console.log(`🔄 Showing settings for canvas ${canvasId}...`);
                this.managers.modal.showCanvasSettingsModal(canvasId);
            } else {
                console.warn('⚠️ No current canvas to show settings for');
            }
        } catch (error) {
            console.error('❌ Failed to show canvas settings:', error);
        }
    }
    
    /**
     * Update navigation based on current state
     */
    updateNavigation() {
        const currentUser = appState.get('currentUser');
        const isAuthenticated = currentUser !== null;
        
        // Update user info if authenticated
        if (isAuthenticated) {
            this.managers.auth.updateUserInfo(currentUser);
        }
        
        // Update navigation visibility
        this.managers.auth.updateNavigation();
    }
    
    /**
     * Setup browser navigation handlers
     */
    setupBrowserNavigationHandlers() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            const section = event.state?.section || 'welcome';
            this.showSection(section);
        });
        
        // Store the original showSection method
        const originalShowSection = this.showSection.bind(this);
        
        // Create a consolidated showSection method that handles all functionality
        this.showSection = (sectionName) => {
            console.log(`🔄 Consolidated showSection called with: ${sectionName}`);
            
            // Handle WebSocket cleanup when leaving viewer
            if (sectionName !== 'viewer' && this.managers.webSocket) {
                console.log('🔧 Closing WebSocket connections (leaving viewer)');
                this.managers.webSocket.closeAll();
            }
            
            // Handle chat and presence cleanup when leaving viewer
            if (sectionName !== 'viewer') {
                if (this.managers.presence && typeof this.managers.presence.stopTileEditing === 'function') {
                    // Stop any active tile editing when leaving viewer
                    const currentUser = appState.get('currentUser');
                    const currentCanvas = appState.get('currentCanvas');
                    if (currentUser && currentCanvas) {
                        console.log('🔧 Stopping tile editing presence (leaving viewer)');
                        // This will be handled by the presence manager's cleanup
                    }
                }
            }
            
            // Call the original showSection method
            originalShowSection(sectionName);
            
            // Special handling when returning to viewer - FIX ISSUE 2
            if (sectionName === 'viewer' && window.CanvasViewer && window.CanvasViewer.canvasData) {
                console.log('🔄 Returning to viewer - centering and refreshing view');
                
                // Small delay to ensure viewer section is visible
                setTimeout(() => {
                    // Refresh tiles and center view
                    this.refreshCurrentCanvas();
                }, 100);
            }
            
            // Update browser history
            window.history.pushState({ section: sectionName }, '', `#${sectionName}`);
            console.log(`✅ Browser history updated for section: ${sectionName}`);
        };
        
        console.log('✅ Browser navigation handlers setup complete');
    }
    
    /**
     * Setup WebSocket state protection
     */
    setupWebSocketStateProtection() {
        // WebSocket cleanup is now handled in the consolidated showSection method
        console.log('✅ WebSocket state protection setup complete (handled in showSection)');
    }
    
    /**
     * Setup async race protection
     */
    setupAsyncRaceProtection() {
        // Initialize pending operations map for potential future use
        this.pendingOperations = new Map();
        
        // For now, we'll rely on the button-level debouncing in CanvasListManager
        // which is more reliable and user-friendly
        console.log('🔧 Async race protection initialized (button-level debouncing active)');
    }
    
    /**
     * Clear all canvas state
     */
    clearAllCanvasState() {
        console.log('🧹 Clearing all canvas state...');
        
        // Clear WebSocket connections
        this.managers.webSocket.closeAll();
        
        // Clear any pending operations
        this.pendingOperations.clear();
        
        // Clear app state
        appState.clear();
        
        console.log('✅ Canvas state cleared');
    }
    
    /**
     * Handle error recovery
     */
    handleErrorRecovery(error, operation) {
        console.error(`❌ Error in ${operation}:`, error);
        
        // Clear state and show error
        this.clearAllCanvasState();
        
        if (window.UIManager) {
            window.UIManager.showToast(`Error in ${operation}. Please try again.`, 'error');
        }
        
        // Return to welcome section
        this.showSection('welcome');
    }
    
    /**
     * Emergency state recovery
     */
    emergencyStateRecovery() {
        console.log('🚨 Emergency state recovery initiated...');
        
        // Clear all state
        this.clearAllCanvasState();
        
        // Reset UI
        this.updateNavigation();
        
        // Show welcome section
        this.showSection('welcome');
        
        // Hide all modals
        this.managers.modal.hideAllModals();
        
        console.log('✅ Emergency recovery completed');
    }
    
    /**
     * Test state clearing (for debugging)
     */
    testStateClearing() {
        console.log('🧪 Testing state clearing...');
        this.clearAllCanvasState();
        console.log('✅ State clearing test completed');
    }
    
    /**
     * Clear pending operations (for debugging)
     */
    clearPendingOperations() {
        console.log('🧹 Clearing pending operations:', Array.from(this.pendingOperations.entries()));
        this.pendingOperations.clear();
        console.log('✅ Pending operations cleared');
    }
    
    /**
     * CRITICAL FIX: Setup debug button with proper timing (uses same approach as forceSetupDebugButton)
     */
    setupDebugButtonWithDelay() {
        console.log('🔧 Setting up debug button with proper timing...');
        
        const setupButton = () => {
            const toggleDebugBtn = document.getElementById('toggle-debug-btn');
            
            if (!toggleDebugBtn) {
                console.warn('⚠️ Debug button not found, retrying...');
                return false;
            }
            
            if (!window.debugManager) {
                console.warn('⚠️ Debug manager not available, retrying...');
                return false;
            }
            
            console.log('🔍 Setting up debug button event listener (delayed setup)...');
            
            // CRITICAL: Use the same approach that works in forceSetupDebugButton
            // Remove existing listeners by cloning the button
            const newButton = toggleDebugBtn.cloneNode(true);
            toggleDebugBtn.parentNode.replaceChild(newButton, toggleDebugBtn);
            
            // Add event listener with the exact same approach that works
            newButton.addEventListener('click', (event) => {
                // CRITICAL: Same event handling as forceSetupDebugButton
                event.preventDefault();
                event.stopPropagation();
                
                console.log('🔍 Debug button clicked!');
                
                try {
                    const currentState = window.debugManager.getDebugState();
                    const newEnabled = !currentState.enabled;
                    
                    console.log(`🔍 Toggling debug from ${currentState.enabled} to ${newEnabled}`);
                    window.debugManager.setEnabled(newEnabled);
                    
                    // Visual feedback with immediate styling (same as forceSetupDebugButton)
                    if (newEnabled) {
                        newButton.classList.add('btn-primary');
                        newButton.classList.remove('btn-secondary');
                        newButton.style.backgroundColor = '#007bff';
                        newButton.style.borderColor = '#007bff';
                        newButton.style.color = 'white';
                    } else {
                        newButton.classList.remove('btn-primary');
                        newButton.classList.add('btn-secondary');
                        newButton.style.backgroundColor = '#6c757d';
                        newButton.style.borderColor = '#6c757d';
                        newButton.style.color = 'white';
                    }
                    
                    console.log('✅ Debug toggle completed successfully');
                    
                } catch (error) {
                    console.error('❌ Error in debug toggle:', error);
                }
            });
            
            console.log('✅ Debug button event listener setup complete (delayed setup)');
            return true;
        };
        
        // Try immediate setup
        if (setupButton()) {
            return;
        }
        
        // If immediate setup failed, retry with delays
        console.log('⏳ Debug button not ready, using delayed setup...');
        
        let attempts = 0;
        const maxAttempts = 20;
        
        const retrySetup = () => {
            attempts++;
            
            if (setupButton()) {
                console.log('✅ Debug button setup completed after delay');
                return;
            }
            
            if (attempts < maxAttempts) {
                console.log(`⏳ Debug button setup attempt ${attempts}/${maxAttempts}...`);
                setTimeout(retrySetup, 100);
            } else {
                console.error('❌ Debug button setup failed after maximum attempts');
                console.log('💡 Use window.forceSetupDebugButton() to manually fix');
            }
        };
        
        // Start retry process
        setTimeout(retrySetup, 100);
    }
    
    /**
     * DIAGNOSTIC: Debug button diagnostics
     * SAFETY: Read-only diagnostics - does not modify anything
     */
    diagnoseDebugButton() {
        console.log('🔍 DIAGNOSTIC: Debug Button Analysis');
        console.log('=====================================');
        
        // Check if button exists
        const toggleDebugBtn = document.getElementById('toggle-debug-btn');
        console.log('🔍 Button exists:', !!toggleDebugBtn);
        
        if (toggleDebugBtn) {
            console.log('🔍 Button element:', toggleDebugBtn);
            console.log('🔍 Button classes:', toggleDebugBtn.className);
            console.log('🔍 Button style:', toggleDebugBtn.style.cssText);
            console.log('🔍 Button parent:', toggleDebugBtn.parentElement);
            console.log('🔍 Button disabled:', toggleDebugBtn.disabled);
            console.log('🔍 Button display:', window.getComputedStyle(toggleDebugBtn).display);
            console.log('🔍 Button visibility:', window.getComputedStyle(toggleDebugBtn).visibility);
        }
        
        // Check debug manager
        console.log('🔍 window.debugManager exists:', !!window.debugManager);
        if (window.debugManager) {
            console.log('🔍 debugManager type:', typeof window.debugManager);
            console.log('🔍 debugManager constructor:', window.debugManager.constructor.name);
            
            try {
                const state = window.debugManager.getDebugState();
                console.log('🔍 debugManager state:', state);
            } catch (error) {
                console.log('🔍 Error getting debug state:', error);
            }
        }
        
        // Check navigation manager
        console.log('🔍 window.navigationManager exists:', !!window.navigationManager);
        console.log('🔍 this === window.navigationManager:', this === window.navigationManager);
        
        // Check if setupEventListeners was called
        console.log('🔍 setupEventListeners message should appear in console above');
        
        return {
            buttonExists: !!toggleDebugBtn,
            debugManagerExists: !!window.debugManager,
            navigationManagerExists: !!window.navigationManager,
            buttonDisabled: toggleDebugBtn ? toggleDebugBtn.disabled : null,
            buttonVisible: toggleDebugBtn ? window.getComputedStyle(toggleDebugBtn).display !== 'none' : null
        };
    }
    
    /**
     * DIAGNOSTIC: Force setup debug button
     * SAFETY: Only modifies the debug button, nothing else
     */
    forceSetupDebugButton() {
        console.log('🔍 DIAGNOSTIC: Force Setup Debug Button');
        console.log('=======================================');
        
        const toggleDebugBtn = document.getElementById('toggle-debug-btn');
        if (!toggleDebugBtn) {
            console.error('❌ Button not found!');
            return false;
        }
        
        if (!window.debugManager) {
            console.error('❌ Debug manager not found!');
            return false;
        }
        
        // SAFETY: Remove existing listeners by cloning the button
        const newButton = toggleDebugBtn.cloneNode(true);
        toggleDebugBtn.parentNode.replaceChild(newButton, toggleDebugBtn);
        
        // Add new listener with comprehensive error handling
        newButton.addEventListener('click', (event) => {
            console.log('🔍 FORCE SETUP: Debug button clicked!');
            
            try {
                // Prevent any default behavior
                event.preventDefault();
                event.stopPropagation();
                
                const currentState = window.debugManager.getDebugState();
                const newEnabled = !currentState.enabled;
                
                console.log(`🔍 FORCE SETUP: Toggling from ${currentState.enabled} to ${newEnabled}`);
                window.debugManager.setEnabled(newEnabled);
                
                // Visual feedback with immediate styling
                if (newEnabled) {
                    newButton.classList.add('btn-primary');
                    newButton.classList.remove('btn-secondary');
                    newButton.style.backgroundColor = '#007bff';
                    newButton.style.borderColor = '#007bff';
                    newButton.style.color = 'white';
                } else {
                    newButton.classList.remove('btn-primary');
                    newButton.classList.add('btn-secondary');
                    newButton.style.backgroundColor = '#6c757d';
                    newButton.style.borderColor = '#6c757d';
                    newButton.style.color = 'white';
                }
                
                console.log('✅ FORCE SETUP: Toggle completed successfully');
                
            } catch (error) {
                console.error('❌ FORCE SETUP: Error in toggle:', error);
            }
        });
        
        console.log('✅ FORCE SETUP: Event listener added successfully');
        return true;
    }
}

// Create and export singleton instance
let navigationManager = null;
let initializationPromise = null;

// Initialize navigation manager asynchronously
const initializeNavigationManager = async () => {
    // If already initializing, wait for that to complete
    if (initializationPromise) {
        console.log('⏳ Navigation manager already initializing, waiting...');
        return await initializationPromise;
    }
    
    // If already initialized, return the instance
    if (navigationManager) {
        console.log('✅ Navigation manager already initialized, returning existing instance');
        return navigationManager;
    }
    
    // Start initialization
    console.log('🚀 Starting navigation manager initialization...');
    initializationPromise = (async () => {
        try {
            console.log('🔧 Creating NavigationManager instance...');
            navigationManager = new NavigationManager();
            console.log('✅ NavigationManager instance created');
            
            // Wait for the async initialization to complete
            console.log('🔧 Waiting for API and initialization...');
            await navigationManager.waitForAPIAndInitialize();
            console.log('✅ NavigationManager initialization complete');
            
            // Make navigation manager available globally for debugging
            window.navigationManager = navigationManager;
            console.log('✅ NavigationManager available globally as window.navigationManager');
            
            // SAFETY: Make diagnostic functions available globally
            window.diagnoseDebugButton = () => navigationManager.diagnoseDebugButton();
            window.forceSetupDebugButton = () => navigationManager.forceSetupDebugButton();
            
            console.log('✅ Navigation manager fully initialized and available globally');
            console.log('✅ Debug diagnostic functions available: diagnoseDebugButton(), forceSetupDebugButton()');
            return navigationManager;
        } catch (error) {
            console.error('❌ Navigation manager initialization failed:', error);
            // Reset promise so we can retry
            initializationPromise = null;
            throw error;
        }
    })();
    
    return await initializationPromise;
};

// Start initialization immediately
initializeNavigationManager().catch(error => {
    console.error('❌ Failed to initialize navigation manager:', error);
});

// Export the initialization function for external use
export const getNavigationManager = () => navigationManager;

// Export functions for external use
export const showSection = async (sectionName) => {
    const manager = await initializeNavigationManager();
    return manager.showSection(sectionName);
};

export const showModal = async (modalName) => {
    const manager = await initializeNavigationManager();
    return manager.showModal(modalName);
};

export const hideModal = async (modalName) => {
    const manager = await initializeNavigationManager();
    return manager.hideModal(modalName);
};

export const showLoading = async () => {
    const manager = await initializeNavigationManager();
    return manager.showLoading();
};

export const hideLoading = async () => {
    const manager = await initializeNavigationManager();
    return manager.hideLoading();
};

// Add global test functions for debugging
window.testStateClearing = () => {
    if (window.navigationManager) {
        window.navigationManager.testStateClearing();
    } else {
        console.error('Navigation manager not available');
    }
};

window.emergencyRecovery = () => {
    if (window.navigationManager) {
        window.navigationManager.emergencyStateRecovery();
    } else {
        console.error('Navigation manager not available');
    }
};

window.clearPendingOperations = () => {
    if (window.navigationManager) {
        window.navigationManager.clearPendingOperations();
    } else {
        console.error('Navigation manager not available');
    }
};

console.log('✅ Navigation module loaded');