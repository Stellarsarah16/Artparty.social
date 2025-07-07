// Debug Canvas Calculations
console.log('=== Canvas Debug ===');

// Example canvas data
const canvasData = {
    width: 1024,
    height: 1024,
    tile_size: 32
};

// Display canvas
const displayWidth = 800;
const displayHeight = 600;

// Calculate tiles
const tilesPerRow = Math.floor(canvasData.width / canvasData.tile_size);
const tilesPerCol = Math.floor(canvasData.height / canvasData.tile_size);

console.log(`Canvas Size: ${canvasData.width}x${canvasData.height}`);
console.log(`Tile Size: ${canvasData.tile_size}x${canvasData.tile_size}`);
console.log(`Tiles Grid: ${tilesPerRow}x${tilesPerCol}`);

// Calculate display sizes
const tileDisplayWidth = Math.floor(displayWidth / tilesPerRow);
const tileDisplayHeight = Math.floor(displayHeight / tilesPerCol);

console.log(`Display Canvas: ${displayWidth}x${displayHeight}`);
console.log(`Tile Display Size: ${tileDisplayWidth}x${tileDisplayHeight}`);

// Test if borders would be visible
console.log(`Border visibility: ${tileDisplayWidth > 10 && tileDisplayHeight > 10 ? 'VISIBLE' : 'TOO SMALL'}`);

// Test painting setup
function testPaintingSetup() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    console.log('Canvas created:', canvas.width, 'x', canvas.height);
    console.log('Context available:', !!ctx);
    
    // Test drawing
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 16, 16);
    
    console.log('Drawing test complete');
}

// Export for testing
window.debugCanvas = {
    canvasData,
    displayWidth,
    displayHeight,
    tilesPerRow,
    tilesPerCol,
    tileDisplayWidth,
    tileDisplayHeight,
    testPaintingSetup
}; 