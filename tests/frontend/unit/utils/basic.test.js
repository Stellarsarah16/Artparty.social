/**
 * Basic Utility Tests
 * Simple tests to verify the testing infrastructure works
 */

describe('Basic Test Infrastructure', () => {
    test('should have DOM environment available', () => {
        expect(document).toBeDefined();
        expect(window).toBeDefined();
        expect(document.createElement).toBeDefined();
    });

    test('should have fetch mock available', () => {
        expect(fetch).toBeDefined();
        expect(typeof fetch).toBe('function');
    });

    test('should have test utilities available', () => {
        expect(testUtils).toBeDefined();
        expect(testUtils.createMockUser).toBeDefined();
        expect(testUtils.mockFetchSuccess).toBeDefined();
    });

    test('should be able to create DOM elements', () => {
        const div = document.createElement('div');
        div.textContent = 'Test Element';
        document.body.appendChild(div);
        
        expect(document.body.contains(div)).toBe(true);
        expect(div.textContent).toBe('Test Element');
    });

    test('should be able to mock fetch responses', async () => {
        const mockData = { message: 'Hello World' };
        testUtils.mockFetchSuccess(mockData);
        
        const response = await fetch('/test');
        const data = await response.json();
        
        expect(response.ok).toBe(true);
        expect(data).toEqual(mockData);
    });
}); 