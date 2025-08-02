/**
 * Configuration Tests
 * Tests for the application configuration
 */

describe('Configuration Tests', () => {
    test('should have CONFIG_UTILS available', () => {
        expect(CONFIG_UTILS).toBeDefined();
        expect(typeof CONFIG_UTILS.getApiUrl).toBe('function');
        expect(typeof CONFIG_UTILS.getAuthToken).toBe('function');
    });

    test('should have API_CONFIG available', () => {
        expect(API_CONFIG).toBeDefined();
        expect(API_CONFIG.BASE_URL).toBeDefined();
        expect(API_CONFIG.ENDPOINTS).toBeDefined();
    });

    test('should have APP_CONFIG available', () => {
        expect(APP_CONFIG).toBeDefined();
        expect(APP_CONFIG.STORAGE).toBeDefined();
        expect(APP_CONFIG.CANVAS).toBeDefined();
    });

    test('CONFIG_UTILS.getApiUrl should return correct URL', () => {
        const url = CONFIG_UTILS.getApiUrl('/test');
        expect(url).toContain('http://localhost:8000');
        expect(url).toContain('/test');
    });

    test('CONFIG_UTILS.getAuthHeaders should return headers object', () => {
        const headers = CONFIG_UTILS.getAuthHeaders();
        expect(headers).toHaveProperty('Authorization');
        expect(headers).toHaveProperty('Content-Type');
    });
}); 