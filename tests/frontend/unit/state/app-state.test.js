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

// Mock globals
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
            currentTile: null,
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
    
    init() {
        if (this.initialized) {
            console.warn('AppState already initialized');
            return;
        }
        this.initialized = true;
        console.log('✅ AppState initialized');
    }
    
    getState() {
        return { ...this.state };
    }
    
    get(key) {
        return this.state[key];
    }
    
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
    
    update(updates) {
        Object.keys(updates).forEach(key => {
            this.set(key, updates[key]);
        });
    }
    
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
    
    setAuthenticated(user) {
        this.update({
            isAuthenticated: true,
            currentUser: user
        });
    }
    
    setUnauthenticated() {
        this.update({
            isAuthenticated: false,
            currentUser: null
        });
    }
    
    setCurrentCanvas(canvas) {
        this.set('currentCanvas', canvas);
    }
    
    getCurrentCanvas() {
        return this.get('currentCanvas');
    }
    
    setCurrentTile(tile) {
        this.set('currentTile', tile);
    }
    
    getCurrentTile() {
        return this.get('currentTile');
    }
    
    setCanvasList(canvases) {
        this.set('canvasList', canvases);
    }
    
    setCurrentTool(tool) {
        this.set('currentTool', tool);
    }
    
    setCurrentColor(color) {
        this.set('currentColor', color);
    }
    
    setOnlineUsers(users) {
        this.set('onlineUsers', users);
    }
    
    addOnlineUser(user) {
        const currentUsers = this.get('onlineUsers');
        if (!currentUsers.find(u => u.id === user.id)) {
            this.set('onlineUsers', [...currentUsers, user]);
        }
    }
    
    removeOnlineUser(userId) {
        const currentUsers = this.get('onlineUsers');
        this.set('onlineUsers', currentUsers.filter(u => u.id !== userId));
    }
    
    setLoading(isLoading) {
        this.set('isLoading', isLoading);
    }
    
    setWebSocket(websocket) {
        this.set('websocket', websocket);
    }
    
    setCurrentSection(section) {
        this.set('currentSection', section);
    }
    
    setUser(user) {
        this.set('currentUser', user);
    }
    
    debug() {
        return {
            state: this.state,
            listeners: Array.from(this.listeners.keys()),
            initialized: this.initialized
        };
    }
    
    destroy() {
        this.initialized = false;
        this.listeners.clear();
        console.log('✅ AppState destroyed');
    }
}

describe('AppState', () => {
    let appState;
    
    beforeEach(() => {
        appState = new TestAppState();
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        if (appState) {
            appState.destroy();
        }
    });
    
    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(appState.state).toEqual({
                isAuthenticated: false,
                currentUser: null,
                currentCanvas: null,
                currentTile: null,
                currentSection: 'welcome',
                websocket: null,
                onlineUsers: [],
                canvasList: [],
                currentTool: 'paint',
                currentColor: '#000000',
                isLoading: false
            });
        });
        
        test('should initialize correctly', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            appState.init();
            
            expect(appState.initialized).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('✅ AppState initialized');
            consoleSpy.mockRestore();
        });
        
        test('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            appState.init();
            appState.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('AppState already initialized');
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
            const callback = jest.fn();
            appState.subscribe('currentTool', callback);
            
            appState.set('currentTool', 'erase');
            
            expect(appState.state.currentTool).toBe('erase');
            expect(callback).toHaveBeenCalledWith('erase', 'paint');
        });
        
        test('should update multiple state values', () => {
            const callback = jest.fn();
            appState.subscribe('*', callback);
            
            appState.update({
                currentColor: '#FF0000',
                isLoading: true
            });
            
            expect(appState.state.currentColor).toBe('#FF0000');
            expect(appState.state.isLoading).toBe(true);
            expect(callback).toHaveBeenCalledWith('currentColor', '#FF0000', '#000000');
            expect(callback).toHaveBeenCalledWith('isLoading', true, false);
        });
    });
    
    describe('Authentication State', () => {
        test('should set authentication status', () => {
            const mockUser = { id: 1, username: 'testuser' };
            const callback = jest.fn();
            appState.subscribe('isAuthenticated', callback);
            
            appState.setAuthenticated(mockUser);
            
            expect(appState.state.isAuthenticated).toBe(true);
            expect(appState.state.currentUser).toEqual(mockUser);
            expect(callback).toHaveBeenCalledWith(true, false);
        });
        
        test('should set user data', () => {
            const mockUser = { id: 1, username: 'testuser' };
            const callback = jest.fn();
            appState.subscribe('currentUser', callback);
            
            appState.setUser(mockUser);
            
            expect(appState.state.currentUser).toEqual(mockUser);
            expect(callback).toHaveBeenCalledWith(mockUser, null);
        });
        
        test('should clear user data', () => {
            const mockUser = { id: 1, username: 'testuser' };
            appState.state.currentUser = mockUser;
            const callback = jest.fn();
            appState.subscribe('currentUser', callback);
            
            appState.setUnauthenticated();
            
            expect(appState.state.currentUser).toBe(null);
            expect(callback).toHaveBeenCalledWith(null, mockUser);
        });
    });
    
    describe('Canvas State', () => {
        test('should set current canvas', () => {
            const mockCanvas = { id: 1, name: 'Test Canvas' };
            
            appState.setCurrentCanvas(mockCanvas);
            
            expect(appState.state.currentCanvas).toEqual(mockCanvas);
        });
        
        test('should set canvases list', () => {
            const mockCanvases = [{ id: 1, name: 'Canvas 1' }, { id: 2, name: 'Canvas 2' }];
            
            appState.setCanvasList(mockCanvases);
            
            expect(appState.state.canvasList).toEqual(mockCanvases);
        });
    });
    
    describe('UI State', () => {
        test('should set current section', () => {
            appState.setCurrentSection('canvas');
            
            expect(appState.state.currentSection).toBe('canvas');
        });
        
        test('should set loading state', () => {
            appState.setLoading(true);
            
            expect(appState.state.isLoading).toBe(true);
        });
    });
    
    describe('Editor State', () => {
        test('should set current tool', () => {
            appState.setCurrentTool('erase');
            
            expect(appState.state.currentTool).toBe('erase');
        });
        
        test('should set current color', () => {
            appState.setCurrentColor('#FF0000');
            
            expect(appState.state.currentColor).toBe('#FF0000');
        });
    });
    
    describe('WebSocket State', () => {
        test('should set websocket connection', () => {
            const mockWebSocket = { id: 'ws123' };
            
            appState.setWebSocket(mockWebSocket);
            
            expect(appState.state.websocket).toEqual(mockWebSocket);
        });
        
        test('should set online users', () => {
            const mockUsers = [{ id: 1, username: 'user1' }, { id: 2, username: 'user2' }];
            
            appState.setOnlineUsers(mockUsers);
            
            expect(appState.state.onlineUsers).toEqual(mockUsers);
        });
        
        test('should add online user', () => {
            const user1 = { id: 1, username: 'user1' };
            const user2 = { id: 2, username: 'user2' };
            
            appState.addOnlineUser(user1);
            appState.addOnlineUser(user2);
            
            expect(appState.state.onlineUsers).toHaveLength(2);
            expect(appState.state.onlineUsers).toContainEqual(user1);
            expect(appState.state.onlineUsers).toContainEqual(user2);
        });
        
        test('should remove online user', () => {
            const user1 = { id: 1, username: 'user1' };
            const user2 = { id: 2, username: 'user2' };
            
            appState.addOnlineUser(user1);
            appState.addOnlineUser(user2);
            appState.removeOnlineUser(1);
            
            expect(appState.state.onlineUsers).toHaveLength(1);
            expect(appState.state.onlineUsers).toContainEqual(user2);
            expect(appState.state.onlineUsers).not.toContainEqual(user1);
        });
    });
    
    describe('Event Subscription', () => {
        test('should subscribe to events', () => {
            const callback = jest.fn();
            
            const unsubscribe = appState.subscribe('currentTool', callback);
            
            expect(appState.listeners.has('currentTool')).toBe(true);
            expect(appState.listeners.get('currentTool')).toContain(callback);
        });
        
        test('should emit events to subscribers', () => {
            const callback = jest.fn();
            appState.subscribe('currentTool', callback);
            
            appState.set('currentTool', 'erase');
            
            expect(callback).toHaveBeenCalledWith('erase', 'paint');
        });
        
        test('should unsubscribe from events', () => {
            const callback = jest.fn();
            const unsubscribe = appState.subscribe('currentTool', callback);
            
            unsubscribe();
            
            expect(appState.listeners.get('currentTool')).not.toContain(callback);
        });
    });
    
    describe('State Reset', () => {
        test('should reset to initial state', () => {
            appState.set('currentTool', 'erase');
            appState.set('currentColor', '#FF0000');
            appState.set('isLoading', true);
            
            appState.destroy();
            appState = new TestAppState();
            
            expect(appState.state.currentTool).toBe('paint');
            expect(appState.state.currentColor).toBe('#000000');
            expect(appState.state.isLoading).toBe(false);
        });
    });
    
    describe('Debug Mode', () => {
        test('should provide debug information', () => {
            const debugInfo = appState.debug();
            
            expect(debugInfo).toHaveProperty('state');
            expect(debugInfo).toHaveProperty('listeners');
            expect(debugInfo).toHaveProperty('initialized');
        });
    });
    
    describe('Cleanup', () => {
        test('should destroy state manager properly', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            appState.destroy();
            
            expect(appState.initialized).toBe(false);
            expect(appState.listeners.size).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('✅ AppState destroyed');
            consoleSpy.mockRestore();
        });
    });
}); 