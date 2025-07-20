/**
 * Canvas Service
 * Handles canvas-related API operations
 */

import { eventManager } from '../utils/events.js';

class CanvasService {
    constructor() {
        this.initialized = false;
    }
    
    /**
     * Initialize the canvas service
     */
    init() {
        if (this.initialized) {
            console.warn('Canvas service already initialized');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Canvas service initialized');
    }
    
    /**
     * Get all canvases
     */
    async getCanvases() {
        try {
            const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.CANVAS), {
                headers: window.CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const canvases = await response.json();
                return canvases;
            } else {
                throw new Error(`Failed to fetch canvases: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Failed to get canvases:', error);
            
            // Show toast if uiUtils is available
            if (window.UIManager) {
                window.UIManager.showToast('Failed to load canvases', 'error');
            }
            
            throw error;
        }
    }
    
    /**
     * Get canvas data with tiles
     */
    async getCanvasData(canvasId) {
        try {
            const response = await fetch(window.CONFIG_UTILS.getApiUrl(`${window.API_CONFIG.ENDPOINTS.CANVAS}${canvasId}`), {
                headers: window.CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const canvasData = await response.json();
                return canvasData;
            } else {
                throw new Error(`Failed to fetch canvas data: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Failed to get canvas data:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Failed to load canvas data', 'error');
            }
            throw error;
        }
    }
    
    /**
     * Create a new canvas
     */
    async createCanvas(canvasData) {
        try {
            const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.CANVAS), {
                method: 'POST',
                headers: window.CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(canvasData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                eventManager.emit('canvas:created', data);
                if (window.UIManager) {
                    window.UIManager.showToast('Canvas created successfully!', 'success');
                }
                return { success: true, canvas: data };
            } else {
                if (window.UIManager) {
                    window.UIManager.showToast(data.detail || 'Failed to create canvas', 'error');
                }
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Failed to create canvas:', error);
            if (window.UIManager) {
                window.UIManager.showToast('Network error during canvas creation', 'error');
            }
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Save a tile
     */
    async saveTile(tileData) {
        try {
            // Use the main API client for consistent error handling
            if (window.API && window.API.tiles) {
                const response = await window.API.tiles.create(tileData);
                eventManager.emit('tile:saved', response);
                if (window.UIManager) {
                    window.UIManager.showToast('Tile saved successfully!', 'success');
                }
                return { success: true, tile: response };
            } else {
                // Fallback to direct fetch if API client not available
                const response = await fetch(window.CONFIG_UTILS.getApiUrl(window.API_CONFIG.ENDPOINTS.TILES), {
                    method: 'POST',
                    headers: window.CONFIG_UTILS.getAuthHeaders(),
                    body: JSON.stringify(tileData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    eventManager.emit('tile:saved', data);
                    if (window.UIManager) {
                        window.UIManager.showToast('Tile saved successfully!', 'success');
                    }
                    return { success: true, tile: data };
                } else {
                    if (window.UIManager) {
                        window.UIManager.showToast(data.detail || 'Failed to save tile', 'error');
                    }
                    return { success: false, error: data };
                }
            }
            
        } catch (error) {
            console.error('Failed to save tile:', error);
            
            // Show error message to user
            if (window.UIManager) {
                let errorMessage = 'Failed to save tile';
                
                // Extract error message from API response
                if (error.data && error.data.detail) {
                    if (Array.isArray(error.data.detail)) {
                        errorMessage = error.data.detail[0]?.msg || error.data.detail[0]?.detail || errorMessage;
                    } else {
                        errorMessage = error.data.detail;
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                window.UIManager.showToast(errorMessage, 'error');
            }
            
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Destroy the canvas service
     */
    destroy() {
        this.initialized = false;
        console.log('✅ Canvas service destroyed');
    }
}

// Create singleton instance
const canvasService = new CanvasService();

// Export for use in other modules
export { canvasService };
export default canvasService; 