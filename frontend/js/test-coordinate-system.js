/**
 * Coordinate System Unit Tests
 * Tests the coordinate conversion logic between viewport manager and renderer
 */

// Mock the managers for testing
class MockCanvasViewportManager {
    constructor() {
        this.viewport = { x: 0, y: 0, zoom: 1 };
    }
    
    setViewport(x, y, zoom) {
        this.viewport.x = x;
        this.viewport.y = y;
        this.viewport.zoom = zoom;
    }
    
    getViewport() {
        return { ...this.viewport };
    }
    
    screenToWorld(screenX, screenY) {
        // Use the working coordinate system: (screenX / zoom) + viewport.x
        const worldX = (screenX / this.viewport.zoom) + this.viewport.x;
        const worldY = (screenY / this.viewport.zoom) + this.viewport.y;
        
        return { x: worldX, y: worldY };
    }
    
    worldToScreen(worldX, worldY) {
        // Inverse of screenToWorld: (worldX - viewport.x) * zoom
        const screenX = (worldX - this.viewport.x) * this.viewport.zoom;
        const screenY = (worldY - this.viewport.y) * this.viewport.zoom;
        
        return { x: screenX, y: worldY };
    }
}

class MockCanvasRenderer {
    constructor(viewportManager) {
        this.viewportManager = viewportManager;
        this.canvasData = { tile_size: 32 };
        this.tiles = new Map();
    }
    
    screenToWorld(screenX, screenY) {
        if (!this.viewportManager) {
            return { x: screenX, y: screenY };
        }
        
        // Delegate to viewport manager for consistency
        return this.viewportManager.screenToWorld(screenX, screenY);
    }
}

// Test suite
class CoordinateSystemTests {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    // Add a test
    test(name, testFunction) {
        this.tests.push({ name, testFunction });
    }
    
    // Run all tests
    runAll() {
        console.log('🧪 Running Coordinate System Tests...\n');
        
        this.tests.forEach((test, index) => {
            console.log(`Test ${index + 1}: ${test.name}`);
            try {
                const result = test.testFunction();
                if (result === true) {
                    console.log('✅ PASSED\n');
                    this.passed++;
                } else {
                    console.log('❌ FAILED\n');
                    this.failed++;
                }
            } catch (error) {
                console.log(`❌ FAILED with error: ${error.message}\n`);
                this.failed++;
            }
        });
        
        this.printSummary();
    }
    
    // Print test summary
    printSummary() {
        console.log('📊 Test Results Summary');
        console.log('========================');
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`📋 Total: ${this.tests.length}`);
        
        if (this.failed === 0) {
            console.log('\n🎉 All tests passed! Coordinate system is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the coordinate system implementation.');
        }
    }
    
    // Assertion helper
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: Expected ${expected}, got ${actual}`);
        }
        return true;
    }
    
    // Assertion helper for objects
    assertObjectEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr !== expectedStr) {
            throw new Error(`${message}: Expected ${expectedStr}, got ${actualStr}`);
        }
        return true;
    }
    
    // Assertion helper for approximate equality
    assertApproxEqual(actual, expected, tolerance = 0.001, message) {
        if (Math.abs(actual - expected) > tolerance) {
            throw new Error(`${message}: Expected ${expected} ± ${tolerance}, got ${actual}`);
        }
        return true;
    }
}

// Create test suite
const testSuite = new CoordinateSystemTests();

// Test 1: Basic coordinate conversion
testSuite.test('Basic coordinate conversion with zoom 1', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(0, 0, 1);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: 100, y: 50 };
    
    return testSuite.assertObjectEqual(result, expected, 'Basic coordinate conversion failed');
});

// Test 2: Coordinate conversion with zoom 2
testSuite.test('Coordinate conversion with zoom 2', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(0, 0, 2);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: 50, y: 25 };
    
    return testSuite.assertObjectEqual(result, expected, 'Zoom 2 coordinate conversion failed');
});

// Test 3: Coordinate conversion with viewport offset
testSuite.test('Coordinate conversion with viewport offset', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 1);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: 0, y: 0 };
    
    return testSuite.assertObjectEqual(result, expected, 'Viewport offset coordinate conversion failed');
});

// Test 4: Coordinate conversion with zoom and offset
testSuite.test('Coordinate conversion with zoom and offset', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 2);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: -50, y: -25 };
    
    return testSuite.assertObjectEqual(result, expected, 'Zoom and offset coordinate conversion failed');
});

// Test 5: World to screen conversion (inverse)
testSuite.test('World to screen conversion (inverse)', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 2);
    
    const worldPos = { x: 0, y: 0 };
    const screenPos = viewportManager.worldToScreen(worldPos.x, worldPos.y);
    const expected = { x: -100, y: -50 };
    
    return testSuite.assertObjectEqual(screenPos, expected, 'World to screen conversion failed');
});

// Test 6: Round-trip conversion
testSuite.test('Round-trip coordinate conversion', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 2);
    
    const originalScreen = { x: 100, y: 50 };
    const worldPos = viewportManager.screenToWorld(originalScreen.x, originalScreen.y);
    const backToScreen = viewportManager.worldToScreen(worldPos.x, worldPos.y);
    
    return testSuite.assertObjectEqual(backToScreen, originalScreen, 'Round-trip conversion failed');
});

// Test 7: Renderer delegation to viewport manager
testSuite.test('Renderer delegates to viewport manager', () => {
    const viewportManager = new MockCanvasViewportManager();
    const renderer = new MockCanvasRenderer(viewportManager);
    
    viewportManager.setViewport(-100, -50, 2);
    
    const viewportResult = viewportManager.screenToWorld(100, 50);
    const rendererResult = renderer.screenToWorld(100, 50);
    
    return testSuite.assertObjectEqual(rendererResult, viewportResult, 'Renderer delegation failed');
});

// Test 8: Tile coordinate calculation
testSuite.test('Tile coordinate calculation', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 2);
    
    const screenX = 100;
    const screenY = 50;
    const worldPos = viewportManager.screenToWorld(screenX, screenY);
    
    const tileSize = 32;
    const tileX = Math.floor(worldPos.x / tileSize);
    const tileY = Math.floor(worldPos.y / tileSize);
    
    const expectedTileX = Math.floor(-50 / 32); // -1
    const expectedTileY = Math.floor(-25 / 32); // 0
    
    return testSuite.assertEqual(tileX, expectedTileX, 'Tile X calculation failed') &&
           testSuite.assertEqual(tileY, expectedTileY, 'Tile Y calculation failed');
});

// Test 9: Edge case: zoom 0.5
testSuite.test('Edge case: zoom 0.5', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(0, 0, 0.5);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: 200, y: 100 };
    
    return testSuite.assertObjectEqual(result, expected, 'Zoom 0.5 coordinate conversion failed');
});

// Test 10: Edge case: large viewport offset
testSuite.test('Edge case: large viewport offset', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-1000, -500, 1);
    
    const result = viewportManager.screenToWorld(100, 50);
    const expected = { x: -900, y: -450 };
    
    return testSuite.assertObjectEqual(result, expected, 'Large viewport offset failed');
});

// Test 11: Consistency between managers
testSuite.test('Consistency between viewport manager and renderer', () => {
    const viewportManager = new MockCanvasViewportManager();
    const renderer = new MockCanvasRenderer(viewportManager);
    
    viewportManager.setViewport(-100, -50, 2);
    
    const testCases = [
        { screen: { x: 0, y: 0 }, expected: { x: -100, y: -50 } },
        { screen: { x: 100, y: 50 }, expected: { x: -50, y: -25 } },
        { screen: { x: 200, y: 100 }, expected: { x: 0, y: 0 } }
    ];
    
    for (const testCase of testCases) {
        const viewportResult = viewportManager.screenToWorld(testCase.screen.x, testCase.screen.y);
        const rendererResult = renderer.screenToWorld(testCase.screen.x, testCase.screen.y);
        
        if (!testSuite.assertObjectEqual(viewportResult, rendererResult, 'Manager consistency failed')) {
            return false;
        }
        
        if (!testSuite.assertObjectEqual(viewportResult, testCase.expected, 'Coordinate accuracy failed')) {
            return false;
        }
    }
    
    return true;
});

// Test 12: Mathematical properties
testSuite.test('Mathematical properties of coordinate system', () => {
    const viewportManager = new MockCanvasViewportManager();
    viewportManager.setViewport(-100, -50, 2);
    
    // Test 1: Scaling property
    const scaleTest1 = viewportManager.screenToWorld(100, 50);
    const scaleTest2 = viewportManager.screenToWorld(200, 100);
    
    // The difference should be scaled by zoom
    const diffX = scaleTest2.x - scaleTest1.x;
    const diffY = scaleTest2.y - scaleTest1.y;
    const expectedDiffX = 100 / 2; // (200-100) / zoom
    const expectedDiffY = 50 / 2;  // (100-50) / zoom
    
    return testSuite.assertApproxEqual(diffX, expectedDiffX, 0.001, 'Scaling property X failed') &&
           testSuite.assertApproxEqual(diffY, expectedDiffY, 0.001, 'Scaling property Y failed');
});

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CoordinateSystemTests, MockCanvasViewportManager, MockCanvasRenderer };
}

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    testSuite.runAll();
} else {
    // Browser environment
    console.log('🧪 Coordinate System Unit Tests loaded');
    console.log('Run testSuite.runAll() to execute tests');
    window.testSuite = testSuite;
}
