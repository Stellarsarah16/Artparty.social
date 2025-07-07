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

// Import the AppState (would need to be adapted for actual module loading)
import { AppState } from '../../../../frontend/js/core/state.js';

describe('AppState', () => {
    let appState;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        appState = new AppState();
        
        // Mock global dependencies
        appState.eventManager = mockEventManager;
    });

    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(appState.state).toEqual({
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
                lastUpdate: expect.any(Number)
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
            
            expect(consoleSpy).toHaveBeenCalledWith('State already initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('State Persistence', () => {
        test('should load persisted authentication state', () => {
            const mockUser = { id: 1, username: 'testuser' };
            mockConfigUtils.isAuthenticated.mockReturnValue(true);
            mockConfigUtils.getUserData.mockReturnValue(mockUser);

            appState.loadPersistedState();

            expect(appState.state.isAuthenticated).toBe(true);
            expect(appState.state.currentUser).toEqual(mockUser);
        });

        test('should load persisted preferences', () => {
            const mockPreferences = {
                currentTool: 'erase',
                currentColor: '#FF0000'
            };
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPreferences));

            appState.loadPersistedState();

            expect(appState.state.currentTool).toBe('erase');
            expect(appState.state.currentColor).toBe('#FF0000');
        });

        test('should handle missing preferences gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            appState.loadPersistedState();

            expect(appState.state.currentTool).toBe('paint');
            expect(appState.state.currentColor).toBe('#000000');
        });

        test('should handle malformed preferences gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            appState.loadPersistedState();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load persisted state:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        test('should save preferences to localStorage', () => {
            appState.savePersistedState();

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'stellar_preferences',
                JSON.stringify({
                    currentTool: 'paint',
                    currentColor: '#000000'
                })
            );
        });

        test('should handle localStorage save errors', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
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
            expect(mockConfigUtils.setUserData).toHaveBeenCalledWith(mockUser);
        });

        test('should clear user data', () => {
            appState.setUser(null);

            expect(appState.state.currentUser).toBeNull();
            expect(mockConfigUtils.removeUserData).toHaveBeenCalled();
        });
    });

    describe('Canvas State', () => {
        test('should set current canvas', () => {
            const mockCanvas = { id: 1, name: 'Test Canvas' };
            
            appState.setCurrentCanvas(mockCanvas);

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
            expect(mockLocalStorage.setItem).toHaveBeenCalled(); // Should persist
        });

        test('should set current color', () => {
            appState.setCurrentColor('#FF0000');

            expect(appState.state.currentColor).toBe('#FF0000');
            expect(mockLocalStorage.setItem).toHaveBeenCalled(); // Should persist
        });
    });

    describe('WebSocket State', () => {
        test('should set websocket connection', () => {
            const mockWebSocket = { readyState: 1 };
            
            appState.setWebSocket(mockWebSocket);

            expect(appState.state.websocket).toEqual(mockWebSocket);
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
            const unsubscribe = appState.subscribe('state:changed', callback);

            expect(typeof unsubscribe).toBe('function');
            expect(appState.listeners.has('state:changed')).toBe(true);
        });

        test('should emit events to subscribers', () => {
            const callback = jest.fn();
            appState.subscribe('test:event', callback);

            appState.emit('test:event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should unsubscribe from events', () => {
            const callback = jest.fn();
            const unsubscribe = appState.subscribe('test:event', callback);

            unsubscribe();

            expect(appState.listeners.has('test:event')).toBe(false);
        });
    });

    describe('State Reset', () => {
        test('should reset to initial state', () => {
            appState.state.currentTool = 'erase';
            appState.state.currentColor = '#FF0000';
            appState.state.isAuthenticated = true;

            appState.reset();

            expect(appState.state.currentTool).toBe('paint');
            expect(appState.state.currentColor).toBe('#000000');
            expect(appState.state.isAuthenticated).toBe(false);
        });
    });

    describe('Debug Mode', () => {
        test('should provide debug information', () => {
            const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
            const logSpy = jest.spyOn(console, 'log').mockImplementation();

            appState.debug();

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
            expect(appState.listeners.size).toBe(0);
        });
    });
}); 