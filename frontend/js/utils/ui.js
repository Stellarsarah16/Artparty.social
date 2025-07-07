/**
 * UI Utilities
 * Common UI operations and helpers
 */

class UIUtils {
    constructor() {
        this.initialized = false;
        this.toastTimeout = null;
    }
    
    /**
     * Initialize UI utilities
     */
    init() {
        if (this.initialized) {
            console.warn('UI utilities already initialized');
            return;
        }
        
        this.initialized = true;
        console.log('✅ UI utilities initialized');
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
     * Show toast notification
     */
    showToast(message, type = 'info', duration = APP_CONFIG.UI.TOAST_DURATION) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }
        
        // Clear existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        // Set toast content and type
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        // Add show class for animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto-hide after duration
        this.toastTimeout = setTimeout(() => {
            this.hideToast();
        }, duration);
    }
    
    /**
     * Hide toast notification
     */
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.remove('show');
            
            // Hide after animation
            setTimeout(() => {
                toast.style.display = 'none';
            }, APP_CONFIG.UI.ANIMATION_DURATION);
        }
        
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
            this.toastTimeout = null;
        }
    }
    
    /**
     * Show modal
     */
    showModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            
            // Focus first input
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    /**
     * Hide modal
     */
    hideModal(modalName) {
        const modal = document.getElementById(`${modalName}-modal`);
        if (modal) {
            modal.classList.remove('show');
            
            setTimeout(() => {
                modal.style.display = 'none';
            }, APP_CONFIG.UI.ANIMATION_DURATION);
        }
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, APP_CONFIG.UI.ANIMATION_DURATION);
        });
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
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (error) {
            return 'Invalid date';
        }
    }
    
    /**
     * Format relative time (e.g., "2 minutes ago")
     */
    formatRelativeTime(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diff = now - date;
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
                return `${days} day${days > 1 ? 's' : ''} ago`;
            } else if (hours > 0) {
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else if (minutes > 0) {
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else {
                return 'Just now';
            }
        } catch (error) {
            return 'Unknown time';
        }
    }
    
    /**
     * Create element with attributes
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else if (key === 'textContent') {
                element.textContent = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }
    
    /**
     * Set form loading state
     */
    setFormLoading(form, isLoading, submitButton = null, loadingText = 'Loading...') {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, textarea, select, button');
        const submit = submitButton || form.querySelector('button[type="submit"]');
        
        if (isLoading) {
            inputs.forEach(input => input.disabled = true);
            if (submit) {
                submit.textContent = loadingText;
                submit.classList.add('loading');
            }
        } else {
            inputs.forEach(input => input.disabled = false);
            if (submit) {
                submit.textContent = submit.dataset.originalText || 'Submit';
                submit.classList.remove('loading');
            }
        }
    }
    
    /**
     * Show form errors
     */
    showFormErrors(form, errors) {
        // Clear previous errors
        this.clearFormErrors(form);
        
        Object.keys(errors).forEach(field => {
            this.showFieldError(field, errors[field]);
        });
    }
    
    /**
     * Show field error
     */
    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        // Add error class to field
        field.classList.add('error');
        
        // Create or update error message
        let errorElement = field.parentElement.querySelector('.error-message');
        if (!errorElement) {
            errorElement = this.createElement('div', {
                className: 'error-message'
            });
            field.parentElement.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
    }
    
    /**
     * Clear field error
     */
    clearFieldError(fieldName) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        field.classList.remove('error');
        
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    /**
     * Clear all form errors
     */
    clearFormErrors(form) {
        if (!form) return;
        
        // Remove error classes
        form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        
        // Remove error messages
        form.querySelectorAll('.error-message').forEach(error => {
            error.remove();
        });
    }
    
    /**
     * Debounce function
     */
    debounce(func, delay = APP_CONFIG.UI.DEBOUNCE_DELAY) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle function
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard', 'success');
            return true;
        } catch (error) {
            console.warn('Failed to copy to clipboard:', error);
            this.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }
    
    /**
     * Get mouse position relative to element
     */
    getMousePosition(event, element) {
        const rect = element.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    
    /**
     * Animate element
     */
    animate(element, keyframes, options = {}) {
        const defaultOptions = {
            duration: APP_CONFIG.UI.ANIMATION_DURATION,
            easing: 'ease-in-out',
            fill: 'forwards'
        };
        
        return element.animate(keyframes, { ...defaultOptions, ...options });
    }
    
    /**
     * Destroy UI utilities
     */
    destroy() {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        this.initialized = false;
        console.log('✅ UI utilities destroyed');
    }
}

// Create singleton instance
const uiUtils = new UIUtils();

// Export for use in other modules
export { uiUtils };
export default uiUtils; 