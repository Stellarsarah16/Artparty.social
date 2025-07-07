/**
 * Canvas Service
 * Handles canvas-related API operations
 */

import { eventManager } from '../utils/events.js';
import { uiUtils } from '../utils/ui.js';

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
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.CANVAS), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const canvases = await response.json();
                return canvases;
            } else {
                throw new Error(`Failed to fetch canvases: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Failed to get canvases:', error);
            uiUtils.showToast('Failed to load canvases', 'error');
            throw error;
        }
    }
    
    /**
     * Get canvas data with tiles
     */
    async getCanvasData(canvasId) {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(`${API_CONFIG.ENDPOINTS.CANVAS}/${canvasId}`), {
                headers: CONFIG_UTILS.getAuthHeaders()
            });
            
            if (response.ok) {
                const canvasData = await response.json();
                return canvasData;
            } else {
                throw new Error(`Failed to fetch canvas data: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Failed to get canvas data:', error);
            uiUtils.showToast('Failed to load canvas data', 'error');
            throw error;
        }
    }
    
    /**
     * Create a new canvas
     */
    async createCanvas(canvasData) {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.CANVAS), {
                method: 'POST',
                headers: CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(canvasData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                eventManager.emit('canvas:created', data);
                uiUtils.showToast('Canvas created successfully!', 'success');
                return { success: true, canvas: data };
            } else {
                uiUtils.showToast(data.detail || 'Failed to create canvas', 'error');
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Failed to create canvas:', error);
            uiUtils.showToast('Network error during canvas creation', 'error');
            return { success: false, error: { message: error.message } };
        }
    }
    
    /**
     * Save a tile
     */
    async saveTile(tileData) {
        try {
            const response = await fetch(CONFIG_UTILS.getApiUrl(API_CONFIG.ENDPOINTS.TILES), {
                method: 'POST',
                headers: CONFIG_UTILS.getAuthHeaders(),
                body: JSON.stringify(tileData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                eventManager.emit('tile:saved', data);
                uiUtils.showToast('Tile saved successfully!', 'success');
                return { success: true, tile: data };
            } else {
                uiUtils.showToast(data.detail || 'Failed to save tile', 'error');
                return { success: false, error: data };
            }
            
        } catch (error) {
            console.error('Failed to save tile:', error);
            uiUtils.showToast('Network error during tile save', 'error');
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