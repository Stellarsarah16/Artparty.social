/**
 * Unit Tests for CanvasService
 * Testing canvas operations, API calls, and service lifecycle
 */

// Mock dependencies
const mockEventManager = {
    emit: jest.fn()
};

const mockUiUtils = {
    showToast: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    hideToast: jest.fn()
};

const mockConfigUtils = {
    getApiUrl: jest.fn(),
    getAuthHeaders: jest.fn()
};

// Mock global fetch
global.fetch = jest.fn();

// Mock global CONFIG_UTILS and API_CONFIG
global.CONFIG_UTILS = mockConfigUtils;
global.API_CONFIG = {
    ENDPOINTS: {
        CANVAS: '/canvas',
        TILES: '/tiles'
    }
};

// Create a simplified CanvasService for testing
class TestCanvasService {
    constructor() {
        this.initialized = false;
        this.eventManager = mockEventManager;
        this.uiUtils = mockUiUtils;
    }
    
    init() {
        if (this.initialized) {
            console.warn('Canvas service already initialized');
            return;
        }
        this.initialized = true;
        console.log('✅ Canvas service initialized');
    }
    
    async getCanvases() {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.CANVAS), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                this.uiUtils.showToast('Failed to load canvases', 'error');
                throw new Error(`Failed to fetch canvases: ${response.status}`);
            }
        } catch (error) {
            this.uiUtils.showToast('Failed to load canvases', 'error');
            throw error;
        }
    }
    
    async getCanvasData(canvasId) {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(`${API_CONFIG.ENDPOINTS.CANVAS}/${canvasId}`), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                this.uiUtils.showToast('Failed to load canvas data', 'error');
                throw new Error(`Failed to fetch canvas data: ${response.status}`);
            }
        } catch (error) {
            this.uiUtils.showToast('Failed to load canvas data', 'error');
            throw error;
        }
    }
    
    async createCanvas(canvasData) {
        try {
            this.uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.CANVAS), {
                method: 'POST',
                headers: CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(canvasData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.eventManager.emit('canvas:created', data);
                this.uiUtils.showToast('Canvas created successfully', 'success');
                return { success: true, canvas: data };
            } else {
                this.uiUtils.showToast(data.detail || 'Failed to create canvas', 'error');
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Canvas creation error:', error);
            this.uiUtils.showToast('Network error during canvas creation', 'error');
            return { success: false, error: { message: error.message } };
        } finally {
            this.uiUtils.hideLoading();
        }
    }
    
    async updateTile(canvasId, tileData) {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(`${API_CONFIG.ENDPOINTS.TILES}/${canvasId}`), {
                method: 'POST',
                headers: CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(tileData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.eventManager.emit('tile:updated', data);
                return { success: true, tile: data };
            } else {
                this.uiUtils.showToast(data.detail || 'Failed to update tile', 'error');
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Tile update error:', error);
            this.uiUtils.showToast('Network error during tile update', 'error');
            return { success: false, error: { message: error.message } };
        }
    }
    
    async deleteCanvas(canvasId) {
        try {
            this.uiUtils.showLoading();
            
            const response = await fetch(CONFIG_UTILS.getApiUrl(`${API_CONFIG.ENDPOINTS.CANVAS}/${canvasId}`), {
                method: 'DELETE',
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                this.eventManager.emit('canvas:deleted', canvasId);
                this.uiUtils.showToast('Canvas deleted successfully', 'success');
                return { success: true };
            } else {
                const data = await response.json();
                this.uiUtils.showToast(data.detail || 'Failed to delete canvas', 'error');
                return { success: false, error: data };
            }
        } catch (error) {
            console.error('Canvas deletion error:', error);
            this.uiUtils.showToast('Network error during canvas deletion', 'error');
            return { success: false, error: { message: error.message } };
        } finally {
            this.uiUtils.hideLoading();
        }
    }

    async saveTile(tileData) {
        try {
            const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.TILES), {
                method: 'POST',
                headers: window.CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(tileData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                mockEventManager.emit('tile:saved', data);
                mockUiUtils.showToast('Tile saved successfully!', 'success');
                return { success: true, tile: data };
            } else {
                mockUiUtils.showToast(data.detail || 'Failed to save tile', 'error');
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Failed to save tile:', error);
            mockUiUtils.showToast('Failed to save tile', 'error');
            return { success: false, error: { message: error.message } };
        }
    }
    
    destroy() {
        this.initialized = false;
        console.log('✅ Canvas service destroyed');
    }
}

describe('CanvasService', () => {
    let canvasService;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        canvasService = new TestCanvasService();
        
        // Setup default mock returns
        mockConfigUtils.getApiUrl.mockImplementation(endpoint => `http://localhost:8000${endpoint}`);
        mockConfigUtils.getAuthHeaders.mockReturnValue({
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
        });
    });

    describe('Initialization', () => {
        test('should initialize correctly', () => {
            expect(canvasService.initialized).toBe(false);
            
            canvasService.init();
            
            expect(canvasService.initialized).toBe(true);
        });

        test('should not initialize twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            canvasService.init();
            canvasService.init();
            
            expect(consoleSpy).toHaveBeenCalledWith('Canvas service already initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('Get Canvases', () => {
        const mockCanvases = [
            { id: 1, name: 'Canvas 1', width: 100, height: 100 },
            { id: 2, name: 'Canvas 2', width: 200, height: 200 }
        ];

        test('should fetch canvases successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCanvases
            });

            const result = await canvasService.getCanvases();

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8000/canvas',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123'
                    })
                })
            );

            expect(result).toEqual(mockCanvases);
        });

        test('should handle fetch failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(canvasService.getCanvases()).rejects.toThrow('Failed to fetch canvases: 404');
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Failed to load canvases', 'error');
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            fetch.mockRejectedValueOnce(networkError);

            await expect(canvasService.getCanvases()).rejects.toThrow('Network error');
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Failed to load canvases', 'error');
        });
    });

    describe('Get Canvas Data', () => {
        const mockCanvasData = {
            id: 1,
            name: 'Test Canvas',
            width: 100,
            height: 100,
            tiles: [
                { x: 0, y: 0, color: '#FF0000' },
                { x: 1, y: 0, color: '#00FF00' }
            ]
        };

        test('should fetch canvas data successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCanvasData
            });

            const result = await canvasService.getCanvasData(1);

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8000/canvas/1',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123'
                    })
                })
            );

            expect(result).toEqual(mockCanvasData);
        });

        test('should handle fetch failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(canvasService.getCanvasData(1)).rejects.toThrow('Failed to fetch canvas data: 404');
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Failed to load canvas data', 'error');
        });
    });

    describe('Create Canvas', () => {
        const mockCanvasData = {
            name: 'New Canvas',
            width: 100,
            height: 100,
            public: true
        };

        const mockResponse = {
            id: 3,
            name: 'New Canvas',
            width: 100,
            height: 100,
            public: true,
            created_at: '2023-01-01T00:00:00Z'
        };

        test('should create canvas successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await canvasService.createCanvas(mockCanvasData);

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8000/canvas',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123',
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(mockCanvasData)
                })
            );

            expect(mockEventManager.emit).toHaveBeenCalledWith('canvas:created', mockResponse);
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Canvas created successfully', 'success');
            expect(result).toEqual({ success: true, canvas: mockResponse });
        });

        test('should handle creation failure', async () => {
            const mockError = { detail: 'Canvas name already exists' };
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await canvasService.createCanvas(mockCanvasData);

            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Canvas name already exists', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            fetch.mockRejectedValueOnce(networkError);

            const result = await canvasService.createCanvas(mockCanvasData);

            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Network error during canvas creation', 'error');
            expect(result).toEqual({ success: false, error: { message: 'Network error' } });
        });
    });

    describe('Save Tile', () => {
        const mockTileData = {
            canvas_id: 1,
            x: 5,
            y: 10,
            color: '#FF0000'
        };

        const mockResponse = {
            id: 123,
            canvas_id: 1,
            x: 5,
            y: 10,
            color: '#FF0000',
            created_at: '2023-01-01T00:00:00Z'
        };

        test('should save tile successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await canvasService.saveTile(mockTileData);

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8000/tiles',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer token123',
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(mockTileData)
                })
            );

            expect(mockEventManager.emit).toHaveBeenCalledWith('tile:saved', mockResponse);
            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Tile saved successfully!', 'success');
            expect(result).toEqual({ success: true, tile: mockResponse });
        });

        test('should handle save failure', async () => {
            const mockError = { detail: 'Tile coordinates out of bounds' };
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockError
            });

            const result = await canvasService.saveTile(mockTileData);

            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Tile coordinates out of bounds', 'error');
            expect(result).toEqual({ success: false, error: mockError });
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            fetch.mockRejectedValueOnce(networkError);

            const result = await canvasService.saveTile(mockTileData);

            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Failed to save tile', 'error');
            expect(result).toEqual({ success: false, error: { message: 'Network error' } });
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed JSON response', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => {
                    throw new Error('Invalid JSON');
                }
            });

            await expect(canvasService.getCanvases()).rejects.toThrow('Invalid JSON');
        });

        test('should handle missing response body', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => null
            });

            const result = await canvasService.createCanvas({});

            expect(mockUiUtils.showToast).toHaveBeenCalledWith('Network error during canvas creation', 'error');
            expect(result).toEqual({ success: false, error: { message: 'Cannot read properties of null (reading \'detail\')' } });
        });
    });

    describe('Service Lifecycle', () => {
        test('should destroy service properly', () => {
            canvasService.init();
            canvasService.destroy();
            
            expect(canvasService.initialized).toBe(false);
        });
    });
}); 