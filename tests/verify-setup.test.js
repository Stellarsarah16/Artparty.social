/**
 * Setup Verification Test
 * This test verifies that the Jest configuration and setup files work correctly
 */

describe('Jest Setup Verification', () => {
    test('should have all required global objects', () => {
        // Check DOM environment
        expect(document).toBeDefined();
        expect(window).toBeDefined();
        
        // Check mocks
        expect(fetch).toBeDefined();
        expect(WebSocket).toBeDefined();
        
        // Check test utilities
        expect(testUtils).toBeDefined();
        expect(CONFIG_UTILS).toBeDefined();
        expect(API_CONFIG).toBeDefined();
        expect(APP_CONFIG).toBeDefined();
    });

    test('should be able to use test utilities', () => {
        const mockUser = testUtils.createMockUser({ username: 'testuser' });
        expect(mockUser.username).toBe('testuser');
        expect(mockUser.id).toBe(1);
    });

    test('should be able to mock API calls', async () => {
        const mockData = { success: true, data: 'test' };
        testUtils.mockFetchSuccess(mockData);
        
        const response = await fetch('/api/test');
        const data = await response.json();
        
        expect(data).toEqual(mockData);
    });

    test('should have proper console mocking', () => {
        console.log('test message');
        expect(console.log).toHaveBeenCalledWith('test message');
    });
}); 