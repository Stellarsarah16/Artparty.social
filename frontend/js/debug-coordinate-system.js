/**
 * Coordinate System Debug Utility
 * Helps debug coordinate conversion issues in the canvas viewer
 */

// Global debug functions
window.debugCoordinateSystem = {
    
    /**
     * Test coordinate conversion with specific values
     */
    testConversion: function(screenX, screenY, expectedWorldX, expectedWorldY) {
        console.log(`🔍 Testing coordinate conversion:`);
        console.log(`Screen: (${screenX}, ${screenY})`);
        console.log(`Expected World: (${expectedWorldX}, ${expectedWorldY})`);
        
        // Get current viewport from canvas viewer
        const canvasViewer = window.canvasViewerManager;
        if (!canvasViewer) {
            console.error('❌ Canvas viewer manager not available');
            return;
        }
        
        const viewport = canvasViewer.viewportManager?.getViewport();
        if (!viewport) {
            console.error('❌ Viewport not available');
            return;
        }
        
        console.log(`Current viewport:`, viewport);
        
        // Test viewport manager conversion
        const viewportResult = canvasViewer.viewportManager.screenToWorld(screenX, screenY);
        console.log(`Viewport manager result:`, viewportResult);
        
        // Test renderer conversion
        const rendererResult = canvasViewer.renderer.screenToWorld(screenX, screenY);
        console.log(`Renderer result:`, rendererResult);
        
        // Check consistency
        const isConsistent = Math.abs(viewportResult.x - rendererResult.x) < 0.001 && 
                           Math.abs(viewportResult.y - rendererResult.y) < 0.001;
        
        if (isConsistent) {
            console.log(`✅ Coordinate systems are consistent`);
        } else {
            console.log(`❌ Coordinate systems are NOT consistent`);
            console.log(`Difference: (${Math.abs(viewportResult.x - rendererResult.x).toFixed(3)}, ${Math.abs(viewportResult.y - rendererResult.y).toFixed(3)})`);
        }
        
        // Check accuracy
        const accuracyX = Math.abs(viewportResult.x - expectedWorldX);
        const accuracyY = Math.abs(viewportResult.y - expectedWorldY);
        
        if (accuracyX < 0.1 && accuracyY < 0.1) {
            console.log(`✅ Coordinate conversion is accurate`);
        } else {
            console.log(`❌ Coordinate conversion is NOT accurate`);
            console.log(`Expected: (${expectedWorldX}, ${expectedWorldY})`);
            console.log(`Actual: (${viewportResult.x.toFixed(3)}, ${viewportResult.y.toFixed(3)})`);
            console.log(`Error: (${accuracyX.toFixed(3)}, ${accuracyY.toFixed(3)})`);
        }
        
        return {
            viewport: viewportResult,
            renderer: rendererResult,
            isConsistent: isConsistent,
            isAccurate: accuracyX < 0.1 && accuracyY < 0.1
        };
    },
    
    /**
     * Test tile detection at specific coordinates
     */
    testTileDetection: function(screenX, screenY) {
        console.log(`🔍 Testing tile detection at screen position (${screenX}, ${screenY})`);
        
        const canvasViewer = window.canvasViewerManager;
        if (!canvasViewer) {
            console.error('❌ Canvas viewer manager not available');
            return;
        }
        
        // Convert to world coordinates
        const worldPos = canvasViewer.viewportManager.screenToWorld(screenX, screenY);
        console.log(`World position: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)})`);
        
        // Convert to tile coordinates
        if (canvasViewer.renderer.canvasData) {
            const tileSize = canvasViewer.renderer.canvasData.tile_size;
            const tileX = Math.floor(worldPos.x / tileSize);
            const tileY = Math.floor(worldPos.y / tileSize);
            
            console.log(`Tile grid position: (${tileX}, ${tileY})`);
            
            // Check if tile exists
            const tile = canvasViewer.renderer.tiles.get(`${tileX},${tileY}`);
            if (tile) {
                console.log(`✅ Tile found:`, tile);
            } else {
                console.log(`🔧 No tile at position (${tileX}, ${tileY})`);
            }
            
            return { worldPos, tilePos: { x: tileX, y: tileY }, tile };
        } else {
            console.log(`⚠️ No canvas data available`);
            return { worldPos, tilePos: null, tile: null };
        }
    },
    
    /**
     * Show current viewport state
     */
    showViewportState: function() {
        const canvasViewer = window.canvasViewerManager;
        if (!canvasViewer) {
            console.error('❌ Canvas viewer manager not available');
            return;
        }
        
        const viewport = canvasViewer.viewportManager?.getViewport();
        if (!viewport) {
            console.error('❌ Viewport not available');
            return;
        }
        
        console.log(`📊 Current Viewport State:`);
        console.log(`Position: (${viewport.x.toFixed(3)}, ${viewport.y.toFixed(3)})`);
        console.log(`Zoom: ${viewport.zoom.toFixed(3)}`);
        
        if (canvasViewer.renderer.canvasData) {
            const canvasData = canvasViewer.renderer.canvasData;
            console.log(`Canvas: ${canvasData.width}x${canvasData.height}`);
            console.log(`Tile size: ${canvasData.tile_size}`);
            console.log(`Grid: ${Math.floor(canvasData.width / canvasData.tile_size)}x${Math.floor(canvasData.height / canvasData.tile_size)}`);
        }
        
        if (canvasViewer.renderer.canvas) {
            const canvas = canvasViewer.renderer.canvas;
            console.log(`Canvas element: ${canvas.width}x${canvas.height}`);
        }
        
        return viewport;
    },
    
    /**
     * Test the complete coordinate pipeline
     */
    testPipeline: function() {
        console.log(`🚀 Testing complete coordinate pipeline...`);
        
        // Test 1: Viewport state
        console.log(`\n1️⃣ Viewport State:`);
        const viewport = this.showViewportState();
        
        // Test 2: Coordinate conversion
        console.log(`\n2️⃣ Coordinate Conversion:`);
        const testScreenX = 200;
        const testScreenY = 150;
        
        // Calculate expected world coordinates
        const expectedWorldX = (testScreenX / viewport.zoom) + viewport.x;
        const expectedWorldY = (testScreenY / viewport.zoom) + viewport.y;
        
        const conversionResult = this.testConversion(testScreenX, testScreenY, expectedWorldX, expectedWorldY);
        
        // Test 3: Tile detection
        console.log(`\n3️⃣ Tile Detection:`);
        const tileResult = this.testTileDetection(testScreenX, testScreenY);
        
        // Summary
        console.log(`\n📋 Pipeline Test Summary:`);
        console.log(`Coordinate Consistency: ${conversionResult.isConsistent ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Coordinate Accuracy: ${conversionResult.isAccurate ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Tile Detection: ${tileResult.tile ? '✅ PASS' : '🔧 NO TILE'}`);
        
        return {
            viewport,
            conversion: conversionResult,
            tileDetection: tileResult,
            overallSuccess: conversionResult.isConsistent && conversionResult.isAccurate
        };
    }
};

// Add convenience functions to global scope
window.testCoordinateConversion = window.debugCoordinateSystem.testConversion;
window.testTileDetection = window.debugCoordinateSystem.testTileDetection;
window.showViewportState = window.debugCoordinateSystem.showViewportState;
window.testCoordinatePipeline = window.debugCoordinateSystem.testPipeline;

console.log('🎯 Coordinate System Debug Utility loaded');
console.log('Available functions:');
console.log('- testCoordinateConversion(screenX, screenY, expectedWorldX, expectedWorldY)');
console.log('- testTileDetection(screenX, screenY)');
console.log('- showViewportState()');
console.log('- testCoordinatePipeline()');
