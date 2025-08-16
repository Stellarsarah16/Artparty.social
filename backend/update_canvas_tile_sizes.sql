-- Update Canvas Tile Sizes SQL Script
-- This script updates all existing canvases to have tile_size: 32
-- to match their actual tile data dimensions.

-- Check current tile sizes
SELECT 
    id, 
    name, 
    tile_size,
    width,
    height,
    CASE 
        WHEN tile_size = 32 THEN '✅ Correct'
        ELSE '⚠️  Needs Update'
    END as status
FROM canvases 
ORDER BY id;

-- Update all canvases to tile_size: 32
UPDATE canvases 
SET tile_size = 32 
WHERE tile_size != 32;

-- Verify the update
SELECT 
    id, 
    name, 
    tile_size,
    width,
    height,
    CASE 
        WHEN tile_size = 32 THEN '✅ Updated'
        ELSE '❌ Still Wrong'
    END as status
FROM canvases 
ORDER BY id;

-- Count canvases by tile size
SELECT 
    tile_size,
    COUNT(*) as canvas_count,
    CASE 
        WHEN tile_size = 32 THEN '✅ Correct'
        ELSE '❌ Wrong'
    END as status
FROM canvases 
GROUP BY tile_size
ORDER BY tile_size;
