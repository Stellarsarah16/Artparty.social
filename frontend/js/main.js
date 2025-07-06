/**
 * Main application initialization and event handling
 */

// Application state
let appState = {
    isAuthenticated: false,
    currentUser: null,
    currentCanvas: null,
    currentSection: 'welcome',
    websocket: null,
    onlineUsers: [],
    canvasList: [],
    currentTool: 'paint',
    currentColor: '#000000',
    isLoading: false
};

// DOM elements (initialized after DOM is ready)
let elements = {};

/**
 * Initialize DOM elements after DOM is ready
 */
function initializeElements() {
    elements = {
        // Loading
        loadingScreen: document.getElementById('loading-screen'),
        
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
        editorSection: document.getElementById('editor-section'),
        gallerySection: document.getElementById('gallery-section'),
        
        // Welcome
        getStartedBtn: document.getElementById('get-started-btn'),
        
        // Canvas
        createCanvasBtn: document.getElementById('create-canvas-btn'),
        refreshCanvasesBtn: document.getElementById('refresh-canvases-btn'),
        canvasGrid: document.getElementById('canvas-grid'),
        
        // Editor
        canvasTitle: document.getElementById('canvas-title'),
        canvasUsers: document.getElementById('canvas-users'),
        canvasDimensions: document.getElementById('canvas-dimensions'),
        backToCanvasesBtn: document.getElementById('back-to-canvases-btn'),
        saveTileBtn: document.getElementById('save-tile-btn'),
        
        // Tools
        paintTool: document.getElementById('paint-tool'),
        eraserTool: document.getElementById('eraser-tool'),
        pickerTool: document.getElementById('picker-tool'),
        colorPalette: document.getElementById('color-palette'),
        customColorPicker: document.getElementById('custom-color-picker'),
        
        // Canvas
        pixelCanvas: document.getElementById('pixel-canvas'),
        sharedCanvas: document.getElementById('shared-canvas'),
        miniMapCanvas: document.getElementById('mini-map-canvas'),
        positionIndicator: document.getElementById('position-indicator'),
        
        // Zoom controls
        zoomOutBtn: document.getElementById('zoom-out-btn'),
        zoomInBtn: document.getElementById('zoom-in-btn'),
        zoomLevel: document.getElementById('zoom-level'),
        
        // Online users
        onlineUsersList: document.getElementById('online-users-list'),
        
        // Modals
        loginModal: document.getElementById('login-modal'),
        registerModal: document.getElementById('register-modal'),
        createCanvasModal: document.getElementById('create-canvas-modal'),
        
        // Modal controls
        closeLoginModal: document.getElementById('close-login-modal'),
        closeRegisterModal: document.getElementById('close-register-modal'),
        closeCreateCanvasModal: document.getElementById('close-create-canvas-modal'),
        
        // Forms
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        createCanvasForm: document.getElementById('create-canvas-form'),
        
        // Toast
        toast: document.getElementById('toast')
    };
}

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('🚀 Initializing StellarArtCollab...');
    
    try {
        // Initialize DOM elements first
        initializeElements();
        
        // Check authentication status
        if (CONFIG_UTILS.isAuthenticated()) {
            const userData = CONFIG_UTILS.getUserData();
            if (userData) {
                appState.isAuthenticated = true;
                appState.currentUser = userData;
                updateNavigation();
                showSection('canvas');
                await loadCanvases();
            } else {
                // Token exists but no user data, verify token
                await verifyToken();
            }
        } else {
            showSection('welcome');
        }
        
        // Initialize UI components
        initializeColorPalette();
        initializeEventListeners();
        
        // Hide loading screen
        hideLoading();
        
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showToast('Failed to initialize application', 'error');
        hideLoading();
    }
}

/**
 * Initialize color palette
 */
function initializeColorPalette() {
    if (!elements.colorPalette) return;
    
    elements.colorPalette.innerHTML = '';
    
    APP_CONFIG.PIXEL_EDITOR.DEFAULT_COLORS.forEach(color => {
        const colorSquare = document.createElement('div');
        colorSquare.className = 'color-square';
        colorSquare.style.backgroundColor = color;
        colorSquare.title = color;
        colorSquare.addEventListener('click', () => selectColor(color));
        elements.colorPalette.appendChild(colorSquare);
    });
    
    // Set first color as active
    const firstColor = elements.colorPalette.firstElementChild;
    if (firstColor) {
        firstColor.classList.add('active');
    }
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Navigation events
    elements.loginBtn?.addEventListener('click', () => showModal('login'));
    elements.registerBtn?.addEventListener('click', () => showModal('register'));
    elements.logoutBtn?.addEventListener('click', logout);
    
    // Welcome section events
    elements.getStartedBtn?.addEventListener('click', handleGetStarted);
    
    // Canvas section events
    elements.createCanvasBtn?.addEventListener('click', () => showModal('create-canvas'));
    elements.refreshCanvasesBtn?.addEventListener('click', loadCanvases);
    elements.backToCanvasesBtn?.addEventListener('click', () => showSection('canvas'));
    
    // Modal events
    elements.closeLoginModal?.addEventListener('click', () => hideModal('login'));
    elements.closeRegisterModal?.addEventListener('click', () => hideModal('register'));
    elements.closeCreateCanvasModal?.addEventListener('click', () => hideModal('create-canvas'));
    
    // Form events
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.registerForm?.addEventListener('submit', handleRegister);
    elements.createCanvasForm?.addEventListener('submit', handleCreateCanvas);
    
    // Tool events
    elements.paintTool?.addEventListener('click', () => selectTool('paint'));
    elements.eraserTool?.addEventListener('click', () => selectTool('eraser'));
    elements.pickerTool?.addEventListener('click', () => selectTool('picker'));
    
    // Custom color picker
    elements.customColorPicker?.addEventListener('change', (e) => {
        selectColor(e.target.value);
    });
    
    // Zoom controls
    elements.zoomOutBtn?.addEventListener('click', () => adjustZoom(-0.1));
    elements.zoomInBtn?.addEventListener('click', () => adjustZoom(0.1));
    
    // Canvas events
    if (elements.pixelCanvas) {
        elements.pixelCanvas.addEventListener('mousedown', handleCanvasMouseDown);
        elements.pixelCanvas.addEventListener('mousemove', handleCanvasMouseMove);
        elements.pixelCanvas.addEventListener('mouseup', handleCanvasMouseUp);
        elements.pixelCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    }
    
    // Save tile
    elements.saveTileBtn?.addEventListener('click', handleSaveTile);
    
    // Close modals on outside click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id.replace('-modal', ''));
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Show loading screen
 */
function showLoading() {
    appState.isLoading = true;
    elements.loadingScreen?.classList.remove('fade-out');
}

/**
 * Hide loading screen
 */
function hideLoading() {
    appState.isLoading = false;
    setTimeout(() => {
        elements.loadingScreen?.classList.add('fade-out');
    }, 500);
}

/**
 * Show a specific section
 * @param {string} sectionName - Name of section to show
 */
function showSection(sectionName) {
    // Hide all sections
    Object.values(elements).forEach(element => {
        if (element && element.classList.contains('welcome-section') ||
            element.classList.contains('canvas-section') ||
            element.classList.contains('editor-section') ||
            element.classList.contains('gallery-section')) {
            element.classList.add('hidden');
        }
    });
    
    // Show target section
    const targetSection = elements[sectionName + 'Section'];
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('animate-fade-in');
        appState.currentSection = sectionName;
    }
    
    console.log(`📄 Showing section: ${sectionName}`);
}

/**
 * Show modal
 * @param {string} modalName - Name of modal to show
 */
function showModal(modalName) {
    const modal = elements[modalName + 'Modal'];
    if (modal) {
        modal.classList.add('active');
        
        // Focus first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Hide modal
 * @param {string} modalName - Name of modal to hide
 */
function hideModal(modalName) {
    const modal = elements[modalName + 'Modal'];
    if (modal) {
        modal.classList.remove('active');
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

/**
 * Update navigation based on authentication state
 */
function updateNavigation() {
    if (appState.isAuthenticated && appState.currentUser) {
        elements.loginBtn?.classList.add('hidden');
        elements.registerBtn?.classList.add('hidden');
        elements.userInfo?.classList.remove('hidden');
        
        if (elements.username) {
            elements.username.textContent = appState.currentUser.username;
        }
    } else {
        elements.loginBtn?.classList.remove('hidden');
        elements.registerBtn?.classList.remove('hidden');
        elements.userInfo?.classList.add('hidden');
    }
}

/**
 * Handle get started button click
 */
async function handleGetStarted() {
    if (appState.isAuthenticated) {
        showSection('canvas');
        await loadCanvases();
    } else {
        showModal('login');
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submission event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const username = formData.get('username') || document.getElementById('login-username').value;
    const password = formData.get('password') || document.getElementById('login-password').value;
    
    if (!username || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.LOGIN), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store auth data
            CONFIG_UTILS.setAuthToken(data.access_token);
            CONFIG_UTILS.setUserData(data.user);
            
            // Update app state
            appState.isAuthenticated = true;
            appState.currentUser = data.user;
            
            // Update UI
            updateNavigation();
            hideModal('login');
            showSection('canvas');
            await loadCanvases();
            
            showToast(APP_CONFIG.SUCCESS.LOGIN, 'success');
        } else {
            showToast(data.detail || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast(APP_CONFIG.ERRORS.NETWORK_ERROR, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle user registration
 */
async function handleRegister(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearFormErrors('register-form');
    
    const formData = new FormData(e.target);
    const username = (formData.get('username') || document.getElementById('register-username').value || '').trim();
    const email = (formData.get('email') || document.getElementById('register-email').value || '').trim();
    const firstName = (formData.get('first_name') || document.getElementById('register-first-name').value || '').trim();
    const lastName = (formData.get('last_name') || document.getElementById('register-last-name').value || '').trim();
    const password = formData.get('password') || document.getElementById('register-password').value || '';
    const confirmPassword = formData.get('confirm_password') || document.getElementById('register-confirm-password').value || '';
    
    // Client-side validation
    const validationErrors = validateRegistrationForm({
        username, email, firstName, lastName, password, confirmPassword
    });
    
    if (validationErrors.length > 0) {
        displayFormErrors(validationErrors);
        return;
    }
    
    // Disable form during submission
    const submitButton = document.querySelector('#register-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    setFormLoading(true, submitButton, 'Creating Account...');
    
    try {
        const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.REGISTER), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username, 
                email, 
                password, 
                first_name: firstName,
                last_name: lastName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store auth data
            CONFIG_UTILS.setAuthToken(data.access_token);
            CONFIG_UTILS.setUserData(data.user);
            
            // Update app state
            appState.isAuthenticated = true;
            appState.currentUser = data.user;
            
            // Update UI
            updateNavigation();
            hideModal('register');
            showSection('canvas');
            await loadCanvases();
            
            showToast(`Welcome, ${data.user.first_name}! Your account has been created successfully.`, 'success');
        } else {
            handleRegistrationError(response.status, data);
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('Unable to connect to the server. Please check your internet connection and try again.', 'error');
        } else {
            showToast('An unexpected error occurred. Please try again later.', 'error');
        }
    } finally {
        setFormLoading(false, submitButton, originalButtonText);
    }
}

/**
 * Validate registration form data
 */
function validateRegistrationForm(data) {
    const errors = [];
    
    // Username validation
    if (!data.username) {
        errors.push({ field: 'username', message: 'Username is required' });
    } else if (data.username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters long' });
    } else if (data.username.length > 50) {
        errors.push({ field: 'username', message: 'Username must be less than 50 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }
    
    // Email validation
    if (!data.email) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    } else if (data.email.length > 100) {
        errors.push({ field: 'email', message: 'Email address is too long' });
    }
    
    // First name validation
    if (!data.firstName) {
        errors.push({ field: 'first_name', message: 'First name is required' });
    } else if (data.firstName.length > 50) {
        errors.push({ field: 'first_name', message: 'First name must be less than 50 characters' });
    } else if (!/^[a-zA-Z\s\-']+$/.test(data.firstName)) {
        errors.push({ field: 'first_name', message: 'First name can only contain letters, spaces, hyphens, and apostrophes' });
    }
    
    // Last name validation
    if (!data.lastName) {
        errors.push({ field: 'last_name', message: 'Last name is required' });
    } else if (data.lastName.length > 50) {
        errors.push({ field: 'last_name', message: 'Last name must be less than 50 characters' });
    } else if (!/^[a-zA-Z\s\-']+$/.test(data.lastName)) {
        errors.push({ field: 'last_name', message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' });
    }
    
    // Password validation
    if (!data.password) {
        errors.push({ field: 'password', message: 'Password is required' });
    } else if (data.password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
    } else if (data.password.length > 128) {
        errors.push({ field: 'password', message: 'Password is too long (maximum 128 characters)' });
    } else {
        // Check password strength
        if (!/[a-z]/.test(data.password)) {
            errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[A-Z0-9]/.test(data.password)) {
            errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter or number' });
        }
        const weakPasswords = ['password', '12345678', 'qwerty123', 'abc12345'];
        if (weakPasswords.includes(data.password.toLowerCase())) {
            errors.push({ field: 'password', message: 'Password is too common, please choose a stronger password' });
        }
    }
    
    // Confirm password validation
    if (!data.confirmPassword) {
        errors.push({ field: 'confirm_password', message: 'Please confirm your password' });
    } else if (data.password !== data.confirmPassword) {
        errors.push({ field: 'confirm_password', message: 'Passwords do not match' });
    }
    
    return errors;
}

/**
 * Handle registration error responses
 */
function handleRegistrationError(status, data) {
    let errorMessage = 'Registration failed';
    
    switch (status) {
        case 400:
            errorMessage = data.detail || 'Invalid registration data';
            break;
        case 422:
            // Handle validation errors
            if (data.detail && Array.isArray(data.detail)) {
                const fieldErrors = data.detail.map(error => ({
                    field: error.loc[error.loc.length - 1],
                    message: error.msg
                }));
                displayFormErrors(fieldErrors);
                return;
            } else if (data.detail && typeof data.detail === 'string') {
                errorMessage = data.detail;
            } else {
                errorMessage = 'Please check your form data and try again';
            }
            break;
        case 409:
            errorMessage = 'Username or email already exists';
            break;
        case 429:
            errorMessage = 'Too many registration attempts. Please try again later.';
            break;
        case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        default:
            errorMessage = data.detail || `Registration failed (Error ${status})`;
    }
    
    showToast(errorMessage, 'error');
}

/**
 * Display form validation errors
 */
function displayFormErrors(errors) {
    errors.forEach(error => {
        const field = document.getElementById(`register-${error.field.replace('_', '-')}`);
        if (field) {
            showFieldError(field, error.message);
        }
    });
    
    // Show general error message if multiple fields have errors
    if (errors.length > 1) {
        showToast('Please correct the errors in the form', 'error');
    }
}

/**
 * Show error for specific field
 */
function showFieldError(field, message) {
    // Remove existing error
    clearFieldError(field);
    
    // Add error class
    field.classList.add('error');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    // Insert error message after the field
    field.parentNode.insertBefore(errorElement, field.nextSibling);
}

/**
 * Clear error for specific field
 */
function clearFieldError(field) {
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Clear all form errors
 */
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        form.querySelectorAll('.field-error').forEach(errorElement => {
            errorElement.remove();
        });
    }
}

/**
 * Set form loading state
 */
function setFormLoading(isLoading, submitButton, loadingText) {
    const form = submitButton.closest('form');
    const inputs = form.querySelectorAll('input, button');
    
    if (isLoading) {
        inputs.forEach(input => input.disabled = true);
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        submitButton.classList.add('loading');
    } else {
        inputs.forEach(input => input.disabled = false);
        submitButton.classList.remove('loading');
    }
}

/**
 * Handle logout
 */
async function logout() {
    try {
        // Clear auth data
        CONFIG_UTILS.removeAuthToken();
        CONFIG_UTILS.removeUserData();
        
        // Update app state
        appState.isAuthenticated = false;
        appState.currentUser = null;
        appState.currentCanvas = null;
        
        // Disconnect WebSocket
        if (appState.websocket) {
            appState.websocket.close();
            appState.websocket = null;
        }
        
        // Update UI
        updateNavigation();
        showSection('welcome');
        
        showToast(APP_CONFIG.SUCCESS.LOGOUT, 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

/**
 * Verify authentication token
 */
async function verifyToken() {
    try {
        const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.ME), {
            headers: CONFIG_UTILS.getAuthHeaders()
        });
        
        if (response.ok) {
            const userData = await response.json();
            CONFIG_UTILS.setUserData(userData);
            appState.isAuthenticated = true;
            appState.currentUser = userData;
            updateNavigation();
        } else {
            // Token is invalid
            CONFIG_UTILS.removeAuthToken();
            CONFIG_UTILS.removeUserData();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        CONFIG_UTILS.removeAuthToken();
        CONFIG_UTILS.removeUserData();
    }
}

/**
 * Load canvases
 */
async function loadCanvases() {
    try {
        showLoading();
        const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.CANVAS), {
            headers: CONFIG_UTILS.getAuthHeaders()
        });
        
        if (response.ok) {
            const canvases = await response.json();
            appState.canvasList = canvases;
            displayCanvases(canvases);
        } else {
            showToast(APP_CONFIG.ERRORS.CANVAS_LOAD_ERROR, 'error');
        }
    } catch (error) {
        console.error('Load canvases error:', error);
        showToast(APP_CONFIG.ERRORS.NETWORK_ERROR, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Display canvases in the grid
 * @param {Array} canvases - Array of canvas objects
 */
function displayCanvases(canvases) {
    if (!elements.canvasGrid) return;
    
    elements.canvasGrid.innerHTML = '';
    
    if (canvases.length === 0) {
        elements.canvasGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-canvas"></i>
                <h3>No canvases yet</h3>
                <p>Create your first canvas to get started!</p>
            </div>
        `;
        return;
    }
    
    canvases.forEach(canvas => {
        const canvasCard = document.createElement('div');
        canvasCard.className = 'canvas-card';
        canvasCard.innerHTML = `
            <div class="canvas-card-header">
                <h3 class="canvas-card-title">${canvas.title}</h3>
                <p class="canvas-card-description">${canvas.description || 'No description'}</p>
            </div>
            <div class="canvas-card-stats">
                <div class="canvas-stat">
                    <i class="fas fa-users"></i>
                    <span>${canvas.active_users || 0} users</span>
                </div>
                <div class="canvas-stat">
                    <i class="fas fa-th"></i>
                    <span>${canvas.tile_count || 0} tiles</span>
                </div>
                <div class="canvas-stat">
                    <i class="fas fa-expand"></i>
                    <span>${canvas.width}x${canvas.height}</span>
                </div>
            </div>
        `;
        
        canvasCard.addEventListener('click', () => openCanvas(canvas));
        elements.canvasGrid.appendChild(canvasCard);
    });
}

/**
 * Open canvas for editing
 * @param {Object} canvas - Canvas object
 */
async function openCanvas(canvas) {
    try {
        appState.currentCanvas = canvas;
        
        // Update editor UI
        if (elements.canvasTitle) {
            elements.canvasTitle.textContent = canvas.title;
        }
        if (elements.canvasDimensions) {
            elements.canvasDimensions.textContent = `${canvas.width}x${canvas.height}`;
        }
        
        // Show editor
        showSection('editor');
        
        // Initialize pixel editor
        if (window.PixelEditor) {
            window.PixelEditor.init(elements.pixelCanvas);
        }
        
        // Connect to WebSocket
        await connectToCanvas(canvas.id);
        
        console.log(`🎨 Opened canvas: ${canvas.title}`);
    } catch (error) {
        console.error('Open canvas error:', error);
        showToast('Failed to open canvas', 'error');
    }
}

/**
 * Connect to canvas WebSocket
 * @param {number} canvasId - Canvas ID
 */
async function connectToCanvas(canvasId) {
    try {
        const token = CONFIG_UTILS.getAuthToken();
        if (!token) {
            showToast(APP_CONFIG.ERRORS.AUTH_ERROR, 'error');
            return;
        }
        
        const wsUrl = CONFIG_UTILS.getWsUrl(canvasId, token);
        
        if (appState.websocket) {
            appState.websocket.close();
        }
        
        appState.websocket = new WebSocket(wsUrl);
        
        appState.websocket.onopen = () => {
            console.log('🔗 WebSocket connected');
            showToast('Connected to canvas', 'success');
        };
        
        appState.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        };
        
        appState.websocket.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            showToast('Disconnected from canvas', 'warning');
        };
        
        appState.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            showToast(APP_CONFIG.ERRORS.WEBSOCKET_ERROR, 'error');
        };
        
    } catch (error) {
        console.error('WebSocket connection error:', error);
        showToast(APP_CONFIG.ERRORS.WEBSOCKET_ERROR, 'error');
    }
}

/**
 * Handle WebSocket message
 * @param {Object} message - WebSocket message
 */
function handleWebSocketMessage(message) {
    console.log('📨 WebSocket message:', message);
    
    switch (message.type) {
        case WS_CONFIG.MESSAGE_TYPES.CANVAS_STATE:
            updateOnlineUsers(message.active_users);
            break;
        case WS_CONFIG.MESSAGE_TYPES.USER_JOINED:
            addOnlineUser(message);
            break;
        case WS_CONFIG.MESSAGE_TYPES.USER_LEFT:
            removeOnlineUser(message.user_id);
            break;
        case WS_CONFIG.MESSAGE_TYPES.TILE_CREATED:
            handleTileCreated(message);
            break;
        case WS_CONFIG.MESSAGE_TYPES.TILE_UPDATED:
            handleTileUpdated(message);
            break;
        case WS_CONFIG.MESSAGE_TYPES.TILE_DELETED:
            handleTileDeleted(message);
            break;
        case WS_CONFIG.MESSAGE_TYPES.TILE_LIKED:
            handleTileLiked(message);
            break;
        case WS_CONFIG.MESSAGE_TYPES.TILE_UNLIKED:
            handleTileUnliked(message);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

/**
 * Update online users display
 * @param {Array} users - Array of user objects
 */
function updateOnlineUsers(users) {
    if (!elements.onlineUsersList) return;
    
    elements.onlineUsersList.innerHTML = '';
    
    if (elements.canvasUsers) {
        elements.canvasUsers.textContent = `${users.length} users online`;
    }
    
    users.forEach(user => {
        const userChip = document.createElement('div');
        userChip.className = 'user-chip';
        userChip.innerHTML = `
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <span>${user.username}</span>
        `;
        elements.onlineUsersList.appendChild(userChip);
    });
    
    appState.onlineUsers = users;
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    if (!elements.toast) return;
    
    const toast = elements.toast;
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    if (toastMessage) {
        toastMessage.textContent = message;
    }
    
    // Set icon based on type
    if (toastIcon) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
    }
    
    // Set toast class
    toast.className = `toast ${type} show`;
    
    // Auto hide after duration
    setTimeout(() => {
        toast.classList.remove('show');
    }, APP_CONFIG.UI.TOAST_DURATION);
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            const modalName = activeModal.id.replace('-modal', '');
            hideModal(modalName);
        }
    }
    
    // Tool shortcuts (only in editor)
    if (appState.currentSection === 'editor') {
        switch (e.key) {
            case 'b':
                selectTool('paint');
                break;
            case 'e':
                selectTool('eraser');
                break;
            case 'p':
                selectTool('picker');
                break;
        }
    }
}

/**
 * Select tool
 * @param {string} tool - Tool name
 */
function selectTool(tool) {
    appState.currentTool = tool;
    
    // Update tool button states
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const toolButton = elements[tool + 'Tool'];
    if (toolButton) {
        toolButton.classList.add('active');
    }
    
    console.log(`🛠️ Selected tool: ${tool}`);
}

/**
 * Select color
 * @param {string} color - Color hex code
 */
function selectColor(color) {
    appState.currentColor = color;
    
    // Update color square states
    document.querySelectorAll('.color-square').forEach(square => {
        square.classList.remove('active');
    });
    
    const colorSquare = document.querySelector(`[style*="${color}"]`);
    if (colorSquare) {
        colorSquare.classList.add('active');
    }
    
    // Update custom color picker
    if (elements.customColorPicker) {
        elements.customColorPicker.value = color;
    }
    
    console.log(`🎨 Selected color: ${color}`);
}

// Placeholder functions for canvas interactions
function handleCanvasMouseDown(e) {
    console.log('Canvas mouse down:', e);
}

function handleCanvasMouseMove(e) {
    // Update position indicator
    if (elements.positionIndicator) {
        const rect = elements.pixelCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / 16);
        const y = Math.floor((e.clientY - rect.top) / 16);
        elements.positionIndicator.textContent = `Position: (${x}, ${y})`;
    }
}

function handleCanvasMouseUp(e) {
    console.log('Canvas mouse up:', e);
}

function handleCanvasMouseLeave(e) {
    console.log('Canvas mouse leave:', e);
}

function handleSaveTile() {
    console.log('Save tile clicked');
    showToast('Tile saved successfully!', 'success');
}

async function handleCreateCanvas(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const canvasData = {
        name: formData.get('name'),
        description: formData.get('description'),
        width: parseInt(formData.get('width')) || 1024,
        height: parseInt(formData.get('height')) || 1024,
        tile_size: parseInt(formData.get('tile_size')) || 32,
        max_tiles_per_user: parseInt(formData.get('max_tiles_per_user')) || 5
    };
    
    try {
        const response = await API.canvas.create(canvasData);
        
        // Check if response is successful (might be different structure)
        if (response && !response.error) {
            hideModal('create-canvas');
            showToast('Canvas created successfully!', 'success');
            await loadCanvases(); // Reload the canvas list
        } else {
            showToast('Failed to create canvas', 'error');
        }
    } catch (error) {
        console.error('Create canvas error:', error);
        showToast('Failed to create canvas', 'error');
    }
}

function adjustZoom(delta) {
    console.log('Adjust zoom:', delta);
}

function addOnlineUser(user) {
    console.log('User joined:', user);
}

function removeOnlineUser(userId) {
    console.log('User left:', userId);
}

function handleTileCreated(message) {
    console.log('Tile created:', message);
}

function handleTileUpdated(message) {
    console.log('Tile updated:', message);
}

function handleTileDeleted(message) {
    console.log('Tile deleted:', message);
}

function handleTileLiked(message) {
    console.log('Tile liked:', message);
}

function handleTileUnliked(message) {
    console.log('Tile unliked:', message);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for other modules
window.StellarArtCollab = {
    appState,
    elements,
    showSection,
    showModal,
    hideModal,
    showToast,
    selectTool,
    selectColor
}; 