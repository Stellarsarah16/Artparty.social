/**
 * Navigation Manager
 * Handles UI navigation and section management
 */

import { eventManager } from '../utils/events.js';
import { uiUtils } from '../utils/ui.js';

class NavigationManager {
    constructor() {
        this.initialized = false;
        this.currentSection = 'welcome';
        this.sections = ['welcome', 'canvas', 'editor', 'gallery'];
    }
    
    /**
     * Initialize the navigation manager
     */
    init() {
        if (this.initialized) {
            console.warn('Navigation manager already initialized');
            return;
        }
        
        this.setupEventListeners();
        this.initialized = true;
        console.log('✅ Navigation manager initialized');
    }
    
    /**
     * Setup navigation event listeners
     */
    setupEventListeners() {
        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal')) {
                const modalName = e.target.dataset.modal;
                if (modalName) {
                    this.hideModal(modalName);
                }
            }
        });
        
        // Modal background clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id.replace('-modal', ''));
            }
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }
    
    /**
     * Show a section
     */
    showSection(sectionName) {
        if (!this.sections.includes(sectionName)) {
            console.warn(`Unknown section: ${sectionName}`);
            return;
        }
        
        // Hide all sections
        this.sections.forEach(section => {
            const element = document.getElementById(`${section}-section`);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        this.currentSection = sectionName;
        this.updateNavigation();
        
        // Emit section change event
        eventManager.emit('section:changed', sectionName);
    }
    
    /**
     * Update navigation state
     */
    updateNavigation() {
        const isAuthenticated = CONFIG_UTILS.isAuthenticated();
        const userData = CONFIG_UTILS.getUserData();
        
        // Show/hide authentication buttons
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const userInfo = document.getElementById('user-info');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (isAuthenticated && userData) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'block';
                const username = userInfo.querySelector('#username');
                if (username) {
                    username.textContent = userData.username;
                }
            }
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'block';
            if (registerBtn) registerBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }
    
    /**
     * Show modal
     */
    showModal(modalName) {
        uiUtils.showModal(modalName);
        eventManager.emit('modal:opened', modalName);
    }
    
    /**
     * Hide modal
     */
    hideModal(modalName) {
        uiUtils.hideModal(modalName);
        eventManager.emit('modal:closed', modalName);
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        uiUtils.hideAllModals();
        eventManager.emit('modals:closed');
    }
    
    /**
     * Get current section
     */
    getCurrentSection() {
        return this.currentSection;
    }
    
    /**
     * Check if section exists
     */
    sectionExists(sectionName) {
        return this.sections.includes(sectionName);
    }
    
    /**
     * Add section
     */
    addSection(sectionName) {
        if (!this.sections.includes(sectionName)) {
            this.sections.push(sectionName);
        }
    }
    
    /**
     * Destroy the navigation manager
     */
    destroy() {
        this.initialized = false;
        console.log('✅ Navigation manager destroyed');
    }
}

// Create singleton instance
const navigationManager = new NavigationManager();

// Export for use in other modules
export { navigationManager };
export default navigationManager; 