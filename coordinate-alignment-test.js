/**
 * COMPREHENSIVE COORDINATE ALIGNMENT TEST
 * 
 * This script tests the alignment between:
 * 1. Mouse position
 * 2. Tile detection (interaction manager)
 * 3. Debug overlay highlight
 * 4. Visual tile grid
 * 
 * Usage: Copy and paste this entire script into browser console
 */

console.log('🧪 STARTING COMPREHENSIVE COORDINATE ALIGNMENT TEST');
console.log('=================================================');

// Test configuration
const TEST_CONFIG = {
    testDuration: 30000, // 30 seconds
    logInterval: 500,    // Log every 500ms when mouse moves
    testPositions: [
        { x: 400, y: 300, name: 'Center' },
        { x: 200, y: 200, name: 'Top-Left' },
        { x: 600, y: 400, name: 'Bottom-Right' },
        { x: 350, y: 250, name: 'Custom-1' },
        { x: 450, y: 350, name: 'Custom-2' }
    ]
};

// Global test state
let testActive = false;
let lastLogTime = 0;
let testResults = [];
let mouseTracker = null;

/**
 * Main test function
 */
function runCoordinateAlignmentTest() {
    if (testActive) {
        console.log('⚠️ Test already running. Stop current test first.');
        return;
    }
    
    console.log('🎯 Starting coordinate alignment test...');
    console.log('📋 Move your mouse over the canvas to test different positions');
    console.log('⏱️ Test will run for 30 seconds, then provide a summary');
    
    testActive = true;
    testResults = [];
    
    // Test 1: Viewport precision check
    testViewportPrecision();
    
    // Test 2: Static position tests
    testStaticPositions();
    
    // Test 3: Real-time mouse tracking
    startMouseTracking();
    
    // Auto-stop after test duration
    setTimeout(() => {
        stopCoordinateTest();
        generateTestReport();
    }, TEST_CONFIG.testDuration);
}

/**
 * Test viewport coordinate precision
 */
function testViewportPrecision() {
    console.log('\n🔍 VIEWPORT PRECISION TEST');
    console.log('-------------------------');
    
    if (!window.viewportManager) {
        console.log('❌ viewportManager not available');
        return;
    }
    
    const viewport = window.viewportManager.getViewport();
    const xPrecision = Math.abs(viewport.x % 1) < 0.01 ? 'ROUNDED ✅' : 'FRACTIONAL ❌';
    const yPrecision = Math.abs(viewport.y % 1) < 0.01 ? 'ROUNDED ✅' : 'FRACTIONAL ❌';
    
    console.log('Current viewport:', {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
        xPrecision: xPrecision,
        yPrecision: yPrecision
    });
    
    // Force a resetToFit to test coordinate rounding
    if (window.rendererManager && window.rendererManager.canvasData) {
        console.log('🔧 Testing resetToFit coordinate rounding...');
        window.viewportManager.resetToFit(window.rendererManager.canvasData);
        
        const newViewport = window.viewportManager.getViewport();
        const newXPrecision = Math.abs(newViewport.x % 1) < 0.01 ? 'ROUNDED ✅' : 'FRACTIONAL ❌';
        const newYPrecision = Math.abs(newViewport.y % 1) < 0.01 ? 'ROUNDED ✅' : 'FRACTIONAL ❌';
        
        console.log('After resetToFit:', {
            x: newViewport.x,
            y: newViewport.y,
            zoom: newViewport.zoom,
            xPrecision: newXPrecision,
            yPrecision: newYPrecision
        });
    }
}

/**
 * Test specific static positions
 */
function testStaticPositions() {
    console.log('\n🎯 STATIC POSITION TESTS');
    console.log('------------------------');
    
    const canvas = document.getElementById('canvas-viewer');
    if (!canvas) {
        console.log('❌ Canvas viewer not found');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    
    TEST_CONFIG.testPositions.forEach(pos => {
        // Adjust position to be within canvas bounds
        const testX = Math.max(rect.left + 10, Math.min(rect.right - 10, pos.x));
        const testY = Math.max(rect.top + 10, Math.min(rect.bottom - 10, pos.y));
        
        const result = testPositionAlignment(testX, testY, pos.name);
        testResults.push(result);
        
        console.log(`📍 ${pos.name} (${testX}, ${testY}):`, result);
    });
}

/**
 * Test alignment at a specific position
 */
function testPositionAlignment(screenX, screenY, positionName) {
    const result = {
        position: positionName,
        screenX: screenX,
        screenY: screenY,
        timestamp: Date.now()
    };
    
    try {
        // Get tile from interaction manager
        if (window.interactionManager) {
            const interactionTile = window.interactionManager.getTileAtPosition(screenX, screenY);
            result.interactionTile = interactionTile ? `(${interactionTile.x}, ${interactionTile.y})` : 'null';
            result.interactionWorldX = interactionTile ? interactionTile.worldX : null;
            result.interactionWorldY = interactionTile ? interactionTile.worldY : null;
        } else {
            result.interactionTile = 'N/A - manager not available';
        }
        
        // Get tile from CanvasViewer
        if (window.CanvasViewer) {
            const canvasViewerTile = window.CanvasViewer.getTileAtPosition(screenX, screenY);
            result.canvasViewerTile = canvasViewerTile ? `(${canvasViewerTile.x}, ${canvasViewerTile.y})` : 'null';
        } else {
            result.canvasViewerTile = 'N/A - CanvasViewer not available';
        }
        
        // Get debug manager hoveredTile
        if (window.debugManager) {
            const debugTile = window.debugManager.hoveredTile;
            result.debugTile = debugTile ? `(${debugTile.x}, ${debugTile.y})` : 'null';
        } else {
            result.debugTile = 'N/A - debugManager not available';
        }
        
        // Manual coordinate calculation using viewport manager
        if (window.viewportManager) {
            const worldCoords = window.viewportManager.screenToWorld(screenX, screenY);
            result.manualWorldX = worldCoords.x;
            result.manualWorldY = worldCoords.y;
            
            // Calculate tile coordinates manually
            const tileSize = window.rendererManager && window.rendererManager.canvasData ? 
                window.rendererManager.canvasData.tile_size : 32;
            const manualTileX = Math.floor(worldCoords.x / tileSize);
            const manualTileY = Math.floor(worldCoords.y / tileSize);
            result.manualTile = `(${manualTileX}, ${manualTileY})`;
            result.tileSize = tileSize;
        } else {
            result.manualTile = 'N/A - viewportManager not available';
        }
        
        // Check for mismatches
        const allTiles = [result.interactionTile, result.canvasViewerTile, result.manualTile].filter(t => t !== 'N/A - manager not available' && t !== 'N/A - CanvasViewer not available' && t !== 'N/A - viewportManager not available');
        const uniqueTiles = [...new Set(allTiles)];
        result.hasMismatch = uniqueTiles.length > 1;
        result.mismatchDetails = uniqueTiles.length > 1 ? `Found ${uniqueTiles.length} different results: ${uniqueTiles.join(', ')}` : 'All systems agree';
        
    } catch (error) {
        result.error = error.message;
    }
    
    return result;
}

/**
 * Start real-time mouse tracking
 */
function startMouseTracking() {
    console.log('\n🖱️ REAL-TIME MOUSE TRACKING');
    console.log('----------------------------');
    console.log('Move your mouse over the canvas to see real-time alignment...');
    
    mouseTracker = (e) => {
        const now = Date.now();
        if (now - lastLogTime < TEST_CONFIG.logInterval) {
            return; // Throttle logging
        }
        lastLogTime = now;
        
        const canvas = document.getElementById('canvas-viewer');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const isOverCanvas = (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
        );
        
        if (isOverCanvas) {
            const result = testPositionAlignment(e.clientX, e.clientY, 'Mouse');
            
            if (result.hasMismatch) {
                console.log('🚨 MISMATCH DETECTED:', {
                    mouse: `(${e.clientX}, ${e.clientY})`,
                    interaction: result.interactionTile,
                    canvasViewer: result.canvasViewerTile,
                    manual: result.manualTile,
                    debug: result.debugTile,
                    details: result.mismatchDetails
                });
            } else {
                console.log('✅ ALIGNED:', {
                    mouse: `(${e.clientX}, ${e.clientY})`,
                    tile: result.interactionTile,
                    worldCoords: `(${result.manualWorldX?.toFixed(1)}, ${result.manualWorldY?.toFixed(1)})`
                });
            }
            
            testResults.push(result);
        }
    };
    
    document.addEventListener('mousemove', mouseTracker);
}

/**
 * Stop the coordinate test
 */
function stopCoordinateTest() {
    if (!testActive) {
        console.log('⚠️ No test currently running');
        return;
    }
    
    testActive = false;
    
    if (mouseTracker) {
        document.removeEventListener('mousemove', mouseTracker);
        mouseTracker = null;
    }
    
    console.log('🛑 Coordinate alignment test stopped');
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
    console.log('\n📊 COORDINATE ALIGNMENT TEST REPORT');
    console.log('===================================');
    
    if (testResults.length === 0) {
        console.log('❌ No test results to analyze');
        return;
    }
    
    // Analyze mismatches
    const mismatches = testResults.filter(r => r.hasMismatch);
    const totalTests = testResults.length;
    const mismatchRate = (mismatches.length / totalTests * 100).toFixed(1);
    
    console.log(`📈 SUMMARY STATISTICS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Mismatches: ${mismatches.length}`);
    console.log(`   Mismatch Rate: ${mismatchRate}%`);
    console.log(`   Alignment Status: ${mismatchRate === '0.0' ? '✅ PERFECT' : '❌ ISSUES DETECTED'}`);
    
    if (mismatches.length > 0) {
        console.log(`\n🚨 MISMATCH ANALYSIS:`);
        
        // Group mismatches by type
        const mismatchTypes = {};
        mismatches.forEach(m => {
            const key = m.mismatchDetails;
            if (!mismatchTypes[key]) {
                mismatchTypes[key] = [];
            }
            mismatchTypes[key].push(m);
        });
        
        Object.entries(mismatchTypes).forEach(([type, instances]) => {
            console.log(`   ${type}: ${instances.length} occurrences`);
        });
        
        // Show detailed examples
        console.log(`\n🔍 DETAILED MISMATCH EXAMPLES:`);
        mismatches.slice(0, 5).forEach((m, i) => {
            console.log(`   Example ${i + 1}:`, {
                screen: `(${m.screenX}, ${m.screenY})`,
                interaction: m.interactionTile,
                canvasViewer: m.canvasViewerTile,
                manual: m.manualTile,
                debug: m.debugTile
            });
        });
    }
    
    // Viewport analysis
    if (window.viewportManager) {
        const viewport = window.viewportManager.getViewport();
        console.log(`\n🔧 VIEWPORT ANALYSIS:`);
        console.log(`   Position: (${viewport.x}, ${viewport.y})`);
        console.log(`   Zoom: ${viewport.zoom}`);
        console.log(`   X Precision: ${Math.abs(viewport.x % 1) < 0.01 ? '✅ Rounded' : '❌ Fractional'}`);
        console.log(`   Y Precision: ${Math.abs(viewport.y % 1) < 0.01 ? '✅ Rounded' : '❌ Fractional'}`);
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (mismatchRate === '0.0') {
        console.log(`   ✅ All coordinate systems are perfectly aligned!`);
        console.log(`   ✅ The fractional pixel fix appears to be working correctly.`);
    } else {
        console.log(`   🔧 Coordinate alignment issues detected.`);
        console.log(`   🔍 Focus on the systems showing mismatches above.`);
        console.log(`   📐 Check viewport coordinate precision and clamping logic.`);
        console.log(`   🖱️ Verify mouse-to-world coordinate conversion accuracy.`);
    }
    
    console.log('\n🏁 Test complete! Results saved to testResults variable.');
    
    // Make results available globally
    window.coordinateTestResults = {
        summary: {
            totalTests: totalTests,
            mismatches: mismatches.length,
            mismatchRate: parseFloat(mismatchRate),
            isAligned: mismatchRate === '0.0'
        },
        mismatches: mismatches,
        allResults: testResults
    };
}

// Utility functions for manual testing
function testCurrentMousePosition() {
    console.log('🖱️ Move your mouse over the canvas and wait...');
    
    setTimeout(() => {
        const handler = (e) => {
            const result = testPositionAlignment(e.clientX, e.clientY, 'Current Mouse');
            console.log('Current mouse position test:', result);
            document.removeEventListener('mousemove', handler);
        };
        document.addEventListener('mousemove', handler);
    }, 1000);
}

function quickAlignmentCheck() {
    console.log('⚡ Quick alignment check...');
    
    // Test center of canvas
    const canvas = document.getElementById('canvas-viewer');
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const result = testPositionAlignment(centerX, centerY, 'Canvas Center');
        console.log('Canvas center alignment:', result);
        
        return result.hasMismatch ? '❌ MISALIGNED' : '✅ ALIGNED';
    } else {
        console.log('❌ Canvas not found');
        return '❌ ERROR';
    }
}

// Export functions to global scope
window.runCoordinateAlignmentTest = runCoordinateAlignmentTest;
window.stopCoordinateTest = stopCoordinateTest;
window.testCurrentMousePosition = testCurrentMousePosition;
window.quickAlignmentCheck = quickAlignmentCheck;

console.log('✅ Coordinate alignment test script loaded!');
console.log('');
console.log('🚀 USAGE:');
console.log('   runCoordinateAlignmentTest()  - Run full 30-second test');
console.log('   quickAlignmentCheck()         - Quick center alignment test');
console.log('   testCurrentMousePosition()    - Test current mouse position');
console.log('   stopCoordinateTest()          - Stop running test');
console.log('');
console.log('📋 The test will check alignment between:');
console.log('   • Mouse position');
console.log('   • Interaction Manager tile detection');
console.log('   • CanvasViewer tile detection');
console.log('   • Debug overlay highlight');
console.log('   • Manual coordinate calculation');
console.log('');
console.log('🎯 Ready to test! Run: runCoordinateAlignmentTest()');
