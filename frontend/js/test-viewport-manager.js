/**
 * Viewport Manager Test Suite
 * 
 * SAFETY: Test the extracted viewport manager to ensure it works correctly
 * before integrating with the main canvas viewer
 */

// Test functions available globally
window.testViewportManager = {
    
    /**
     * Test 1: Basic initialization
     */
    testInitialization: function() {
        console.log('🧪 Test 1: Viewport Manager Initialization');
        console.log('==========================================');
        
        // Check if viewport manager exists
        if (!window.viewportManager) {
            console.error('❌ Viewport manager not found');
            return false;
        }
        
        console.log('✅ Viewport manager exists:', window.viewportManager);
        
        // Check initial state
        const viewport = window.viewportManager.getViewport();
        console.log('Initial viewport:', viewport);
        
        const expectedInitial = { x: 0, y: 0, zoom: 1 };
        const isCorrect = viewport.x === expectedInitial.x && 
                         viewport.y === expectedInitial.y && 
                         viewport.zoom === expectedInitial.zoom;
        
        if (isCorrect) {
            console.log('✅ Initial viewport state is correct');
            return true;
        } else {
            console.error('❌ Initial viewport state is incorrect');
            return false;
        }
    },
    
    /**
     * Test 2: Canvas initialization
     */
    testCanvasInit: function() {
        console.log('\n🧪 Test 2: Canvas Initialization');
        console.log('=================================');
        
        // Find a canvas element to test with
        const canvas = document.querySelector('#canvas-viewer');
        if (!canvas) {
            console.warn('⚠️ No canvas element found - creating test canvas');
            const testCanvas = document.createElement('canvas');
            testCanvas.id = 'test-canvas';
            testCanvas.width = 800;
            testCanvas.height = 600;
            document.body.appendChild(testCanvas);
            
            window.viewportManager.init(testCanvas);
            console.log('✅ Viewport manager initialized with test canvas');
            return true;
        } else {
            window.viewportManager.init(canvas);
            console.log('✅ Viewport manager initialized with existing canvas');
            return true;
        }
    },
    
    /**
     * Test 3: Coordinate conversion
     */
    testCoordinateConversion: function() {
        console.log('\n🧪 Test 3: Coordinate Conversion');
        console.log('=================================');
        
        // Test screen to world conversion
        const screenX = 100;
        const screenY = 100;
        
        const worldCoords = window.viewportManager.screenToWorld(screenX, screenY);
        console.log(`Screen (${screenX}, ${screenY}) → World (${worldCoords.x.toFixed(2)}, ${worldCoords.y.toFixed(2)})`);
        
        // Test world to screen conversion (inverse)
        const backToScreen = window.viewportManager.worldToScreen(worldCoords.x, worldCoords.y);
        console.log(`World (${worldCoords.x.toFixed(2)}, ${worldCoords.y.toFixed(2)}) → Screen (${backToScreen.x.toFixed(2)}, ${backToScreen.y.toFixed(2)})`);
        
        // Check if conversion is accurate (allowing for small floating point errors)
        const accuracy = Math.abs(backToScreen.x - screenX) < 0.1 && Math.abs(backToScreen.y - screenY) < 0.1;
        
        if (accuracy) {
            console.log('✅ Coordinate conversion is accurate');
            return true;
        } else {
            console.error('❌ Coordinate conversion is inaccurate');
            console.error('Expected:', { x: screenX, y: screenY });
            console.error('Got:', backToScreen);
            return false;
        }
    },
    
    /**
     * Test 4: Pan operations
     */
    testPanOperations: function() {
        console.log('\n🧪 Test 4: Pan Operations');
        console.log('=========================');
        
        // Reset to known state
        window.viewportManager.setViewport(0, 0, 1);
        const initialViewport = window.viewportManager.getViewport();
        console.log('Initial viewport:', initialViewport);
        
        // Test pan right (positive deltaX)
        window.viewportManager.pan(100, 0);
        const afterPanRight = window.viewportManager.getViewport();
        console.log('After pan right (100, 0):', afterPanRight);
        
        // Pan right should move viewport left (negative X)
        const expectedX = -100; // deltaX / zoom = 100 / 1 = 100, then viewportX -= 100
        if (Math.abs(afterPanRight.x - expectedX) < 0.1) {
            console.log('✅ Pan right operation is correct');
        } else {
            console.error('❌ Pan right operation is incorrect');
            console.error(`Expected X: ${expectedX}, Got X: ${afterPanRight.x}`);
        }
        
        // Test pan down (positive deltaY)
        window.viewportManager.pan(0, 50);
        const afterPanDown = window.viewportManager.getViewport();
        console.log('After pan down (0, 50):', afterPanDown);
        
        // Pan down should move viewport up (negative Y)
        const expectedY = -50; // deltaY / zoom = 50 / 1 = 50, then viewportY -= 50
        if (Math.abs(afterPanDown.y - expectedY) < 0.1) {
            console.log('✅ Pan down operation is correct');
            return true;
        } else {
            console.error('❌ Pan down operation is incorrect');
            console.error(`Expected Y: ${expectedY}, Got Y: ${afterPanDown.y}`);
            return false;
        }
    },
    
    /**
     * Test 5: Zoom operations
     */
    testZoomOperations: function() {
        console.log('\n🧪 Test 5: Zoom Operations');
        console.log('===========================');
        
        // Reset to known state
        window.viewportManager.setViewport(0, 0, 1);
        const initialViewport = window.viewportManager.getViewport();
        console.log('Initial viewport:', initialViewport);
        
        // Test zoom in at center
        const centerX = 400; // Assuming canvas center
        const centerY = 300;
        
        window.viewportManager.zoomToward(2.0, centerX, centerY);
        const afterZoom = window.viewportManager.getViewport();
        console.log(`After zoom 2x at (${centerX}, ${centerY}):`, afterZoom);
        
        // Check if zoom level is correct
        if (Math.abs(afterZoom.zoom - 2.0) < 0.1) {
            console.log('✅ Zoom level is correct');
        } else {
            console.error('❌ Zoom level is incorrect');
            console.error(`Expected zoom: 2.0, Got zoom: ${afterZoom.zoom}`);
        }
        
        // Test zoom constraints
        window.viewportManager.zoomToward(1000, centerX, centerY); // Should be clamped to maxZoom
        const afterExtremeZoom = window.viewportManager.getViewport();
        console.log('After extreme zoom:', afterExtremeZoom);
        
        if (afterExtremeZoom.zoom <= 10.1) { // maxZoom = 10
            console.log('✅ Zoom constraints are working');
            return true;
        } else {
            console.error('❌ Zoom constraints are not working');
            console.error(`Expected max zoom: 10, Got zoom: ${afterExtremeZoom.zoom}`);
            return false;
        }
    },
    
    /**
     * Test 6: Viewport bounds and visibility
     */
    testVisibilityChecks: function() {
        console.log('\n🧪 Test 6: Visibility Checks');
        console.log('=============================');
        
        // Reset to known state
        window.viewportManager.setViewport(0, 0, 1);
        
        // Test visibility check
        const isVisible = window.viewportManager.isVisible(100, 100);
        console.log('Point (100, 100) is visible:', isVisible);
        
        // Get visible bounds
        const bounds = window.viewportManager.getVisibleBounds();
        console.log('Visible bounds:', bounds);
        
        // Check if bounds make sense
        if (bounds.right > bounds.left && bounds.bottom > bounds.top) {
            console.log('✅ Visible bounds are logical');
            return true;
        } else {
            console.error('❌ Visible bounds are illogical');
            return false;
        }
    },
    
    /**
     * Run all tests
     */
    runAllTests: function() {
        console.log('🧪 RUNNING VIEWPORT MANAGER TEST SUITE');
        console.log('======================================');
        
        const tests = [
            'testInitialization',
            'testCanvasInit', 
            'testCoordinateConversion',
            'testPanOperations',
            'testZoomOperations',
            'testVisibilityChecks'
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const testName of tests) {
            try {
                const result = this[testName]();
                if (result) {
                    passed++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`❌ Test ${testName} threw error:`, error);
                failed++;
            }
        }
        
        console.log('\n📊 TEST RESULTS');
        console.log('===============');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
        
        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Viewport manager is working correctly.');
            return true;
        } else {
            console.log('⚠️ Some tests failed. Viewport manager needs fixes before integration.');
            return false;
        }
    }
};

// Auto-run tests when script loads (if managers are ready)
if (document.readyState === 'complete') {
    setTimeout(() => {
        if (window.viewportManager) {
            console.log('🧪 Auto-running viewport manager tests...');
            window.testViewportManager.runAllTests();
        }
    }, 1000);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.viewportManager) {
                console.log('🧪 Auto-running viewport manager tests...');
                window.testViewportManager.runAllTests();
            }
        }, 1000);
    });
}
