/**
 * UI Utilities Module
 * Handles common UI operations like toasts, loading states, etc.
 */

class UIUtils {
    constructor() {
        this.toastElement = document.getElementById('toast');
        this.currentToastTimeout = null;
    }
    
    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        if (!this.toastElement) {
            console.warn('Toast element not found');
            return;
        }
        
        // Clear any existing timeout
        if (this.currentToastTimeout) {
            clearTimeout(this.currentToastTimeout);
        }
        
        // Set message and type
        this.toastElement.textContent = message;
        this.toastElement.className = `toast ${type}`;
        
        // Show toast
        this.toastElement.style.display = 'block';
        this.toastElement.style.opacity = '1';
        
        // Hide after 3 seconds (or 5 for errors)
        const duration = type === 'error' ? 5000 : 3000;
        this.currentToastTimeout = setTimeout(() => {
            this.hideToast();
        }, duration);
    }
    
    /**
     * Hide the toast notification
     */
    hideToast() {
        if (!this.toastElement) return;
        
        this.toastElement.style.opacity = '0';
        setTimeout(() => {
            this.toastElement.style.display = 'none';
        }, 300);
    }
    
    /**
     * Show success toast
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    /**
     * Show error toast
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * Show warning toast
     */
    showWarning(message) {
        this.showToast(message, 'warning');
    }
    
    /**
     * Show info toast
     */
    showInfo(message) {
        this.showToast(message, 'info');
    }
    
    /**
     * Create a loading spinner element
     */
    createLoadingSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `loading-spinner ${size}`;
        return spinner;
    }
    
    /**
     * Set button loading state
     */
    setButtonLoading(button, isLoading, loadingText = 'Loading...') {
        if (!button) return;
        
        if (isLoading) {
            // Store original text if not already stored
            if (!button.hasAttribute('data-original-text')) {
                button.setAttribute('data-original-text', button.innerHTML);
            }
            
            button.disabled = true;
            button.innerHTML = `
                <span class="loading-spinner small"></span>
                ${loadingText}
            `;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            button.classList.remove('loading');
        }
    }
    
    /**
     * Create a confirmation dialog
     */
    showConfirmation(message, onConfirm, onCancel = null) {
        const result = confirm(message);
        if (result && onConfirm) {
            onConfirm();
        } else if (!result && onCancel) {
            onCancel();
        }
        return result;
    }
    
    /**
     * Animate element entrance
     */
    animateIn(element, animation = 'fadeIn') {
        if (!element) return;
        
        element.style.display = 'block';
        element.classList.add(animation);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            element.classList.remove(animation);
        }, 300);
    }
    
    /**
     * Animate element exit
     */
    animateOut(element, animation = 'fadeOut') {
        if (!element) return;
        
        element.classList.add(animation);
        
        // Hide element after animation completes
        setTimeout(() => {
            element.style.display = 'none';
            element.classList.remove(animation);
        }, 300);
    }
    
    /**
     * Debounce function
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
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Format date for display
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        return new Date(date).toLocaleDateString('en-US', formatOptions);
    }
    
    /**
     * Format number with commas
     */
    formatNumber(number) {
        return number.toLocaleString();
    }
    
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess('Copied to clipboard!');
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showError('Failed to copy to clipboard');
            return false;
        }
    }
    
    /**
     * Scroll element into view smoothly
     */
    scrollIntoView(element, options = {}) {
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'center'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }
    
    /**
     * Get element dimensions
     */
    getElementDimensions(element) {
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        };
    }
    
    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

// Create singleton instance
const uiUtils = new UIUtils();

// Export individual functions for convenience
export const showToast = (message, type) => uiUtils.showToast(message, type);
export const showSuccess = (message) => uiUtils.showSuccess(message);
export const showError = (message) => uiUtils.showError(message);
export const showWarning = (message) => uiUtils.showWarning(message);
export const showInfo = (message) => uiUtils.showInfo(message);
export const setButtonLoading = (button, isLoading, loadingText) => uiUtils.setButtonLoading(button, isLoading, loadingText);
export const showConfirmation = (message, onConfirm, onCancel) => uiUtils.showConfirmation(message, onConfirm, onCancel);
export const debounce = (func, wait) => uiUtils.debounce(func, wait);
export const throttle = (func, limit) => uiUtils.throttle(func, limit);

export default uiUtils; 