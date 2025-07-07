/**
 * Application State Management
 * Centralized state management with reactive updates
 */

import { eventManager } from '../utils/events.js';

class AppState {
    constructor() {
        this.state = {
            // Authentication
            isAuthenticated: false,
            currentUser: null,
            
            // Canvas
            currentCanvas: null,
            canvases: [],
            
            // UI State
            currentSection: 'welcome',
            isLoading: false,
            
            // Editor
            currentTool: 'paint',
            currentColor: '#000000',
            
            // WebSocket
            websocket: null,
            onlineUsers: [],
            
            // Performance
            lastUpdate: Date.now()
        };
        
        this.listeners = new Map();
        this.initialized = false;
    }
    
    /**
     * Initialize state management
     */
    init() {
        if (this.initialized) {
            console.warn('State already initialized');
            return;
        }
        
        // Load persisted state
        this.loadPersistedState();
        
        this.initialized = true;
        console.log('✅ State management initialized');
    }
    
    /**
     * Load state from localStorage
     */
    loadPersistedState() {
        try {
            // Load authentication state
            if (CONFIG_UTILS.isAuthenticated()) {
                const userData = CONFIG_UTILS.getUserData();
                if (userData) {
                    this.state.isAuthenticated = true;
                    this.state.currentUser = userData;
                }
            }
            
            // Load other persisted state
            const persistedState = localStorage.getItem(APP_CONFIG.STORAGE.PREFERENCES);
            if (persistedState) {
                const parsed = JSON.parse(persistedState);
                this.state.currentTool = parsed.currentTool || 'paint';
                this.state.currentColor = parsed.currentColor || '#000000';
            }
            
        } catch (error) {
            console.warn('Failed to load persisted state:', error);
        }
    }
    
    /**
     * Save state to localStorage
     */
    savePersistedState() {
        try {
            const stateToPersist = {
                currentTool: this.state.currentTool,
                currentColor: this.state.currentColor
            };
            
            localStorage.setItem(APP_CONFIG.STORAGE.PREFERENCES, JSON.stringify(stateToPersist));
            
        } catch (error) {
            console.warn('Failed to save persisted state:', error);
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Get specific state value
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Set state value with reactive updates
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        this.state.lastUpdate = Date.now();
        
        // Emit change event
        this.emit('state:changed', { key, value, oldValue });
        this.emit(`state:${key}:changed`, { value, oldValue });
        
        // Save to localStorage if needed
        if (['currentTool', 'currentColor'].includes(key)) {
            this.savePersistedState();
        }
    }
    
    /**
     * Update multiple state values
     */
    update(updates) {
        const changes = {};
        
        Object.keys(updates).forEach(key => {
            const oldValue = this.state[key];
            this.state[key] = updates[key];
            changes[key] = { value: updates[key], oldValue };
        });
        
        this.state.lastUpdate = Date.now();
        
        // Emit batch change event
        this.emit('state:batch:changed', changes);
        
        // Emit individual change events
        Object.keys(changes).forEach(key => {
            this.emit(`state:${key}:changed`, changes[key]);
        });
        
        this.savePersistedState();
    }
    
    /**
     * Authentication state methods
     */
    setAuthenticated(isAuthenticated) {
        this.set('isAuthenticated', isAuthenticated);
    }
    
    setUser(user) {
        this.set('currentUser', user);
        
        // Update localStorage
        if (user) {
            CONFIG_UTILS.setUserData(user);
        } else {
            CONFIG_UTILS.removeUserData();
        }
    }
    
    /**
     * Canvas state methods
     */
    setCurrentCanvas(canvas) {
        this.set('currentCanvas', canvas);
    }
    
    setCanvases(canvases) {
        this.set('canvases', canvases);
    }
    
    /**
     * UI state methods
     */
    setCurrentSection(section) {
        this.set('currentSection', section);
    }
    
    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }
    
    /**
     * Editor state methods
     */
    setCurrentTool(tool) {
        this.set('currentTool', tool);
    }
    
    setCurrentColor(color) {
        this.set('currentColor', color);
    }
    
    /**
     * WebSocket state methods
     */
    setWebSocket(websocket) {
        this.set('websocket', websocket);
    }
    
    setOnlineUsers(users) {
        this.set('onlineUsers', users);
    }
    
    addOnlineUser(user) {
        const users = [...this.state.onlineUsers];
        if (!users.find(u => u.id === user.id)) {
            users.push(user);
            this.setOnlineUsers(users);
        }
    }
    
    removeOnlineUser(userId) {
        const users = this.state.onlineUsers.filter(u => u.id !== userId);
        this.setOnlineUsers(users);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(event);
            if (eventListeners) {
                eventListeners.delete(callback);
            }
        };
    }
    
    /**
     * Emit state change event
     */
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in state listener for ${event}:`, error);
                }
            });
        }
        
        // Also emit through event manager
        if (eventManager) {
            eventManager.emit(event, data);
        }
    }
    
    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            isAuthenticated: false,
            currentUser: null,
            currentCanvas: null,
            canvases: [],
            currentSection: 'welcome',
            isLoading: false,
            currentTool: 'paint',
            currentColor: '#000000',
            websocket: null,
            onlineUsers: [],
            lastUpdate: Date.now()
        };
        
        this.emit('state:reset');
    }
    
    /**
     * Get state for debugging
     */
    debug() {
        return {
            state: this.state,
            listeners: Array.from(this.listeners.keys()),
            initialized: this.initialized
        };
    }
    
    /**
     * Cleanup state management
     */
    destroy() {
        this.listeners.clear();
        this.initialized = false;
        console.log('✅ State management destroyed');
    }
}

// Create singleton instance
const appState = new AppState();

// Export for use in other modules
export { appState };
export default appState; 