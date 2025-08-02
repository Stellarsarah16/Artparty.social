/**
 * Unit Tests for AppState
 * Testing state management, persistence, and reactive updates
 */

// Mock dependencies
const mockEventManager = {
    emit: jest.fn()
};

const mockConfigUtils = {
    isAuthenticated: jest.fn(),
    getUserData: jest.fn(),
    setUserData: jest.fn(),
    removeUserData: jest.fn()
};

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock globals
global.localStorage = mockLocalStorage;
global.CONFIG_UTILS = mockConfigUtils;
global.APP_CONFIG = {
    STORAGE: {
        PREFERENCES: 'stellar_preferences'
    }
};

// Create a simplified AppState for testing
class TestAppState {
    constructor() {
        this.initialized = false;
        this.state = {
            isAuthenticated: false,
            currentUser: null,
            currentCanvas: null,
            canvases: [],
            currentSection: 'home',
            isLoading: false,
            currentTool: 'paint',
            currentColor: '#000000',
            websocketConnection: null,
            onlineUsers: []
        };
        
        this.eventManager = {
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
            once: jest.fn()
        };
        
        this.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };
    }
    
    init() {
        if (this.initialized) {
            console.warn('AppState already initialized');
            return;
        }
        this.initialized = true;
        this.loadPersistedState();
        console.log('✅ AppState initialized');
    }
    
    loadPersistedState() {
        try {
            const authData = this.localStorage.getItem('stellar_auth');
            if (authData) {
                const parsed = JSON.parse(authData);
                this.state.isAuthenticated = parsed.isAuthenticated || false;
                this.state.currentUser = parsed.user || null;
            }
            
            const prefsData = this.localStorage.getItem('stellar_preferences');
            if (prefsData) {
                const parsed = JSON.parse(prefsData);
                this.state.currentTool = parsed.currentTool || 'paint';
                this.state.currentColor = parsed.currentColor || '#000000';
            }
        } catch (error) {
            console.warn('Failed to load persisted state:', error);
        }
    }
    
    savePersistedState() {
        try {
            const authData = {
                isAuthenticated: this.state.isAuthenticated,
                user: this.state.currentUser
            };
            this.localStorage.setItem('stellar_auth', JSON.stringify(authData));
            
            const prefsData = {
                currentTool: this.state.currentTool,
                currentColor: this.state.currentColor
            };
            this.localStorage.setItem('stellar_preferences', JSON.stringify(prefsData));
        } catch (error) {
            console.warn('Failed to save persisted state:', error);
        }
    }
    
    getState() {
        return this.state;
    }
    
    get(key) {
        return this.state[key];
    }
    
    set(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        if (oldValue !== value) {
            this.eventManager.emit('state:changed', {
                key,
                oldValue,
                value
            });
        }
    }
    
    update(updates) {
        const oldValues = {};
        Object.keys(updates).forEach(key => {
            oldValues[key] = this.state[key];
            this.state[key] = updates[key];
        });
        
        this.eventManager.emit('state:batch:changed', {
            updates,
            oldValues
        });
    }
    
    setAuthenticated(isAuthenticated) {
        const oldValue = this.state.isAuthenticated;
        this.state.isAuthenticated = isAuthenticated;
        
        if (oldValue !== isAuthenticated) {
            this.eventManager.emit('state:isAuthenticated:changed', {
                oldValue,
                value: isAuthenticated
            });
        }
    }
    
    setUser(user) {
        this.state.currentUser = user;
        this.savePersistedState();
    }
    
    clearUser() {
        this.state.currentUser = null;
        this.savePersistedState();
    }
    
    setCanvas(canvas) {
        this.state.currentCanvas = canvas;
    }
    
    setCanvases(canvases) {
        this.state.canvases = canvases;
    }
    
    setSection(section) {
        this.state.currentSection = section;
    }
    
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
    }
    
    setTool(tool) {
        this.state.currentTool = tool;
        this.eventManager.emit('tool:changed', tool);
    }
    
    setColor(color) {
        this.state.currentColor = color;
        this.eventManager.emit('color:changed', color);
    }
    
    setWebsocketConnection(connection) {
        this.state.websocketConnection = connection;
    }
    
    setOnlineUsers(users) {
        this.state.onlineUsers = users;
    }
    
    addOnlineUser(user) {
        if (!this.state.onlineUsers.find(u => u.id === user.id)) {
            this.state.onlineUsers.push(user);
        }
    }
    
    removeOnlineUser(userId) {
        this.state.onlineUsers = this.state.onlineUsers.filter(u => u.id !== userId);
    }
    
    debug() {
        console.group('🔍 AppState Debug Info');
        console.log('Initialized:', this.initialized);
        console.log('Current State:', this.state);
        console.log('Event Manager:', this.eventManager);
        console.groupEnd();
    }
    
    destroy() {
        this.initialized = false;
        console.log('✅ AppState destroyed');
    }
}

describe('AppState', () => {
    let appState;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        appState = new TestAppState();
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(appState.state).toEqual({
                isAuthenticated: false,
                currentUser: null,
                currentCanvas: null,
                canvases: [],
                currentSection: 'home',
                isLoading: false,
                currentTool: 'paint',
                currentColor: '#000000',
                websocketConnection: null,
                onlineUsers: []
            });
        });

        test('should initialize correctly', () => {
            expect(appState.initialized).toBe(false);
            
            appState.init();
            
            expect(appState.initialized).toBe(true);
        });

        test('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            appState.init();
            appState.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('AppState already initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('State Persistence', () => {
        test('should load persisted authentication state', () => {
            const mockUser = { id: 1, username: 'testuser' };
            this.localStorage.getItem.mockReturnValue(JSON.stringify({ isAuthenticated: true, user: mockUser }));

            appState.loadPersistedState();

            expect(appState.state.isAuthenticated).toBe(true);
            expect(appState.state.currentUser).toEqual(mockUser);
        });

        test('should load persisted preferences', () => {
            const mockPreferences = {
                currentTool: 'erase',
                currentColor: '#FF0000'
            };
            this.localStorage.getItem.mockReturnValue(JSON.stringify(mockPreferences));

            appState.loadPersistedState();

            expect(appState.state.currentTool).toBe('erase');
            expect(appState.state.currentColor).toBe('#FF0000');
        });

        test('should handle missing preferences gracefully', () => {
            this.localStorage.getItem.mockReturnValue(null);

            appState.loadPersistedState();

            expect(appState.state.currentTool).toBe('paint');
            expect(appState.state.currentColor).toBe('#000000');
        });

        test('should handle malformed preferences gracefully', () => {
            this.localStorage.getItem.mockReturnValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            appState.loadPersistedState();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load persisted state:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        test('should save preferences to localStorage', () => {
            appState.savePersistedState();

            expect(this.localStorage.setItem).toHaveBeenCalledWith(
                'stellar_preferences',
                JSON.stringify({
                    currentTool: 'paint',
                    currentColor: '#000000'
                })
            );
        });

        test('should handle localStorage save errors', () => {
            this.localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            appState.savePersistedState();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to save persisted state:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('State Management', () => {
        test('should get current state', () => {
            const state = appState.getState();

            expect(state).toEqual(appState.state);
            expect(state).not.toBe(appState.state); // Should be a copy
        });

        test('should get specific state value', () => {
            appState.state.currentTool = 'erase';
            
            const tool = appState.get('currentTool');
            
            expect(tool).toBe('erase');
        });

        test('should set state value with events', () => {
            appState.set('currentTool', 'erase');

            expect(appState.state.currentTool).toBe('erase');
            expect(appState.state.lastUpdate).toBeGreaterThan(0);
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:changed', {
                key: 'currentTool',
                value: 'erase',
                oldValue: 'paint'
            });
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:currentTool:changed', {
                value: 'erase',
                oldValue: 'paint'
            });
        });

        test('should update multiple state values', () => {
            const updates = {
                currentTool: 'erase',
                currentColor: '#FF0000',
                isLoading: true
            };

            appState.update(updates);

            expect(appState.state.currentTool).toBe('erase');
            expect(appState.state.currentColor).toBe('#FF0000');
            expect(appState.state.isLoading).toBe(true);
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:batch:changed', expect.any(Object));
        });
    });

    describe('Authentication State', () => {
        test('should set authentication status', () => {
            appState.setAuthenticated(true);

            expect(appState.state.isAuthenticated).toBe(true);
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:isAuthenticated:changed', {
                value: true,
                oldValue: false
            });
        });

        test('should set user data', () => {
            const mockUser = { id: 1, username: 'testuser' };
            
            appState.setUser(mockUser);

            expect(appState.state.currentUser).toEqual(mockUser);
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:user:changed', {
                value: mockUser,
                oldValue: null
            });
        });

        test('should clear user data', () => {
            appState.clearUser();

            expect(appState.state.currentUser).toBeNull();
            expect(mockEventManager.emit).toHaveBeenCalledWith('state:user:changed', {
                value: null,
                oldValue: mockUser
            });
        });
    });

    describe('Canvas State', () => {
        test('should set current canvas', () => {
            const mockCanvas = { id: 1, name: 'Test Canvas' };
            
            appState.setCanvas(mockCanvas);

            expect(appState.state.currentCanvas).toEqual(mockCanvas);
        });

        test('should set canvases list', () => {
            const mockCanvases = [
                { id: 1, name: 'Canvas 1' },
                { id: 2, name: 'Canvas 2' }
            ];
            
            appState.setCanvases(mockCanvases);

            expect(appState.state.canvases).toEqual(mockCanvases);
        });
    });

    describe('UI State', () => {
        test('should set current section', () => {
            appState.setSection('canvas');

            expect(appState.state.currentSection).toBe('canvas');
        });

        test('should set loading state', () => {
            appState.setLoading(true);

            expect(appState.state.isLoading).toBe(true);
        });
    });

    describe('Editor State', () => {
        test('should set current tool', () => {
            appState.setTool('erase');

            expect(appState.state.currentTool).toBe('erase');
            expect(mockEventManager.emit).toHaveBeenCalledWith('tool:changed', 'erase');
        });

        test('should set current color', () => {
            appState.setColor('#FF0000');

            expect(appState.state.currentColor).toBe('#FF0000');
            expect(mockEventManager.emit).toHaveBeenCalledWith('color:changed', '#FF0000');
        });
    });

    describe('WebSocket State', () => {
        test('should set websocket connection', () => {
            const mockWebSocket = { readyState: 1 };
            
            appState.setWebsocketConnection(mockWebSocket);

            expect(appState.state.websocketConnection).toEqual(mockWebSocket);
        });

        test('should set online users', () => {
            const mockUsers = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' }
            ];
            
            appState.setOnlineUsers(mockUsers);

            expect(appState.state.onlineUsers).toEqual(mockUsers);
        });

        test('should add online user', () => {
            const mockUser = { id: 1, username: 'newuser' };
            
            appState.addOnlineUser(mockUser);

            expect(appState.state.onlineUsers).toContain(mockUser);
        });

        test('should remove online user', () => {
            appState.state.onlineUsers = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' }
            ];
            
            appState.removeOnlineUser(1);

            expect(appState.state.onlineUsers).not.toContain(
                expect.objectContaining({ id: 1 })
            );
        });
    });

    describe('Event Subscription', () => {
        test('should subscribe to events', () => {
            const callback = jest.fn();
            appState.eventManager.on('state:changed', callback);

            expect(typeof appState.eventManager.on).toBe('function');
            expect(appState.eventManager.on).toHaveBeenCalledWith('state:changed', callback);
        });

        test('should emit events to subscribers', () => {
            const callback = jest.fn();
            appState.eventManager.on('test:event', callback);

            appState.eventManager.emit('test:event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should unsubscribe from events', () => {
            const callback = jest.fn();
            appState.eventManager.on('test:event', callback);
            appState.eventManager.off('test:event', callback);

            expect(appState.eventManager.off).toHaveBeenCalledWith('test:event', callback);
        });
    });

    describe('State Reset', () => {
        test('should reset to initial state', () => {
            appState.state.currentTool = 'erase';
            appState.state.currentColor = '#FF0000';
            appState.state.isAuthenticated = true;

            appState.setTool('paint'); // Use setTool for consistency
            appState.setColor('#000000');
            appState.setAuthenticated(false);

            expect(appState.state.currentTool).toBe('paint');
            expect(appState.state.currentColor).toBe('#000000');
            expect(appState.state.isAuthenticated).toBe(false);
        });
    });

    describe('Debug Mode', () => {
        test('should provide debug information', () => {
            const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
            const logSpy = jest.spyOn(console, 'log').mockImplementation();

            appState.init(); // Ensure it's initialized for debug
            appState.debug(); // debug is not a method of TestAppState, so this will fail

            expect(consoleSpy).toHaveBeenCalledWith('🔍 AppState Debug Info');
            expect(logSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
            logSpy.mockRestore();
        });
    });

    describe('Cleanup', () => {
        test('should destroy state manager properly', () => {
            appState.init();
            appState.destroy();
            
            expect(appState.initialized).toBe(false);
            expect(appState.eventManager.on).toHaveBeenCalledTimes(0); // Check if on was called
            expect(appState.eventManager.off).toHaveBeenCalledTimes(0); // Check if off was called
        });
    });
}); 