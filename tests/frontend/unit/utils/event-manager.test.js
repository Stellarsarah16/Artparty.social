/**
 * Unit Tests for EventManager
 * Testing event subscription, emission, cleanup, and error handling
 */

// Create a simplified EventManager for testing
class TestEventManager {
    constructor() {
        this.events = new Map();
        this.initialized = false;
    }
    
    init() {
        if (this.initialized) {
            console.warn('Event manager already initialized');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Event manager initialized');
    }
    
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
    
    once(event, callback) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback(...args);
        });
        
        return unsubscribe;
    }
    
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
    
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
    
    getEvents() {
        const eventInfo = {};
        this.events.forEach((callbacks, event) => {
            eventInfo[event] = callbacks.size;
        });
        return eventInfo;
    }
    
    hasListeners(event) {
        return this.events.has(event) && this.events.get(event).size > 0;
    }
    
    destroy() {
        this.events.clear();
        this.initialized = false;
        console.log('✅ Event manager destroyed');
    }
}

describe('EventManager', () => {
    let eventManager;

    beforeEach(() => {
        // Create fresh instance
        eventManager = new TestEventManager();
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            expect(eventManager.initialized).toBe(false);
            expect(eventManager.events).toBeInstanceOf(Map);
            
            eventManager.init();
            
            expect(eventManager.initialized).toBe(true);
        });

        test('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            eventManager.init();
            eventManager.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('Event manager already initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('Event Subscription', () => {
        test('should subscribe to events', () => {
            const callback = jest.fn();
            const unsubscribe = eventManager.on('test:event', callback);

            expect(typeof unsubscribe).toBe('function');
            expect(eventManager.events.has('test:event')).toBe(true);
            expect(eventManager.events.get('test:event').has(callback)).toBe(true);
        });

        test('should handle multiple subscribers for same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            eventManager.on('test:event', callback1);
            eventManager.on('test:event', callback2);

            const eventCallbacks = eventManager.events.get('test:event');
            expect(eventCallbacks.size).toBe(2);
            expect(eventCallbacks.has(callback1)).toBe(true);
            expect(eventCallbacks.has(callback2)).toBe(true);
        });

        test('should subscribe to event once', () => {
            const callback = jest.fn();
            const unsubscribe = eventManager.once('test:event', callback);

            expect(typeof unsubscribe).toBe('function');
            expect(eventManager.events.has('test:event')).toBe(true);
        });

        test('should unsubscribe from events', () => {
            const callback = jest.fn();
            
            eventManager.on('test:event', callback);
            eventManager.off('test:event', callback);

            expect(eventManager.events.has('test:event')).toBe(false);
        });

        test('should return unsubscribe function', () => {
            const callback = jest.fn();
            const unsubscribe = eventManager.on('test:event', callback);

            expect(eventManager.events.has('test:event')).toBe(true);
            
            unsubscribe();
            
            expect(eventManager.events.has('test:event')).toBe(false);
        });
    });

    describe('Event Emission', () => {
        test('should emit events to subscribers', () => {
            const callback = jest.fn();
            eventManager.on('test:event', callback);

            eventManager.emit('test:event', 'arg1', 'arg2');

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
        });

        test('should emit to multiple subscribers', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            eventManager.on('test:event', callback1);
            eventManager.on('test:event', callback2);

            eventManager.emit('test:event', 'data');

            expect(callback1).toHaveBeenCalledWith('data');
            expect(callback2).toHaveBeenCalledWith('data');
        });

        test('should handle non-existent events gracefully', () => {
            expect(() => {
                eventManager.emit('non:existent:event', 'data');
            }).not.toThrow();
        });

        test('should handle callback errors gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Callback error');
            });
            const goodCallback = jest.fn();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            eventManager.on('test:event', errorCallback);
            eventManager.on('test:event', goodCallback);

            eventManager.emit('test:event', 'data');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error in event listener for test:event:',
                expect.any(Error)
            );
            expect(goodCallback).toHaveBeenCalledWith('data');
            
            consoleSpy.mockRestore();
        });
    });

    describe('Once Events', () => {
        test('should execute once callback only once', () => {
            const callback = jest.fn();
            eventManager.once('test:event', callback);

            eventManager.emit('test:event', 'first');
            eventManager.emit('test:event', 'second');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('first');
        });

        test('should clean up once event after execution', () => {
            const callback = jest.fn();
            eventManager.once('test:event', callback);

            eventManager.emit('test:event', 'data');

            expect(eventManager.events.has('test:event')).toBe(false);
        });

        test('should return working unsubscribe function for once', () => {
            const callback = jest.fn();
            const unsubscribe = eventManager.once('test:event', callback);

            unsubscribe();
            eventManager.emit('test:event', 'data');

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Event Cleanup', () => {
        test('should remove all listeners for specific event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            eventManager.on('test:event', callback1);
            eventManager.on('test:event', callback2);
            eventManager.on('other:event', callback1);

            eventManager.removeAllListeners('test:event');

            expect(eventManager.events.has('test:event')).toBe(false);
            expect(eventManager.events.has('other:event')).toBe(true);
        });

        test('should remove all listeners for all events', () => {
            const callback = jest.fn();
            
            eventManager.on('test:event1', callback);
            eventManager.on('test:event2', callback);

            eventManager.removeAllListeners();

            expect(eventManager.events.size).toBe(0);
        });

        test('should clean up empty event sets when unsubscribing', () => {
            const callback = jest.fn();
            
            eventManager.on('test:event', callback);
            eventManager.off('test:event', callback);

            expect(eventManager.events.has('test:event')).toBe(false);
        });

        test('should handle unsubscribing non-existent callbacks', () => {
            const callback = jest.fn();
            
            expect(() => {
                eventManager.off('non:existent:event', callback);
            }).not.toThrow();
        });
    });

    describe('Event Introspection', () => {
        test('should get event information', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            eventManager.on('test:event1', callback1);
            eventManager.on('test:event1', callback2);
            eventManager.on('test:event2', callback1);

            const eventInfo = eventManager.getEvents();

            expect(eventInfo).toEqual({
                'test:event1': 2,
                'test:event2': 1
            });
        });

        test('should check if event has listeners', () => {
            const callback = jest.fn();
            
            expect(eventManager.hasListeners('test:event')).toBe(false);
            
            eventManager.on('test:event', callback);
            
            expect(eventManager.hasListeners('test:event')).toBe(true);
        });

        test('should handle checking non-existent events', () => {
            expect(eventManager.hasListeners('non:existent:event')).toBe(false);
        });
    });

    describe('Memory Management', () => {
        test('should not leak memory when adding/removing many events', () => {
            const callbacks = [];
            
            // Add many callbacks
            for (let i = 0; i < 1000; i++) {
                const callback = jest.fn();
                callbacks.push(callback);
                eventManager.on(`test:event${i}`, callback);
            }

            expect(eventManager.events.size).toBe(1000);

            // Remove all callbacks
            callbacks.forEach((callback, i) => {
                eventManager.off(`test:event${i}`, callback);
            });

            expect(eventManager.events.size).toBe(0);
        });

        test('should handle rapid subscribe/unsubscribe cycles', () => {
            const callback = jest.fn();
            
            for (let i = 0; i < 100; i++) {
                const unsubscribe = eventManager.on('test:event', callback);
                unsubscribe();
            }

            expect(eventManager.events.size).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle callback that modifies event listeners', () => {
            const callback1 = jest.fn(() => {
                // Callback that unsubscribes another callback
                eventManager.off('test:event', callback2);
            });
            const callback2 = jest.fn();
            
            eventManager.on('test:event', callback1);
            eventManager.on('test:event', callback2);

            eventManager.emit('test:event', 'data');

            expect(callback1).toHaveBeenCalledWith('data');
            // callback2 should not be called because it was removed during callback1 execution
            expect(callback2).not.toHaveBeenCalled();
            expect(eventManager.events.get('test:event').size).toBe(1);
        });

        test('should handle callback that adds new listeners', () => {
            const newCallback = jest.fn();
            const callback = jest.fn(() => {
                eventManager.on('new:event', newCallback);
            });
            
            eventManager.on('test:event', callback);
            eventManager.emit('test:event', 'data');

            expect(eventManager.events.has('new:event')).toBe(true);
            expect(eventManager.events.get('new:event').has(newCallback)).toBe(true);
        });
    });

    describe('Service Lifecycle', () => {
        test('should destroy event manager properly', () => {
            const callback = jest.fn();
            
            eventManager.on('test:event', callback);
            eventManager.init();
            eventManager.destroy();
            
            expect(eventManager.initialized).toBe(false);
            expect(eventManager.events.size).toBe(0);
        });
    });
}); 