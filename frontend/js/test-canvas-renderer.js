/**
 * Canvas Renderer Test Suite
 * 
 * SAFETY: Test the extracted canvas renderer to ensure it works correctly
 * with the viewport manager before full integration
 */

// Test functions available globally
window.testCanvasRenderer = {
    
    /**
     * Test 1: Basic initialization
     */
    testInitialization: function() {
        console.log('🧪 Test 1: Canvas Renderer Initialization');
        console.log('==========================================');
        
        // Check if canvas renderer exists
        if (!window.canvasRenderer) {
            console.error('❌ Canvas renderer not found');
            return false;
        }
        
        console.log('✅ Canvas renderer exists:', window.canvasRenderer);
        
        // Check if viewport manager exists
        if (!window.viewportManager) {
            console.error('❌ Viewport manager not found');
            return false;
        }
        
        console.log('✅ Viewport manager exists for integration');
        return true;
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
            testCanvas.id = 'test-renderer-canvas';
            testCanvas.width = 800;
            testCanvas.height = 600;
            document.body.appendChild(testCanvas);
            
            window.canvasRenderer.init(testCanvas);
            window.viewportManager.init(testCanvas);
            console.log('✅ Canvas renderer initialized with test canvas');
            return true;
        } else {
            window.canvasRenderer.init(canvas);
            window.viewportManager.init(canvas);
            console.log('✅ Canvas renderer initialized with existing canvas');
            return true;
        }
    },
    
    /**
     * Test 3: Viewport integration
     */
    testViewportIntegration: function() {
        console.log('\n🧪 Test 3: Viewport Integration');
        console.log('===============================');
        
        // Set viewport reference in renderer
        window.canvasRenderer.setViewport(window.viewportManager);
        console.log('✅ Viewport reference set in renderer');
        
        // Test viewport access
        const viewport = window.canvasRenderer.viewport;
        if (viewport && viewport.getViewport) {
            const viewportState = viewport.getViewport();
            console.log('✅ Renderer can access viewport state:', viewportState);
            return true;
        } else {
            console.error('❌ Renderer cannot access viewport');
            return false;
        }
    },
    
    /**
     * Test 4: Canvas data handling
     */
    testCanvasData: function() {
        console.log('\n🧪 Test 4: Canvas Data Handling');
        console.log('===============================');
        
        // Create test canvas data
        const testCanvasData = {
            id: 999,
            name: 'Test Canvas',
            width: 1024,
            height: 1024,
            tile_size: 32
        };
        
        window.canvasRenderer.setCanvasData(testCanvasData);
        console.log('✅ Canvas data set in renderer');
        
        // Check if tile size was updated
        if (window.canvasRenderer.tileSize === 32) {
            console.log('✅ Tile size correctly set from canvas data');
            return true;
        } else {
            console.error('❌ Tile size not set correctly');
            return false;
        }
    },
    
    /**
     * Test 5: Tile loading
     */
    testTileLoading: function() {
        console.log('\n🧪 Test 5: Tile Loading');
        console.log('========================');
        
        // Create test tiles
        const testTiles = [
            {
                id: 1,
                x: 0,
                y: 0,
                pixel_data: [
                    [[255, 0, 0, 255], [0, 255, 0, 255]],
                    [[0, 0, 255, 255], [255, 255, 0, 255]]
                ],
                owner_name: 'TestUser'
            },
            {
                id: 2,
                x: 1,
                y: 0,
                pixel_data: [
                    [[255, 255, 255, 255], [0, 0, 0, 255]],
                    [[128, 128, 128, 255], [64, 64, 64, 255]]
                ],
                owner_name: 'TestUser2'
            }
        ];
        
        window.canvasRenderer.loadTiles(testTiles);
        console.log('✅ Test tiles loaded into renderer');
        
        // Check if tiles were stored
        if (window.canvasRenderer.tiles.size === 2) {
            console.log('✅ Correct number of tiles stored');
            return true;
        } else {
            console.error('❌ Incorrect number of tiles stored');
            return false;
        }
    },
    
    /**
     * Test 6: Rendering test
     */
    testRendering: function() {
        console.log('\n🧪 Test 6: Rendering Test');
        console.log('=========================');
        
        try {
            // Request a render
            window.canvasRenderer.requestRender();
            console.log('✅ Render requested successfully');
            
            // Test direct render
            window.canvasRenderer.renderDirect();
            console.log('✅ Direct render executed successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Rendering failed:', error);
            return false;
        }
    },
    
    /**
     * Test 7: Display options
     */
    testDisplayOptions: function() {
        console.log('\n🧪 Test 7: Display Options');
        console.log('===========================');
        
        // Test display options
        window.canvasRenderer.setDisplayOptions({
            showGrid: false,
            showTileOutlines: true,
            showUserIndicators: false
        });
        
        console.log('✅ Display options set');
        
        // Check if options were applied
        if (!window.canvasRenderer.showGrid && 
            window.canvasRenderer.showTileOutlines && 
            !window.canvasRenderer.showUserIndicators) {
            console.log('✅ Display options applied correctly');
            return true;
        } else {
            console.error('❌ Display options not applied correctly');
            return false;
        }
    },
    
    /**
     * Test 8: Performance features
     */
    testPerformanceFeatures: function() {
        console.log('\n🧪 Test 8: Performance Features');
        console.log('===============================');
        
        // Test visible tiles calculation
        const visibleTiles = window.canvasRenderer.getVisibleTiles();
        console.log(`✅ Visible tiles calculated: ${visibleTiles.length} tiles`);
        
        // Test cache clearing
        window.canvasRenderer.clearVisibleTilesCache();
        console.log('✅ Visible tiles cache cleared');
        
        // Test bounds calculation
        const bounds = window.canvasRenderer.getVisibleTileBounds();
        console.log('✅ Visible tile bounds calculated:', bounds);
        
        return true;
    },
    
    /**
     * Run all tests
     */
    runAllTests: function() {
        console.log('🧪 RUNNING CANVAS RENDERER TEST SUITE');
        console.log('=====================================');
        
        const tests = [
            'testInitialization',
            'testCanvasInit', 
            'testViewportIntegration',
            'testCanvasData',
            'testTileLoading',
            'testRendering',
            'testDisplayOptions',
            'testPerformanceFeatures'
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
            console.log('🎉 ALL TESTS PASSED! Canvas renderer is working correctly.');
            return true;
        } else {
            console.log('⚠️ Some tests failed. Canvas renderer needs fixes before integration.');
            return false;
        }
    }
};

// Auto-run tests when script loads (if managers are ready)
if (document.readyState === 'complete') {
    setTimeout(() => {
        if (window.canvasRenderer && window.viewportManager) {
            console.log('🧪 Auto-running canvas renderer tests...');
            window.testCanvasRenderer.runAllTests();
        }
    }, 1500);
} else {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.canvasRenderer && window.viewportManager) {
                console.log('🧪 Auto-running canvas renderer tests...');
                window.testCanvasRenderer.runAllTests();
            }
        }, 1500);
    });
}
