/**
 * Event Manager
 * Centralized event handling system
 */

class EventManager {
    constructor() {
        this.events = new Map();
        this.initialized = false;
    }
    
    /**
     * Initialize the event manager
     */
    init() {
        if (this.initialized) {
            console.warn('Event manager already initialized');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Event manager initialized');
    }
    
    /**
     * Subscribe to an event
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        this.events.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }
    
    /**
     * Subscribe to an event once
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback(...args);
        });
        
        return unsubscribe;
    }
    
    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
        const eventCallbacks = this.events.get(event);
        if (eventCallbacks) {
            eventCallbacks.delete(callback);
            
            // Clean up empty event sets
            if (eventCallbacks.size === 0) {
                this.events.delete(event);
            }
        }
    }
    
    /**
     * Emit an event
     */
    emit(event, ...args) {
        const eventCallbacks = this.events.get(event);
        if (eventCallbacks) {
            eventCallbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
    
    /**
     * Get all events and their listener counts
     */
    getEvents() {
        const eventInfo = {};
        this.events.forEach((callbacks, event) => {
            eventInfo[event] = callbacks.size;
        });
        return eventInfo;
    }
    
    /**
     * Check if an event has listeners
     */
    hasListeners(event) {
        return this.events.has(event) && this.events.get(event).size > 0;
    }
    
    /**
     * Destroy the event manager
     */
    destroy() {
        this.events.clear();
        this.initialized = false;
        console.log('✅ Event manager destroyed');
    }
}

// Create singleton instance
const eventManager = new EventManager();

// Export for use in other modules
export { eventManager };
export default eventManager; 