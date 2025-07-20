/**
 * User Interface Management
 * Handles all UI components, forms, modals, and user interactions
 */

class UIManager {
    constructor() {
        this.activeModals = new Set();
        this.toastQueue = [];
        this.isShowingToast = false;
        this.formValidators = {};
        this.animationDuration = APP_CONFIG.UI.ANIMATION_DURATION;
        this.toastDuration = APP_CONFIG.UI.TOAST_DURATION;
        
        // UI state
        this.theme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || 'light';
        this.sidebarCollapsed = false;
        this.notifications = [];
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    /**
     * Initialize UI manager
     */
    init() {
        this.setupFormValidation();
        this.setupTooltips();
        this.setupKeyboardShortcuts();
        this.setupTheme();
        this.setupResponsive();
        this.setupAccessibility();
        
        console.log('✅ UI Manager initialized');
    }
    
    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Setup form validation
     */
    setupFormValidation() {
        // Login form validation
        this.formValidators.login = {
            username: {
                required: true,
                minLength: 3,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Username must be at least 3 characters and contain only letters, numbers, and underscores'
            },
            password: {
                required: true,
                minLength: 6,
                message: 'Password must be at least 6 characters'
            }
        };
        
        // Register form validation
        this.formValidators.register = {
            username: {
                required: true,
                minLength: 3,
                maxLength: 30,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            password: {
                required: true,
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
            },
            display_name: {
                maxLength: 50,
                message: 'Display name must be less than 50 characters'
            }
        };
        
        // Canvas creation form validation
        this.formValidators.createCanvas = {
            title: {
                required: true,
                minLength: 3,
                maxLength: 100,
                message: 'Canvas title must be 3-100 characters'
            },
            description: {
                maxLength: 500,
                message: 'Description must be less than 500 characters'
            },
            width: {
                required: true,
                min: 512,
                max: 4096,
                message: 'Width must be between 512 and 4096 pixels'
            },
            height: {
                required: true,
                min: 512,
                max: 4096,
                message: 'Height must be between 512 and 4096 pixels'
            },
            max_tiles_per_user: {
                required: true,
                min: 1,
                max: 100,
                message: 'Max tiles per user must be between 1 and 100'
            }
        };
        
        // Add real-time validation to forms
        this.setupRealTimeValidation();
    }
    
    /**
     * Setup real-time form validation
     */
    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const formId = form.id.replace('-form', '');
            const validator = this.formValidators[formId];
            
            if (!validator) return;
            
            Object.keys(validator).forEach(fieldName => {
                const field = form.querySelector(`#${formId}-${fieldName}`) || 
                             form.querySelector(`[name="${fieldName}"]`);
                
                if (field) {
                    // Add validation on blur and input
                    field.addEventListener('blur', () => this.validateField(field, validator[fieldName]));
                    field.addEventListener('input', this.debounce(
                        () => this.validateField(field, validator[fieldName]), 
                        APP_CONFIG.UI.DEBOUNCE_DELAY
                    ));
                }
            });
            
            // Validate entire form on submit
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form, validator)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        });
    }
    
    /**
     * Validate a single field
     * @param {HTMLElement} field - Form field element
     * @param {Object} rules - Validation rules
     * @returns {boolean} Is valid
     */
    validateField(field, rules) {
        const value = field.value.trim();
        const errors = [];
        
        // Required validation
        if (rules.required && !value) {
            errors.push('This field is required');
        }
        
        // Only validate other rules if field has value
        if (value) {
            // Length validation
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`Minimum ${rules.minLength} characters required`);
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`Maximum ${rules.maxLength} characters allowed`);
            }
            
            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(rules.message || 'Invalid format');
            }
            
            // Numeric validation
            if (rules.min !== undefined) {
                const num = Number(value);
                if (isNaN(num) || num < rules.min) {
                    errors.push(`Minimum value is ${rules.min}`);
                }
            }
            
            if (rules.max !== undefined) {
                const num = Number(value);
                if (isNaN(num) || num > rules.max) {
                    errors.push(`Maximum value is ${rules.max}`);
                }
            }
        }
        
        // Display validation result
        this.displayFieldValidation(field, errors);
        
        return errors.length === 0;
    }
    
    /**
     * Validate entire form
     * @param {HTMLFormElement} form - Form element
     * @param {Object} validator - Form validator
     * @returns {boolean} Is valid
     */
    validateForm(form, validator) {
        let isValid = true;
        
        Object.keys(validator).forEach(fieldName => {
            const field = form.querySelector(`#${form.id.replace('-form', '')}-${fieldName}`) ||
                         form.querySelector(`[name="${fieldName}"]`);
            
            if (field) {
                const fieldValid = this.validateField(field, validator[fieldName]);
                if (!fieldValid) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }
    
    /**
     * Display field validation result
     * @param {HTMLElement} field - Form field
     * @param {Array} errors - Array of error messages
     */
    displayFieldValidation(field, errors) {
        // Remove existing validation classes and messages
        field.classList.remove('invalid', 'valid');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        if (errors.length > 0) {
            // Field is invalid
            field.classList.add('invalid');
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = errors[0]; // Show first error
            field.parentNode.appendChild(errorDiv);
        } else if (field.value.trim()) {
            // Field is valid and has value
            field.classList.add('valid');
        }
    }
    
    /**
     * Setup tooltips
     */
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');
        
        tooltipElements.forEach(element => {
            this.createTooltip(element);
        });
    }
    
    /**
     * Create tooltip for element
     * @param {HTMLElement} element - Element to add tooltip to
     */
    createTooltip(element) {
        const title = element.getAttribute('title');
        if (!title) return;
        
        // Remove default title to prevent browser tooltip
        element.removeAttribute('title');
        
        let tooltip = null;
        
        element.addEventListener('mouseenter', () => {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            
            // Show tooltip with animation
            requestAnimationFrame(() => {
                tooltip.classList.add('show');
            });
        });
        
        element.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.classList.remove('show');
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        document.body.removeChild(tooltip);
                    }
                }, this.animationDuration);
            }
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Global shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.showCommandPalette();
                        break;
                    case '/':
                        e.preventDefault();
                        this.showHelp();
                        break;
                }
            }
            
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
            
            // Tab navigation in modals
            if (e.key === 'Tab' && this.activeModals.size > 0) {
                this.handleModalTabNavigation(e);
            }
        });
    }
    
    /**
     * Setup theme system
     */
    setupTheme() {
        // Apply saved theme
        document.body.classList.add(`theme-${this.theme}`);
        
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Respect system preference if no saved theme
        if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME)) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                this.setTheme('dark');
            }
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME)) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    /**
     * Setup responsive behavior
     */
    setupResponsive() {
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('mobile-open');
                mobileMenuToggle.classList.toggle('active');
            });
        }
        
        // Responsive breakpoint handler
        const breakpointWatcher = window.matchMedia('(max-width: 768px)');
        this.handleBreakpointChange(breakpointWatcher);
        breakpointWatcher.addEventListener('change', (e) => this.handleBreakpointChange(e));
    }
    
    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Focus management for modals
        this.setupModalFocusManagement();
        
        // Skip links
        this.setupSkipLinks();
        
        // ARIA labels and descriptions
        this.setupAriaLabels();
        
        // High contrast mode detection
        this.setupHighContrastMode();
    }
    
    /**
     * Show modal
     * @param {string} modalId - Modal ID
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        const modal = document.getElementById(`${modalId}-modal`);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }
        
        // Store currently focused element
        modal.dataset.previousFocus = document.activeElement.id || '';
        
        // Add to active modals
        this.activeModals.add(modalId);
        
        // Show modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus first focusable element
        setTimeout(() => {
            const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
        
        // Add backdrop click handler
        modal.addEventListener('click', this.handleModalBackdropClick);
        
        // Trigger callback
        if (options.onShow) {
            options.onShow(modal);
        }
        
        console.log(`📱 Modal ${modalId} shown`);
    }
    
    /**
     * Hide modal
     * @param {string} modalId - Modal ID
     * @param {Object} options - Modal options
     */
    hideModal(modalId, options = {}) {
        const modal = document.getElementById(`${modalId}-modal`);
        if (!modal) return;
        
        // Remove from active modals
        this.activeModals.delete(modalId);
        
        // Hide modal
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        
        // Restore focus
        const previousFocusId = modal.dataset.previousFocus;
        if (previousFocusId) {
            const previousElement = document.getElementById(previousFocusId);
            if (previousElement) {
                previousElement.focus();
            }
        }
        
        // Reset form if it exists
        const form = modal.querySelector('form');
        if (form) {
            this.resetForm(form);
        }
        
        // Remove backdrop click handler
        modal.removeEventListener('click', this.handleModalBackdropClick);
        
        // Trigger callback
        if (options.onHide) {
            options.onHide(modal);
        }
        
        console.log(`📱 Modal ${modalId} hidden`);
    }
    
    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {Object} options - Toast options
     */
    showToast(message, type = 'info', options = {}) {
        const toast = {
            id: CONFIG_UTILS.generateUuid(),
            message,
            type,
            duration: options.duration || this.toastDuration,
            actions: options.actions || []
        };
        
        this.toastQueue.push(toast);
        
        if (!this.isShowingToast) {
            this.processToastQueue();
        }
    }
    
    /**
     * Process toast queue
     */
    processToastQueue() {
        if (this.toastQueue.length === 0) {
            this.isShowingToast = false;
            return;
        }
        
        this.isShowingToast = true;
        const toast = this.toastQueue.shift();
        
        this.displayToast(toast);
    }
    
    /**
     * Display toast notification
     * @param {Object} toast - Toast object
     */
    displayToast(toast) {
        const toastElement = document.getElementById('toast');
        if (!toastElement) {
            console.error('Toast container not found');
            return;
        }
        
        // Set toast content
        const messageElement = toastElement.querySelector('.toast-message');
        const iconElement = toastElement.querySelector('.toast-icon');
        
        if (messageElement) {
            messageElement.textContent = toast.message;
        }
        
        if (iconElement) {
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            iconElement.className = `toast-icon ${icons[toast.type] || icons.info}`;
        }
        
        // Set toast class
        toastElement.className = `toast ${toast.type} show`;
        
        // Add actions if any
        this.addToastActions(toastElement, toast.actions);
        
        // Auto hide
        setTimeout(() => {
            toastElement.classList.remove('show');
            
            setTimeout(() => {
                this.processToastQueue();
            }, this.animationDuration);
        }, toast.duration);
        
        console.log(`🍞 Toast shown: ${toast.message}`);
    }
    
    /**
     * Add actions to toast
     * @param {HTMLElement} toastElement - Toast element
     * @param {Array} actions - Array of action objects
     */
    addToastActions(toastElement, actions) {
        // Remove existing actions
        const existingActions = toastElement.querySelector('.toast-actions');
        if (existingActions) {
            existingActions.remove();
        }
        
        if (actions.length === 0) return;
        
        // Create actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'toast-actions';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `btn btn-sm ${action.style || 'btn-secondary'}`;
            button.textContent = action.text;
            button.addEventListener('click', () => {
                if (action.onClick) {
                    action.onClick();
                }
                toastElement.classList.remove('show');
            });
            
            actionsContainer.appendChild(button);
        });
        
        toastElement.appendChild(actionsContainer);
    }
    
    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} User confirmation
     */
    showConfirmationDialog(title, message, options = {}) {
        return new Promise((resolve) => {
            // Create dialog element
            const dialog = document.createElement('div');
            dialog.className = 'modal confirmation-dialog active';
            dialog.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">
                            ${options.cancelText || 'Cancel'}
                        </button>
                        <button class="btn btn-primary confirm-btn">
                            ${options.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            `;
            
            // Add to page
            document.body.appendChild(dialog);
            
            // Add event listeners
            const cancelBtn = dialog.querySelector('.cancel-btn');
            const confirmBtn = dialog.querySelector('.confirm-btn');
            
            const cleanup = () => {
                dialog.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(dialog);
                }, this.animationDuration);
            };
            
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });
            
            // Close on backdrop click
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    cleanup();
                    resolve(false);
                }
            });
            
            // Focus confirm button
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }
    
    /**
     * Reset form
     * @param {HTMLFormElement} form - Form to reset
     */
    resetForm(form) {
        form.reset();
        
        // Remove validation classes and messages
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.classList.remove('invalid', 'valid');
        });
        
        const errors = form.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
    
    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
        document.body.classList.remove(`theme-${this.theme}`);
        document.body.classList.add(`theme-${theme}`);
        
        this.theme = theme;
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, theme);
        
        console.log(`🎨 Theme changed to: ${theme}`);
    }
    
    /**
     * Handle modal backdrop click
     * @param {Event} e - Click event
     */
    handleModalBackdropClick(e) {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id.replace('-modal', '');
            this.hideModal(modalId);
        }
    }
    
    /**
     * Close top modal
     */
    closeTopModal() {
        if (this.activeModals.size > 0) {
            const topModal = Array.from(this.activeModals).pop();
            this.hideModal(topModal);
        }
    }
    
    /**
     * Handle modal tab navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleModalTabNavigation(e) {
        const topModalId = Array.from(this.activeModals).pop();
        const modal = document.getElementById(`${topModalId}-modal`);
        
        if (!modal) return;
        
        const focusableElements = modal.querySelectorAll(
            'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * Handle breakpoint changes
     * @param {MediaQueryListEvent} e - Media query event
     */
    handleBreakpointChange(e) {
        if (e.matches) {
            // Mobile breakpoint
            document.body.classList.add('mobile');
        } else {
            // Desktop breakpoint
            document.body.classList.remove('mobile');
            
            // Close mobile menu if open
            const navMenu = document.getElementById('nav-menu');
            if (navMenu) {
                navMenu.classList.remove('mobile-open');
            }
        }
    }
    
    /**
     * Setup modal focus management
     */
    setupModalFocusManagement() {
        // Implementation for modal focus trapping
        console.log('Modal focus management set up');
    }
    
    /**
     * Setup skip links
     */
    setupSkipLinks() {
        // Implementation for accessibility skip links
        console.log('Skip links set up');
    }
    
    /**
     * Setup ARIA labels
     */
    setupAriaLabels() {
        // Implementation for ARIA labels and descriptions
        console.log('ARIA labels set up');
    }
    
    /**
     * Setup high contrast mode
     */
    setupHighContrastMode() {
        // Detect high contrast mode
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
    }
    
    /**
     * Show command palette
     */
    showCommandPalette() {
        console.log('Command palette (not yet implemented)');
    }
    
    /**
     * Show help
     */
    showHelp() {
        this.showToast('Keyboard shortcuts: Ctrl+K for commands, Esc to close modals', 'info', {
            duration: 5000
        });
    }
    
    /**
     * Update loading state
     * @param {boolean} isLoading - Loading state
     * @param {string} message - Loading message
     */
    updateLoadingState(isLoading, message = 'Loading...') {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingMessage = loadingScreen?.querySelector('p');
        
        if (loadingScreen) {
            if (isLoading) {
                loadingScreen.classList.remove('fade-out');
                if (loadingMessage) {
                    loadingMessage.textContent = message;
                }
            } else {
                setTimeout(() => {
                    loadingScreen.classList.add('fade-out');
                }, 500);
            }
        }
    }
    
    /**
     * Get UI statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            activeModals: Array.from(this.activeModals),
            theme: this.theme,
            toastQueueLength: this.toastQueue.length,
            isShowingToast: this.isShowingToast
        };
    }

    /**
     * Color Palette Management
     */
    colorPalettes = {
        // Classic pixel art palette (8 colors)
        classic: [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', 
            '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'
        ],
        
        // Earth tones palette
        earth: [
            '#8B4513', '#D2691E', '#CD853F', '#DEB887',
            '#F4A460', '#D2B48C', '#BC8F8F', '#A0522D'
        ],
        
        // Pastel palette
        pastel: [
            '#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD',
            '#F0E68C', '#FFA07A', '#B0E0E6', '#FFC0CB'
        ],
        
        // Monochrome palette
        monochrome: [
            '#000000', '#333333', '#666666', '#999999',
            '#CCCCCC', '#FFFFFF', '#E6E6E6', '#B3B3B3'
        ],
        
        // Neon palette
        neon: [
            '#FF0080', '#00FF80', '#0080FF', '#FFFF00',
            '#FF8000', '#8000FF', '#00FFFF', '#FF0080'
        ],
        
        // Retro gaming palette
        retro: [
            '#0F380F', '#306230', '#8BAC0F', '#9BBC0F',
            '#306230', '#8BAC0F', '#9BBC0F', '#306230'
        ]
    };

    /**
     * Initialize color palette
     */
    initColorPalette() {
        const paletteContainer = document.getElementById('color-palette');
        if (!paletteContainer) {
            console.warn('Color palette container not found');
            return;
        }

        // Get palette from current canvas
        const currentCanvas = appState.get('currentCanvas');
        const paletteType = currentCanvas?.palette_type || 'classic';
        
        this.currentPalette = paletteType;
        this.generateColorPalette(this.currentPalette);
    }

    /**
     * Generate color palette in the UI
     */
    generateColorPalette(paletteName = 'classic') {
        const paletteContainer = document.getElementById('color-palette');
        if (!paletteContainer) return;

        const colors = this.colorPalettes[paletteName] || this.colorPalettes.classic;
        
        paletteContainer.innerHTML = '';
        
        colors.forEach(color => {
            const colorSquare = document.createElement('div');
            colorSquare.className = 'color-square';
            colorSquare.style.backgroundColor = color;
            colorSquare.setAttribute('data-color', color);
            colorSquare.title = color;
            
            colorSquare.addEventListener('click', () => {
                this.selectColor(color);
            });
            
            paletteContainer.appendChild(colorSquare);
        });

        // Select first color by default
        if (colors.length > 0) {
            this.selectColor(colors[0]);
        }
    }



    /**
     * Select a color
     */
    selectColor(color) {
        // Update active color square
        const colorSquares = document.querySelectorAll('.color-square');
        colorSquares.forEach(square => {
            square.classList.remove('active');
            if (square.getAttribute('data-color') === color) {
                square.classList.add('active');
            }
        });

        // Update pixel editor
        if (window.PixelEditor) {
            window.PixelEditor.setColor(color);
        }

        console.log('🎨 Color selected:', color);
    }

    /**
     * Create custom palette from image
     */
    async createCustomPaletteFromImage(imageUrl, colorCount = 8) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const colors = this.extractColorsFromImageData(imageData, colorCount);
                    
                    resolve(colors);
                };
                
                img.onerror = reject;
                img.src = imageUrl;
            });
        } catch (error) {
            console.error('Failed to create custom palette from image:', error);
            return this.colorPalettes.classic;
        }
    }

    /**
     * Extract dominant colors from image data
     */
    extractColorsFromImageData(imageData, colorCount) {
        const pixels = imageData.data;
        const colorMap = new Map();
        
        // Count color frequencies
        for (let i = 0; i < pixels.length; i += 4) {
            const r = Math.floor(pixels[i] / 32) * 32; // Quantize to reduce similar colors
            const g = Math.floor(pixels[i + 1] / 32) * 32;
            const b = Math.floor(pixels[i + 2] / 32) * 32;
            const color = `rgb(${r}, ${g}, ${b})`;
            
            colorMap.set(color, (colorMap.get(color) || 0) + 1);
        }
        
        // Sort by frequency and take top colors
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, colorCount)
            .map(entry => entry[0]);
        
        return sortedColors;
    }

    /**
     * Get current palette
     */
    getCurrentPalette() {
        return this.colorPalettes[this.currentPalette] || this.colorPalettes.classic;
    }

    /**
     * Add custom palette
     */
    addCustomPalette(name, colors) {
        this.colorPalettes[name] = colors;
        
        // Update selector if it exists
        const selector = document.getElementById('palette-selector');
        if (selector) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            selector.appendChild(option);
        }
    }
}

// Create global instance
const uiManager = new UIManager();

// Export for use in other modules
window.UIManager = uiManager;

// Register with global app instance if available
if (window.ArtPartySocial) {
    // Register common UI functions globally
    window.ArtPartySocial.showModal = (modalId, options) => uiManager.showModal(modalId, options);
    window.ArtPartySocial.hideModal = (modalId, options) => uiManager.hideModal(modalId, options);
    window.ArtPartySocial.showToast = (message, type, options) => uiManager.showToast(message, type, options);
}

console.log('✅ UI Manager loaded'); 