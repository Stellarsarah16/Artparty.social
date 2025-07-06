/**
 * Application State Management Module
 * Handles centralized state management for the application
 */

class AppState {
    constructor() {
        this.state = {
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
        
        this.listeners = new Map();
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Get specific state property
     */
    get(key) {
        return this.state[key];
    }
    
    /**
     * Set state property and notify listeners
     */
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        // Notify listeners of this specific property
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                callback(value, oldValue);
            });
        }
        
        // Notify global listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                callback(key, value, oldValue);
            });
        }
    }
    
    /**
     * Update multiple state properties at once
     */
    update(updates) {
        Object.keys(updates).forEach(key => {
            this.set(key, updates[key]);
        });
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Authentication helpers
     */
    setAuthenticated(user) {
        this.update({
            isAuthenticated: true,
            currentUser: user
        });
    }
    
    setUnauthenticated() {
        this.update({
            isAuthenticated: false,
            currentUser: null,
            currentCanvas: null,
            websocket: null,
            onlineUsers: []
        });
    }
    
    /**
     * Canvas helpers
     */
    setCurrentCanvas(canvas) {
        this.set('currentCanvas', canvas);
    }
    
    setCanvasList(canvases) {
        this.set('canvasList', canvases);
    }
    
    /**
     * Tool helpers
     */
    setCurrentTool(tool) {
        this.set('currentTool', tool);
    }
    
    setCurrentColor(color) {
        this.set('currentColor', color);
    }
    
    /**
     * Online users helpers
     */
    setOnlineUsers(users) {
        this.set('onlineUsers', users);
    }
    
    addOnlineUser(user) {
        const currentUsers = [...this.state.onlineUsers];
        if (!currentUsers.find(u => u.id === user.id)) {
            currentUsers.push(user);
            this.set('onlineUsers', currentUsers);
        }
    }
    
    removeOnlineUser(userId) {
        const currentUsers = this.state.onlineUsers.filter(u => u.id !== userId);
        this.set('onlineUsers', currentUsers);
    }
    
    /**
     * Loading state helpers
     */
    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }
    
    /**
     * WebSocket helpers
     */
    setWebSocket(websocket) {
        this.set('websocket', websocket);
    }
    
    /**
     * Section navigation helpers
     */
    setCurrentSection(section) {
        this.set('currentSection', section);
    }
}

// Create and export singleton instance
const appState = new AppState();
export default appState; 