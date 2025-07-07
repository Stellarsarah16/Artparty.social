/**
 * Integration Tests for Authentication and Canvas Flow
 * Testing complete user journeys from login to canvas interaction
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

// Mock fetch
global.fetch = jest.fn();

// Mock dependencies
const mockApiResponses = {
    login: {
        success: { access_token: 'test_token_123', user: { id: 1, username: 'testuser' } },
        error: { detail: 'Invalid credentials' }
    },
    register: {
        success: { access_token: 'test_token_456', user: { id: 2, username: 'newuser' } },
        error: { detail: 'Username already exists' }
    },
    canvases: [
        { id: 1, name: 'Canvas 1', width: 100, height: 100 },
        { id: 2, name: 'Canvas 2', width: 200, height: 200 }
    ],
    canvasData: {
        id: 1,
        name: 'Test Canvas',
        width: 100,
        height: 100,
        tiles: [
            { x: 0, y: 0, color: '#FF0000' },
            { x: 1, y: 0, color: '#00FF00' }
        ]
    }
};

// Import application components (would need to be adapted for actual module loading)
import { authService } from '../../../frontend/js/services/auth.js';
import { canvasService } from '../../../frontend/js/services/canvas.js';
import { appState } from '../../../frontend/js/core/state.js';
import { eventManager } from '../../../frontend/js/utils/events.js';

describe('Authentication and Canvas Flow Integration', () => {
    let mockToastContainer;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Setup DOM elements
        mockToastContainer = document.createElement('div');
        mockToastContainer.id = 'toast-container';
        document.body.appendChild(mockToastContainer);
        
        // Clear localStorage
        localStorage.clear();
        
        // Initialize services
        eventManager.init();
        appState.init();
        authService.init();
        canvasService.init();
    });

    afterEach(() => {
        // Cleanup DOM
        document.body.innerHTML = '';
        
        // Destroy services
        authService.destroy();
        canvasService.destroy();
        appState.destroy();
        eventManager.destroy();
    });

    describe('Complete User Registration and Login Flow', () => {
        test('should complete registration flow successfully', async () => {
            // Mock successful registration response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponses.register.success
            });

            const userData = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
                password_confirm: 'password123'
            };

            // Execute registration
            const result = await authService.register(userData);

            // Verify registration success
            expect(result.success).toBe(true);
            expect(result.user.username).toBe('newuser');
            
            // Verify state was updated
            expect(appState.get('isAuthenticated')).toBe(true);
            expect(appState.get('currentUser')).toEqual(mockApiResponses.register.success.user);
            
            // Verify token was stored
            expect(localStorage.getItem('stellar_auth_token')).toBe('test_token_456');
        });

        test('should complete login flow successfully', async () => {
            // Mock successful login response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponses.login.success
            });

            const credentials = {
                username: 'testuser',
                password: 'password123'
            };

            // Execute login
            const result = await authService.login(credentials);

            // Verify login success
            expect(result.success).toBe(true);
            expect(result.user.username).toBe('testuser');
            
            // Verify state was updated
            expect(appState.get('isAuthenticated')).toBe(true);
            expect(appState.get('currentUser')).toEqual(mockApiResponses.login.success.user);
            
            // Verify token was stored
            expect(localStorage.getItem('stellar_auth_token')).toBe('test_token_123');
        });

        test('should handle login failure gracefully', async () => {
            // Mock failed login response
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockApiResponses.login.error
            });

            const credentials = {
                username: 'testuser',
                password: 'wrongpassword'
            };

            // Execute login
            const result = await authService.login(credentials);

            // Verify login failure
            expect(result.success).toBe(false);
            expect(result.error.detail).toBe('Invalid credentials');
            
            // Verify state was not updated
            expect(appState.get('isAuthenticated')).toBe(false);
            expect(appState.get('currentUser')).toBeNull();
            
            // Verify no token was stored
            expect(localStorage.getItem('stellar_auth_token')).toBeNull();
        });
    });

    describe('Authenticated Canvas Flow', () => {
        beforeEach(async () => {
            // Setup authenticated state
            localStorage.setItem('stellar_auth_token', 'test_token_123');
            appState.setAuthenticated(true);
            appState.setUser(mockApiResponses.login.success.user);
        });

        test('should load canvases after authentication', async () => {
            // Mock canvases response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponses.canvases
            });

            // Execute canvas loading
            const canvases = await canvasService.getCanvases();

            // Verify canvases loaded
            expect(canvases).toEqual(mockApiResponses.canvases);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/canvas'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': expect.stringContaining('Bearer')
                    })
                })
            );
        });

        test('should load canvas data and update state', async () => {
            // Mock canvas data response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponses.canvasData
            });

            // Execute canvas data loading
            const canvasData = await canvasService.getCanvasData(1);

            // Verify canvas data loaded
            expect(canvasData).toEqual(mockApiResponses.canvasData);
            
            // Update state with canvas data
            appState.setCurrentCanvas(canvasData);
            
            // Verify state updated
            expect(appState.get('currentCanvas')).toEqual(mockApiResponses.canvasData);
        });

        test('should create new canvas successfully', async () => {
            const newCanvas = {
                name: 'New Canvas',
                width: 100,
                height: 100,
                public: true
            };

            const createdCanvas = {
                id: 3,
                ...newCanvas,
                created_at: '2023-01-01T00:00:00Z'
            };

            // Mock canvas creation response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createdCanvas
            });

            // Execute canvas creation
            const result = await canvasService.createCanvas(newCanvas);

            // Verify canvas created
            expect(result.success).toBe(true);
            expect(result.canvas.name).toBe('New Canvas');
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/canvas'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(newCanvas)
                })
            );
        });

        test('should save tile successfully', async () => {
            const tileData = {
                canvas_id: 1,
                x: 5,
                y: 10,
                color: '#FF0000'
            };

            const savedTile = {
                id: 123,
                ...tileData,
                created_at: '2023-01-01T00:00:00Z'
            };

            // Mock tile save response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => savedTile
            });

            // Execute tile save
            const result = await canvasService.saveTile(tileData);

            // Verify tile saved
            expect(result.success).toBe(true);
            expect(result.tile.color).toBe('#FF0000');
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/tiles'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(tileData)
                })
            );
        });
    });

    describe('Event-Driven State Updates', () => {
        test('should update UI state on login success', async () => {
            // Setup event listener
            let loginEventFired = false;
            let loginEventData = null;
            
            eventManager.on('login:success', (data) => {
                loginEventFired = true;
                loginEventData = data;
            });

            // Mock successful login
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockApiResponses.login.success
            });

            // Execute login
            await authService.login({ username: 'testuser', password: 'password123' });

            // Verify event fired
            expect(loginEventFired).toBe(true);
            expect(loginEventData).toEqual(mockApiResponses.login.success.user);
        });

        test('should update state on canvas creation', async () => {
            // Setup event listener
            let canvasCreatedEventFired = false;
            let canvasCreatedEventData = null;
            
            eventManager.on('canvas:created', (data) => {
                canvasCreatedEventFired = true;
                canvasCreatedEventData = data;
            });

            const newCanvas = { name: 'Test Canvas', width: 100, height: 100 };
            const createdCanvas = { id: 1, ...newCanvas };

            // Mock canvas creation
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => createdCanvas
            });

            // Execute canvas creation
            await canvasService.createCanvas(newCanvas);

            // Verify event fired
            expect(canvasCreatedEventFired).toBe(true);
            expect(canvasCreatedEventData).toEqual(createdCanvas);
        });
    });

    describe('Session Management Flow', () => {
        test('should handle token expiration gracefully', async () => {
            // Setup authenticated state
            localStorage.setItem('stellar_auth_token', 'expired_token');
            appState.setAuthenticated(true);

            // Mock token verification failure
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            // Execute token verification
            const isValid = await authService.verifyToken();

            // Verify token invalidated
            expect(isValid).toBe(false);
            expect(localStorage.getItem('stellar_auth_token')).toBeNull();
            expect(appState.get('isAuthenticated')).toBe(false);
        });

        test('should complete logout flow successfully', async () => {
            // Setup authenticated state
            localStorage.setItem('stellar_auth_token', 'test_token_123');
            appState.setAuthenticated(true);
            appState.setUser(mockApiResponses.login.success.user);

            // Mock logout response
            fetch.mockResolvedValueOnce({ ok: true });

            // Execute logout
            const result = await authService.logout();

            // Verify logout success
            expect(result.success).toBe(true);
            expect(localStorage.getItem('stellar_auth_token')).toBeNull();
            expect(appState.get('isAuthenticated')).toBe(false);
            expect(appState.get('currentUser')).toBeNull();
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle network errors gracefully', async () => {
            // Mock network error
            fetch.mockRejectedValueOnce(new Error('Network error'));

            // Execute login
            const result = await authService.login({ username: 'test', password: 'test' });

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.error.message).toBe('Network error');
            expect(appState.get('isAuthenticated')).toBe(false);
        });

        test('should handle canvas API errors gracefully', async () => {
            // Setup authenticated state
            localStorage.setItem('stellar_auth_token', 'test_token_123');
            appState.setAuthenticated(true);

            // Mock canvas API error
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ detail: 'Internal server error' })
            });

            // Execute canvas creation
            const result = await canvasService.createCanvas({ name: 'Test' });

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.error.detail).toBe('Internal server error');
        });
    });

    describe('State Persistence', () => {
        test('should persist authentication state across sessions', () => {
            // Setup authenticated state
            const user = mockApiResponses.login.success.user;
            localStorage.setItem('stellar_auth_token', 'test_token_123');
            localStorage.setItem('stellar_user_data', JSON.stringify(user));

            // Reinitialize state
            appState.loadPersistedState();

            // Verify state restored
            expect(appState.get('isAuthenticated')).toBe(true);
            expect(appState.get('currentUser')).toEqual(user);
        });

        test('should persist user preferences', () => {
            // Set user preferences
            appState.setCurrentTool('erase');
            appState.setCurrentColor('#FF0000');

            // Verify preferences saved
            const savedPreferences = JSON.parse(localStorage.getItem('stellar_preferences'));
            expect(savedPreferences.currentTool).toBe('erase');
            expect(savedPreferences.currentColor).toBe('#FF0000');
        });
    });
}); 