/**
 * Coordinate System App Test Runner
 * Load this in your main app to test the actual coordinate system implementation
 */

// Test runner for the actual app implementation
window.testAppCoordinateSystem = {
    
    /**
     * Test the actual coordinate system in the app
     */
    testActualImplementation: function() {
        console.log('🧪 Testing Actual App Coordinate System...\n');
        
        try {
            // Test 1: Check if managers exist
            this.testManagerExistence();
            
            // Test 2: Test coordinate conversion
            this.testCoordinateConversion();
            
            // Test 3: Test consistency between managers
            this.testManagerConsistency();
            
            // Test 4: Test tile detection
            this.testTileDetection();
            
            console.log('✅ All app tests completed!');
            
        } catch (error) {
            console.error('❌ App test failed:', error.message);
        }
    },
    
    /**
     * Test 1: Check if required managers exist
     */
    testManagerExistence: function() {
        console.log('Test 1: Manager Existence');
        
        if (!window.canvasViewerManager) {
            throw new Error('Canvas viewer manager not found');
        }
        
        if (!window.canvasViewerManager.viewportManager) {
            throw new Error('Viewport manager not found');
        }
        
        if (!window.canvasViewerManager.renderer) {
            throw new Error('Renderer not found');
        }
        
        console.log('✅ All managers exist\n');
    },
    
    /**
     * Test 2: Test coordinate conversion
     */
    testCoordinateConversion: function() {
        console.log('Test 2: Coordinate Conversion');
        
        const viewportManager = window.canvasViewerManager.viewportManager;
        const renderer = window.canvasViewerManager.renderer;
        
        // Get current viewport
        const viewport = viewportManager.getViewport();
        console.log('Current viewport:', viewport);
        
        // Test coordinate conversion
        const testScreenX = 100;
        const testScreenY = 100;
        
        const viewportResult = viewportManager.screenToWorld(testScreenX, testScreenY);
        const rendererResult = renderer.screenToWorld(testScreenX, testScreenY);
        
        console.log('Screen coordinates:', { x: testScreenX, y: testScreenY });
        console.log('Viewport manager result:', viewportResult);
        console.log('Renderer result:', rendererResult);
        
        // Check consistency
        const isConsistent = Math.abs(viewportResult.x - rendererResult.x) < 0.001 && 
                           Math.abs(viewportResult.y - rendererResult.y) < 0.001;
        
        if (isConsistent) {
            console.log('✅ Coordinate systems are consistent');
        } else {
            console.log('❌ Coordinate systems are NOT consistent');
            console.log('Difference:', {
                x: Math.abs(viewportResult.x - rendererResult.x),
                y: Math.abs(viewportResult.y - rendererResult.y)
            });
        }
        
        // Check if results make mathematical sense
        const expectedWorldX = (testScreenX / viewport.zoom) + viewport.x;
        const expectedWorldY = (testScreenY / viewport.zoom) + viewport.y;
        
        const accuracyX = Math.abs(viewportResult.x - expectedWorldX);
        const accuracyY = Math.abs(viewportResult.y - expectedWorldY);
        
        if (accuracyX < 0.1 && accuracyY < 0.1) {
            console.log('✅ Coordinate conversion is mathematically correct');
        } else {
            console.log('❌ Coordinate conversion has mathematical errors');
            console.log('Expected:', { x: expectedWorldX, y: expectedWorldY });
            console.log('Error:', { x: accuracyX, y: accuracyY });
        }
        
        console.log('');
    },
    
    /**
     * Test 3: Test consistency between managers
     */
    testManagerConsistency: function() {
        console.log('Test 3: Manager Consistency');
        
        const viewportManager = window.canvasViewerManager.viewportManager;
        const renderer = window.canvasViewerManager.renderer;
        
        const testCases = [
            { x: 0, y: 0 },
            { x: 100, y: 50 },
            { x: 200, y: 150 },
            { x: 300, y: 200 }
        ];
        
        let allConsistent = true;
        
        for (const testCase of testCases) {
            const viewportResult = viewportManager.screenToWorld(testCase.x, testCase.y);
            const rendererResult = renderer.screenToWorld(testCase.x, testCase.y);
            
            const isConsistent = Math.abs(viewportResult.x - rendererResult.x) < 0.001 && 
                               Math.abs(viewportResult.y - rendererResult.y) < 0.001;
            
            if (!isConsistent) {
                console.log(`❌ Inconsistent at (${testCase.x}, ${testCase.y}):`);
                console.log('  Viewport:', viewportResult);
                console.log('  Renderer:', rendererResult);
                allConsistent = false;
            }
        }
        
        if (allConsistent) {
            console.log('✅ All coordinate conversions are consistent between managers');
        } else {
            console.log('❌ Some coordinate conversions are inconsistent');
        }
        
        console.log('');
    },
    
    /**
     * Test 4: Test tile detection
     */
    testTileDetection: function() {
        console.log('Test 4: Tile Detection');
        
        const viewportManager = window.canvasViewerManager.viewportManager;
        const renderer = window.canvasViewerManager.renderer;
        
        if (!renderer.canvasData) {
            console.log('⚠️ No canvas data available for tile detection test');
            console.log('');
            return;
        }
        
        const tileSize = renderer.canvasData.tile_size;
        console.log('Tile size:', tileSize);
        
        // Test tile detection at different screen positions
        const testPositions = [
            { x: 100, y: 100, description: 'Center area' },
            { x: 200, y: 150, description: 'Right side' },
            { x: 50, y: 200, description: 'Left side' }
        ];
        
        for (const testPos of testPositions) {
            console.log(`\nTesting ${testPos.description} at (${testPos.x}, ${testPos.y}):`);
            
            // Convert to world coordinates
            const worldPos = viewportManager.screenToWorld(testPos.x, testPos.y);
            console.log('  World position:', worldPos);
            
            // Convert to tile coordinates
            const tileX = Math.floor(worldPos.x / tileSize);
            const tileY = Math.floor(worldPos.y / tileSize);
            console.log('  Tile grid position:', { x: tileX, y: tileY });
            
            // Check if tile exists
            const tile = renderer.tiles.get(`${tileX},${tileY}`);
            if (tile) {
                console.log('  ✅ Tile found:', tile);
            } else {
                console.log('  🔧 No tile at this position');
            }
        }
        
        console.log('');
    },
    
    /**
     * Quick diagnostic test
     */
    quickDiagnostic: function() {
        console.log('🔍 Quick Diagnostic Test');
        console.log('========================');
        
        try {
            // Check managers
            const hasCanvasViewer = !!window.canvasViewerManager;
            const hasViewportManager = !!(window.canvasViewerManager?.viewportManager);
            const hasRenderer = !!(window.canvasViewerManager?.renderer);
            
            console.log('Canvas Viewer Manager:', hasCanvasViewer ? '✅' : '❌');
            console.log('Viewport Manager:', hasViewportManager ? '✅' : '❌');
            console.log('Renderer:', hasRenderer ? '✅' : '❌');
            
            if (hasViewportManager) {
                const viewport = window.canvasViewerManager.viewportManager.getViewport();
                console.log('Current viewport:', viewport);
            }
            
            if (hasRenderer) {
                const hasCanvasData = !!window.canvasViewerManager.renderer.canvasData;
                const tileCount = window.canvasViewerManager.renderer.tiles.size;
                console.log('Has canvas data:', hasCanvasData ? '✅' : '❌');
                console.log('Tile count:', tileCount);
            }
            
        } catch (error) {
            console.error('Diagnostic error:', error.message);
        }
        
        console.log('');
    }
};

// Add convenience functions with proper scope binding
window.testCoordinateSystem = function() {
    return window.testAppCoordinateSystem.testActualImplementation.call(window.testAppCoordinateSystem);
};

window.quickDiagnostic = function() {
    return window.testAppCoordinateSystem.quickDiagnostic.call(window.testAppCoordinateSystem);
};

console.log('🎯 Complete Coordinate System Test Runner loaded');
console.log('Available functions:');
console.log('- quickDiagnostic() - Quick system check');
console.log('- testCoordinateSystem() - Run full test suite');
console.log('- testAppCoordinateSystem.testActualImplementation() - Full test');
console.log('- testAppCoordinateSystem.quickDiagnostic() - Quick check');
