# 🎨 Tile & Canvas System Guide

## 📋 **Overview**

The Tile & Canvas System is the core of StellarCollabApp, enabling collaborative pixel art creation through a grid-based approach where users edit individual tiles that combine to form larger collaborative canvases.

## 🏗️ **System Architecture**

### **Canvas Structure**
```
┌─────────────────────────────────────────────────────────────┐
│                        Canvas (1024x1024 pixels)           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │Tile │ │Tile │ │Tile │ │Tile │ │Tile │ │Tile │        │
│  │(0,0)│ │(1,0)│ │(2,0)│ │(3,0)│ │(4,0)│ │(5,0)│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │Tile │ │Tile │ │Tile │ │Tile │ │Tile │ │Tile │        │
│  │(0,1)│ │(1,1)│ │(2,1)│ │(3,1)│ │(4,1)│ │(5,1)│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐        │
│  │Tile │ │Tile │ │Tile │ │Tile │ │Tile │ │Tile │        │
│  │(0,2)│ │(1,2)│ │(2,2)│ │(3,2)│ │(4,2)│ │(5,2)│        │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘        │
└─────────────────────────────────────────────────────────────┘
```

### **Tile Structure**
```
┌─────────────────────────────────────┐
│           Tile (32x32 pixels)      │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐│
│  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ ││
│  ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ │
│  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ ││
│  ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ │
│  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ ││
│  ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ ├─┤ │
│  │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ │ ││
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘│
└─────────────────────────────────────┘
```

## 🔧 **Technical Implementation**

### **Canvas Model**
```python
class Canvas(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    width = Column(Integer, default=1024)      # Canvas width in pixels
    height = Column(Integer, default=1024)     # Canvas height in pixels
    tile_size = Column(Integer, default=64)    # Size of each tile (32, 64, 128)
    palette_type = Column(String(20), default='classic')
    collaboration_mode = Column(String(20), default='free')
    # ... other fields
```

### **Tile Model**
```python
class Tile(Base):
    id = Column(Integer, primary_key=True, index=True)
    canvas_id = Column(Integer, ForeignKey("canvases.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    x = Column(Integer, nullable=False)        # Tile X coordinate
    y = Column(Integer, nullable=False)        # Tile Y coordinate
    pixel_data = Column(Text, nullable=False)  # JSON string of pixel colors
    title = Column(String(100), nullable=True)
    like_count = Column(Integer, default=0)
    # ... other fields
```

### **Pixel Data Format**
```javascript
// Pixel data is stored as a 2D array of RGBA values
const pixelData = [
    [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]], // Row 0
    [[128, 128, 128, 255], [255, 255, 0, 255], [255, 0, 255, 255]], // Row 1
    [[0, 255, 255, 255], [255, 128, 0, 255], [128, 0, 128, 255]]  // Row 2
];

// Each pixel is [R, G, B, A] where:
// R = Red (0-255)
// G = Green (0-255) 
// B = Blue (0-255)
// A = Alpha/Transparency (0-255, 0 = transparent)
```

## 🎯 **Tile Size Flexibility**

### **Supported Tile Sizes**
- **32x32 pixels** - Default, most common
- **64x64 pixels** - Medium detail
- **128x128 pixels** - High detail
- ~~256x256 pixels~~ - Removed (too large)
- ~~512x512 pixels~~ - Removed (too large)

### **Dynamic Grid Calculation**
```javascript
// The pixel editor automatically calculates grid size based on tile size
const gridSize = APP_CONFIG.PIXEL_EDITOR.CANVAS_SIZE / tileSize;

// Example: For 32x32 tiles on 512px canvas
// gridSize = 512 / 32 = 16x16 grid

// Example: For 64x64 tiles on 512px canvas  
// gridSize = 512 / 64 = 8x8 grid
```

### **Canvas Dimensions**
```
Canvas: 1024x1024 pixels
├── 32x32 tiles: 32x32 tiles (1024/32 = 32)
├── 64x64 tiles: 16x16 tiles (1024/64 = 16)  
└── 128x128 tiles: 8x8 tiles (1024/128 = 8)
```

## 🔄 **Tile Editing Workflow**

### **1. Tile Selection**
```
User clicks on canvas → CanvasViewer detects tile coordinates → 
TileEditorManager opens editor with tile data
```

### **2. Editor Initialization**
```javascript
async openTileEditor(tile) {
    // Clear previous state to prevent data bleeding
    this.clearPixelEditorState();
    
    // Set current tile
    this.currentTile = tile;
    
    // Initialize pixel editor with correct tile size
    const canvasData = await this.getCanvasData(tile.canvas_id);
    window.PixelEditor.init(canvas, canvasData.tile_size);
    
    // Load tile pixel data
    if (tile.pixel_data) {
        window.PixelEditor.loadPixelData(tile.pixel_data);
    }
    
    // Load neighbor tiles for context
    await this.loadNeighborTiles(tile);
}
```

### **3. Neighbor Tile Display**
```
┌─────────┬─────────┬─────────┐
│   TL    │    T    │   TR    │
├─────────┼─────────┼─────────┤
│    L    │ CURRENT │    R    │
├─────────┼─────────┼─────────┤
│   BL    │    B    │   BR    │
└─────────┘─────────┘─────────┘

TL = Top Left    T = Top      TR = Top Right
L = Left         CURRENT      R = Right  
BL = Bottom Left B = Bottom   BR = Bottom Right
```

### **4. Drawing & Saving**
```javascript
async saveTile(tileId) {
    // Validate tile ID to prevent wrong tile saves
    if (this.currentTile.id !== tileId) {
        throw new Error('TILE ID MISMATCH: Cannot save to different tile');
    }
    
    // Get current pixel data
    const pixelData = window.PixelEditor.getPixelData();
    
    // Validate pixel data dimensions
    const expectedLength = this.currentTile.tile_size;
    if (pixelData.length !== expectedLength) {
        throw new Error(`Invalid pixel data - expected length: ${expectedLength} got: ${pixelData.length}`);
    }
    
    // Save to backend
    const response = await this.apiService.update(tileId, {
        pixel_data: JSON.stringify(pixelData)
    });
    
    // Update current tile with response data
    this.currentTile = response.tile;
    
    // Clear undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];
}
```

## 🔒 **Tile Locking System**

### **Concurrent Editing Prevention**
- **One user per tile** - Only the tile owner can edit
- **Automatic locking** - Tile is locked when editing begins
- **Lock expiration** - Locks expire after 30 minutes of inactivity or whenever user is done editing, or backs out of editor
- **Conflict resolution** - Other users see "Tile is being edited" message

### **Lock States**
```javascript
// Tile lock states
const lockStates = {
    AVAILABLE: 'available',      // No one is editing
    LOCKED: 'locked',           // Someone is currently editing
    EXPIRED: 'expired',         // Lock has expired
    CONFLICT: 'conflict'        // Multiple users tried to edit
};
```

## 🎨 **Collaboration Modes**

### **Free Mode**
- Any user can edit any tile
- No ownership restrictions
- Real-time collaboration

### **Tile Lock Mode**
- Users can only edit tiles they own
- Tiles are automatically assigned
- Prevents conflicts

### **Area Lock Mode**
- Users can edit tiles in assigned areas
- Area-based collaboration
- Moderate restrictions

### **Review Mode**
- Changes require approval
- Moderated collaboration
- Quality control

## 📊 **Performance Optimizations**

### **Viewport Rendering**
```javascript
// Only render tiles visible in viewport
const visibleTiles = this.getVisibleTiles(viewportX, viewportY, viewportWidth, viewportHeight);

// Cache visible tiles for performance
if (this.visibleTilesCacheKey !== cacheKey) {
    this.visibleTilesCache = visibleTiles;
    this.visibleTilesCacheKey = cacheKey;
}
```

### **Tile Data Caching**
- **Active tiles** cached in memory
- **Neighbor tiles** cached during editing
- **Canvas metadata** cached for quick access

### **WebSocket Updates**
- **Real-time updates** for tile changes
- **Efficient broadcasting** to relevant users
- **Connection pooling** for multiple users

## 🚨 **Common Issues & Solutions**

### **Pixel Data Bleeding**
**Problem**: Pixel data from one tile appears in another tile
**Solution**: Always call `clearPixelEditorState()` before loading new tiles

### **Tile Size Mismatch**
**Problem**: Editor shows wrong dimensions for tile
**Solution**: Pass correct `tile_size` to `PixelEditor.init()`

### **Coordinate Confusion**
**Problem**: Wrong tile coordinates displayed
**Solution**: Use `getTileAtPosition()` with proper boundary checking

### **Performance Degradation**
**Problem**: Canvas becomes slow with many tiles
**Solution**: Implement viewport rendering and tile caching

## 🔗 **Related Documentation**

- **[MANAGER-PATTERN-GUIDE.md](./MANAGER-PATTERN-GUIDE.md)** - How managers handle tile/canvas operations
- **[EVENT-SYSTEM-GUIDE.md](./EVENT-SYSTEM-GUIDE.md)** - How tiles communicate via events
- **[ARCHITECTURE-GUIDE.md](./ARCHITECTURE-GUIDE.md)** - Overall system architecture
- **[ADMIN-PANEL-IMPLEMENTATION.md](./ADMIN-PANEL-IMPLEMENTATION.md)** - Admin tools for managing tiles/canvases

## 📝 **Best Practices**

### **Tile Editing**
1. **Always clear state** before loading new tiles
2. **Validate tile ID** before saving
3. **Check pixel data dimensions** match expected tile size
4. **Use proper error handling** for all operations

### **Canvas Management**
1. **Implement viewport rendering** for performance
2. **Cache frequently accessed data**
3. **Use WebSocket for real-time updates**
4. **Implement proper cleanup** for memory management

### **Performance**
1. **Only render visible tiles**
2. **Cache tile data appropriately**
3. **Use efficient data structures**
4. **Implement proper cleanup intervals**

---

## 🎯 **Remember**

**This guide explains the core tile and canvas system. Always reference it when:**
- Implementing tile-related features
- Debugging tile editing issues
- Understanding canvas structure
- Working with pixel data
- Implementing collaboration features

**When in doubt, check this guide first!**
