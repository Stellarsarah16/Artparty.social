/**
 * Canvas Interaction Manager Test Suite
 * 
 * SAFETY: Test the extracted canvas interaction manager to ensure it works correctly
 * with the viewport manager and handles all user interactions properly
 */

// Test functions available globally
window.testCanvasInteraction = {
    
    /**
     * Test 1: Basic initialization
     */
    testInitialization: function() {
        console.log('🧪 Test 1: Canvas Interaction Manager Initialization');
        console.log('==================================================');
        
        // Check if interaction manager exists
        if (!window.canvasInteraction) {
            console.error('❌ Canvas interaction manager not found');
            return false;
        }
        
        console.log('✅ Canvas interaction manager exists:', window.canvasInteraction);
        
        // Check dependencies
        if (!window.viewportManager) {
            console.error('❌ Viewport manager not found');
            return false;
        }
        
        console.log('✅ Required dependencies available');
        return true;
    },
    
    /**
     * Test 2: Canvas and dependency setup
     */
    testCanvasSetup: function() {
        console.log('\n🧪 Test 2: Canvas and Dependency Setup');
        console.log('======================================');
        
        // Find or create canvas element
        let canvas = document.querySelector('#canvas-viewer');
        if (!canvas) {
            console.warn('⚠️ No canvas element found - creating test canvas');
            canvas = document.createElement('canvas');
            canvas.id = 'test-interaction-canvas';
            canvas.width = 800;
            canvas.height = 600;
            document.body.appendChild(canvas);
        }
        
        // Initialize interaction manager
        window.canvasInteraction.init(canvas);
        console.log('✅ Interaction manager initialized with canvas');
        
        // Set viewport dependency
        window.canvasInteraction.setViewport(window.viewportManager);
        console.log('✅ Viewport dependency set');
        
        // Initialize viewport manager too
        window.viewportManager.init(canvas);
        console.log('✅ Viewport manager initialized');
        
        return true;
    },
    
    /**
     * Test 3: Canvas data setup
     */
    testCanvasDataSetup: function() {
        console.log('\n🧪 Test 3: Canvas Data Setup');
        console.log('=============================');
        
        // Create test canvas data
        const testCanvasData = {
            id: 999,
            name: 'Test Canvas',
            width: 1024,
            height: 1024,
            tile_size: 32
        };
        
        window.canvasInteraction.setCanvasData(testCanvasData);
        console.log('✅ Canvas data set in interaction manager');
        
        // Check if tile size was set
        if (window.canvasInteraction.tileSize === 32) {
            console.log('✅ Tile size correctly set from canvas data');
        } else {
            console.error('❌ Tile size not set correctly');
            return false;
        }
        
        // Create test tiles
        const testTiles = new Map();
        testTiles.set(1, { id: 1, x: 0, y: 0, owner_name: 'TestUser' });
        testTiles.set(2, { id: 2, x: 1, y: 0, owner_name: 'TestUser2' });
        
        window.canvasInteraction.setTiles(testTiles);
        console.log('✅ Test tiles set in interaction manager');
        
        return true;
    },
    
    /**
     * Test 4: Event callback setup
     */
    testEventCallbacks: function() {
        console.log('\n🧪 Test 4: Event Callback Setup');
        console.log('===============================');
        
        let tileClickCalled = false;
        let tileHoverCalled = false;
        let viewportChangeCalled = false;
        
        // Set up test callbacks
        window.canvasInteraction.setEventCallbacks({
            onTileClick: (tile) => {
                console.log('📝 Test tile click callback called:', tile);
                tileClickCalled = true;
            },
            onTileHover: (tile) => {
                console.log('📝 Test tile hover callback called:', tile);
                tileHoverCalled = true;
            },
            onViewportChange: (x, y, zoom) => {
                console.log('📝 Test viewport change callback called:', { x, y, zoom });
                viewportChangeCalled = true;
            }
        });
        
        console.log('✅ Event callbacks set up');
        
        // Test callback assignment
        if (window.canvasInteraction.onTileClick && 
            window.canvasInteraction.onTileHover && 
            window.canvasInteraction.onViewportChange) {
            console.log('✅ All callbacks properly assigned');
            return true;
        } else {
            console.error('❌ Callbacks not properly assigned');
            return false;
        }
    },
    
    /**
     * Test 5: Coordinate conversion
     */
    testCoordinateConversion: function() {
        console.log('\n🧪 Test 5: Coordinate Conversion');
        console.log('================================');
        
        try {
            // Test getTileAtPosition with valid coordinates
            const tile = window.canvasInteraction.getTileAtPosition(100, 100, false);
            
            if (tile !== null) {
                console.log('✅ Coordinate conversion working:', tile);
                
                // Check if it's a valid tile or empty placeholder
                if (tile.isEmpty || tile.id) {
                    console.log('✅ Valid tile or empty placeholder returned');
                    return true;
                } else {
                    console.error('❌ Invalid tile object returned');
                    return false;
                }
            } else {
                console.log('✅ Null returned for position (valid if outside bounds)');
                return true;
            }
        } catch (error) {
            console.error('❌ Error in coordinate conversion:', error);
            return false;
        }
    },
    
    /**
     * Test 6: Mouse event simulation
     */
    testMouseEventSimulation: function() {
        console.log('\n🧪 Test 6: Mouse Event Simulation');
        console.log('=================================');
        
        const canvas = window.canvasInteraction.canvas;
        if (!canvas) {
            console.error('❌ No canvas available for event simulation');
            return false;
        }
        
        try {
            // Simulate mouse down event
            const mouseDownEvent = new MouseEvent('mousedown', {
                clientX: 100,
                clientY: 100,
                button: 0, // Left button
                bubbles: true
            });
            
            canvas.dispatchEvent(mouseDownEvent);
            console.log('✅ Mouse down event simulated');
            
            // Simulate mouse up event (should trigger tile click)
            const mouseUpEvent = new MouseEvent('mouseup', {
                clientX: 100,
                clientY: 100,
                button: 0,
                bubbles: true
            });
            
            canvas.dispatchEvent(mouseUpEvent);
            console.log('✅ Mouse up event simulated');
            
            return true;
        } catch (error) {
            console.error('❌ Error in mouse event simulation:', error);
            return false;
        }
    },
    
    /**
     * Test 7: Viewport integration
     */
    testViewportIntegration: function() {
        console.log('\n🧪 Test 7: Viewport Integration');
        console.log('===============================');
        
        const canvas = window.canvasInteraction.canvas;
        if (!canvas || !window.canvasInteraction.viewport) {
            console.error('❌ Canvas or viewport not available');
            return false;
        }
        
        try {
            // Get initial viewport state
            const initialViewport = window.canvasInteraction.viewport.getViewport();
            console.log('Initial viewport:', initialViewport);
            
            // Simulate middle mouse drag (pan operation)
            const mouseDownEvent = new MouseEvent('mousedown', {
                clientX: 200,
                clientY: 200,
                button: 1, // Middle button
                bubbles: true
            });
            
            canvas.dispatchEvent(mouseDownEvent);
            console.log('✅ Middle mouse down simulated');
            
            // Check if dragging state was set
            if (window.canvasInteraction.isDragging) {
                console.log('✅ Dragging state correctly set');
                
                // Simulate mouse move to trigger pan
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    clientX: 250,
                    clientY: 250,
                    bubbles: true
                });
                
                canvas.dispatchEvent(mouseMoveEvent);
                console.log('✅ Mouse move event simulated for panning');
                
                // End dragging
                const mouseUpEvent = new MouseEvent('mouseup', {
                    clientX: 250,
                    clientY: 250,
                    button: 1,
                    bubbles: true
                });
                
                canvas.dispatchEvent(mouseUpEvent);
                console.log('✅ Middle mouse up simulated');
                
                return true;
            } else {
                console.error('❌ Dragging state not set correctly');
                return false;
            }
        } catch (error) {
            console.error('❌ Error in viewport integration test:', error);
            return false;
        }
    },
    
    /**
     * Test 8: Performance tracking
     */
    testPerformanceTracking: function() {
        console.log('\n🧪 Test 8: Performance Tracking');
        console.log('===============================');
        
        // Test performance issue tracking
        window.canvasInteraction.trackPerformanceIssue('Test performance issue');
        
        if (window.canvasInteraction.performanceIssues.length > 0) {
            console.log('✅ Performance issue tracking working');
            console.log('Performance issues:', window.canvasInteraction.performanceIssues);
            return true;
        } else {
            console.error('❌ Performance issue tracking not working');
            return false;
        }
    },
    
    /**
     * Run all tests
     */
    runAllTests: function() {
        console.log('🧪 RUNNING CANVAS INTERACTION MANAGER TEST SUITE');
        console.log('================================================');
        
        const tests = [
            'testInitialization',
            'testCanvasSetup',
            'testCanvasDataSetup',
            'testEventCallbacks',
            'testCoordinateConversion',
            'testMouseEventSimulation',
            'testViewportIntegration',
            'testPerformanceTracking'
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
            console.log('🎉 ALL TESTS PASSED! Canvas interaction manager is working correctly.');
            return true;
        } else {
            console.log('⚠️ Some tests failed. Canvas interaction manager needs fixes before integration.');
            return false;
        }
    }
};

// Auto-run tests when script loads (if managers are ready)
if (document.readyState === 'complete') {
    setTimeout(() => {
        if (window.canvasInteraction && window.viewportManager) {
            console.log('🧪 Auto-running canvas interaction tests...');
            window.testCanvasInteraction.runAllTests();
        }
    }, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.canvasInteraction && window.viewportManager) {
                console.log('🧪 Auto-running canvas interaction tests...');
                window.testCanvasInteraction.runAllTests();
            }
        }, 2000);
    });
}
