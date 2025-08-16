# 🎯 Event System Guide

## 📋 **Overview**
The Event System is the backbone of communication between different components in StellarCollabApp. It follows the **Observer Pattern** and provides a centralized way for managers, services, and UI components to communicate without tight coupling.

## 🏗️ **Architecture**

### **Core Components**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EventManager  │    │   Event         │    │   Event         │
│   (Singleton)   │◄──►│   Emitters      │◄──►│   Listeners     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   Event Bus     │◄─────────────┘
                        │   (Central Hub) │
                        └─────────────────┘
```

### **Event Flow**
```
Component A → EventManager.emit('eventName', data)
                    ↓
EventManager notifies all listeners
                    ↓
Component B (listener) receives event and data
                    ↓
Component B updates its state/UI
```

## 🔧 **Implementation**

### **File Location**
- **Primary**: `frontend/js/utils/events.js`
- **Global Access**: `window.eventManager`
- **Manager Integration**: Passed to all managers in constructor

### **Core Methods**

#### **`on(eventName, callback)`**
```javascript
/**
 * Register an event listener
 * @param {string} eventName - Name of the event to listen for
 * @param {Function} callback - Function to execute when event occurs
 * @returns {Function} Unsubscribe function
 */
eventManager.on('userLogin', (userData) => {
    console.log('User logged in:', userData);
    this.refreshUserInterface();
});

// Store unsubscribe function for cleanup
this.unsubscribe = eventManager.on('userLogin', this.handleLogin.bind(this));
```

#### **`emit(eventName, data)`**
```javascript
/**
 * Trigger an event and notify all listeners
 * @param {string} eventName - Name of the event to emit
 * @param {*} data - Data to pass to event listeners
 */
eventManager.emit('userLogin', {
    id: 123,
    username: 'john_doe',
    email: 'john@example.com'
});
```

#### **`off(eventName, callback)`**
```javascript
/**
 * Remove a specific event listener
 * @param {string} eventName - Name of the event
 * @param {Function} callback - Specific callback to remove
 */
eventManager.off('userLogin', this.handleLogin.bind(this));
```

#### **`once(eventName, callback)`**
```javascript
/**
 * Register a one-time event listener (auto-removes after first execution)
 * @param {string} eventName - Name of the event
 * @param {Function} callback - Function to execute once
 */
eventManager.once('appReady', () => {
    console.log('App is ready!');
    this.initializeComponents();
});
```

## 📝 **Event Naming Convention**

### **Format**: `[entity][action]`
- **Entity**: The object or system being affected
- **Action**: What is happening to the entity

### **Examples**
```javascript
// Authentication Events
'userLogin'           // User successfully logs in
'userLogout'          // User logs out
'tokenExpired'        // Authentication token expires
'userRegistered'      // New user account created

// Canvas Events
'canvasCreated'        // New canvas is created
'canvasUpdated'        // Canvas properties are modified
'canvasDeleted'        // Canvas is removed
'canvasOpened'         // User opens a canvas for editing

// Tile Events
'tileLocked'          // Tile is locked for editing
'tileUnlocked'        // Tile lock is released
'tileUpdated'         // Tile pixel data is modified
'tileSaved'           // Tile changes are saved

// System Events
'appReady'            // Application is fully initialized
'error'               // An error occurs
'loadingStateChanged' // Loading state changes
'websocketConnected'  // WebSocket connection established
'websocketDisconnected' // WebSocket connection lost
```

### **Event Data Contracts**

#### **User Events**
```javascript
/**
 * @event userLogin
 * @data {Object} user - User data
 * @data {number} user.id - User ID
 * @data {string} user.username - Username
 * @data {string} user.email - User email
 * @data {Array<string>} user.roles - User roles (e.g., ['user', 'admin'])
 * @data {string} user.created_at - Account creation timestamp
 */
eventManager.emit('userLogin', {
    id: 123,
    username: 'john_doe',
    email: 'john@example.com',
    roles: ['user', 'admin'],
    created_at: '2024-01-15T10:30:00Z'
});
```

#### **Canvas Events**
```javascript
/**
 * @event canvasCreated
 * @data {Object} canvas - Canvas data
 * @data {number} canvas.id - Canvas ID
 * @data {string} canvas.name - Canvas name
 * @data {number} canvas.width - Canvas width in pixels
 * @data {number} canvas.height - Canvas height in pixels
 * @data {number} canvas.tile_size - Size of each tile
 * @data {string} canvas.palette_type - Color palette type
 */
eventManager.emit('canvasCreated', {
    id: 456,
    name: 'My Awesome Canvas',
    width: 1024,
    height: 1024,
    tile_size: 64,
    palette_type: 'classic'
});
```

#### **Tile Events**
```javascript
/**
 * @event tileUpdated
 * @data {Object} tile - Tile data
 * @data {number} tile.id - Tile ID
 * @data {number} tile.canvas_id - Parent canvas ID
 * @data {number} tile.x - X coordinate on canvas
 * @data {number} tile.y - Y coordinate on canvas
 * @data {Array} tile.pixel_data - 2D array of pixel colors
 * @data {number} tile.user_id - User who modified the tile
 */
eventManager.emit('tileUpdated', {
    id: 789,
    canvas_id: 456,
    x: 8,
    y: 8,
    pixel_data: [[255, 0, 0, 255], [0, 255, 0, 255]],
    user_id: 123
});
```

## 🔌 **Integration Patterns**

### **1. Manager Integration**
```javascript
export class ExampleManager {
    constructor(dependencies) {
        this.eventManager = dependencies.eventManager;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for events from other components
        this.eventManager.on('userLogin', this.handleUserLogin.bind(this));
        this.eventManager.on('canvasCreated', this.handleCanvasCreated.bind(this));
        
        // Store unsubscribe functions for cleanup
        this.unsubscribers = [
            this.eventManager.on('userLogout', this.handleUserLogout.bind(this))
        ];
    }
    
    handleUserLogin(userData) {
        console.log('User logged in, updating manager state');
        this.currentUser = userData;
        this.refreshData();
    }
    
    handleCanvasCreated(canvasData) {
        console.log('New canvas created, updating list');
        this.addCanvasToList(canvasData);
    }
    
    // Emit events when this manager's state changes
    createNewItem(itemData) {
        // Business logic...
        const newItem = await this.apiService.create(itemData);
        
        // Emit event for other components
        this.eventManager.emit('itemCreated', newItem);
        
        return newItem;
    }
    
    // Cleanup when manager is destroyed
    destroy() {
        // Remove all event listeners
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
}
```

### **2. AppState Integration**
```javascript
class AppState {
    setAuthenticated(user) {
        this.update({
            isAuthenticated: true,
            currentUser: user
        });
        
        // Emit event for other components
        if (window.eventManager && window.eventManager.emit) {
            window.eventManager.emit('userLogin', user);
        }
    }
    
    setUnauthenticated() {
        this.update({
            isAuthenticated: false,
            currentUser: null
        });
        
        // Emit event for other components
        if (window.eventManager && window.eventManager.emit) {
            window.eventManager.emit('userLogout');
        }
    }
}
```

### **3. UI Component Integration**
```javascript
class UIComponent {
    constructor() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for events that should update the UI
        window.eventManager.on('userLogin', this.handleUserLogin.bind(this));
        window.eventManager.on('canvasListUpdated', this.refreshCanvasList.bind(this));
    }
    
    handleUserLogin(userData) {
        // Update UI to show user is logged in
        this.showUserInfo(userData);
        this.enableUserFeatures();
    }
    
    refreshCanvasList() {
        // Refresh the canvas list display
        this.loadAndDisplayCanvases();
    }
}
```

## 🚀 **Event Flow Examples**

### **User Authentication Flow**
```
1. User submits login form
   ↓
2. AuthManager.handleLogin() called
   ↓
3. API call to backend
   ↓
4. On success: appState.setAuthenticated(user)
   ↓
5. AppState emits 'userLogin' event
   ↓
6. EventManager notifies all listeners
   ↓
7. AdminPanelManager receives event → refreshes admin panel
   ↓
8. CanvasListManager receives event → loads user's canvases
   ↓
9. UI components receive event → update display
```

### **Canvas Creation Flow**
```
1. User clicks "Create Canvas" button
   ↓
2. CanvasListManager.handleCreateCanvas() called
   ↓
3. API call to backend
   ↓
4. On success: emit('canvasCreated', canvasData)
   ↓
5. EventManager notifies all listeners
   ↓
6. CanvasViewerManager receives event → updates canvas list
   ↓
7. AdminPanelManager receives event → updates statistics
   ↓
8. UI components receive event → show success message
```

### **Tile Editing Flow**
```
1. User clicks on tile in canvas
   ↓
2. CanvasViewerManager.onTileClick() called
   ↓
3. TileEditorManager.openTileEditor() called
   ↓
4. User modifies tile and saves
   ↓
5. TileEditorManager.saveTile() called
   ↓
6. API call to backend
   ↓
7. On success: emit('tileUpdated', tileData)
   ↓
8. EventManager notifies all listeners
   ↓
9. CanvasViewerManager receives event → updates tile display
   ↓
10. WebSocketManager receives event → broadcasts to other users
```

## ✅ **Best Practices**

### **Event Design**
- **Use descriptive names**: `userLogin` not `login`
- **Be specific**: `canvasCreated` not `itemAdded`
- **Use present tense**: `userLogsIn` not `userLoggedIn`
- **Group related events**: `tileLocked`, `tileUnlocked`, `tileUpdated`

### **Data Structure**
- **Always pass relevant data**: Don't emit empty events
- **Use consistent data formats**: Same structure for similar events
- **Include IDs**: Always include entity IDs for reference
- **Document data contracts**: Use JSDoc comments

### **Performance**
- **Limit listener count**: Don't add unnecessary listeners
- **Clean up listeners**: Always remove listeners when components are destroyed
- **Use once() for one-time events**: `appReady`, `initialized`
- **Batch related events**: Group multiple updates into one event

### **Error Handling**
- **Handle missing eventManager**: Check if available before using
- **Validate event data**: Ensure data matches expected format
- **Log event errors**: Track failed event emissions
- **Fallback gracefully**: Provide alternative behavior when events fail

## ❌ **Common Anti-Patterns**

### **Don't Do This**
```javascript
// ❌ Generic event names
eventManager.emit('update', data);
eventManager.emit('change', newValue);

// ❌ Emitting without data
eventManager.emit('userLogin');

// ❌ Forgetting to clean up listeners
eventManager.on('event', this.handler.bind(this));
// Component destroyed without cleanup

// ❌ Circular event dependencies
// Component A emits → Component B listens and emits → Component A listens
```

### **Do This Instead**
```javascript
// ✅ Specific event names
eventManager.emit('userLogin', userData);
eventManager.emit('canvasUpdated', canvasData);

// ✅ Always include relevant data
eventManager.emit('userLogin', {
    id: user.id,
    username: user.username,
    timestamp: new Date().toISOString()
});

// ✅ Proper cleanup
this.unsubscribers = [
    eventManager.on('event', this.handler.bind(this))
];

destroy() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
}

// ✅ Linear event flow
// Component A emits → Component B listens and updates state
// Component B emits → Component C listens and updates UI
```

## 🧪 **Testing Events**

### **Unit Testing**
```javascript
describe('ExampleManager', () => {
    let manager;
    let mockEventManager;
    
    beforeEach(() => {
        mockEventManager = {
            on: jest.fn(),
            emit: jest.fn(),
            off: jest.fn()
        };
        
        manager = new ExampleManager({
            eventManager: mockEventManager
        });
    });
    
    test('should emit event when item is created', async () => {
        const itemData = { name: 'Test Item' };
        
        await manager.createItem(itemData);
        
        expect(mockEventManager.emit).toHaveBeenCalledWith(
            'itemCreated',
            expect.objectContaining({ name: 'Test Item' })
        );
    });
    
    test('should listen for relevant events', () => {
        expect(mockEventManager.on).toHaveBeenCalledWith(
            'userLogin',
            expect.any(Function)
        );
    });
});
```

### **Integration Testing**
```javascript
describe('Event System Integration', () => {
    test('should propagate events between components', async () => {
        // Create real event manager
        const eventManager = new EventManager();
        eventManager.init();
        
        // Create managers
        const authManager = new AuthManager(mockApi, eventManager);
        const adminManager = new AdminPanelManager();
        
        // Set up listeners
        adminManager.setupEventListeners();
        
        // Trigger event
        authManager.handleLoginSuccess(userData);
        
        // Verify event was received
        expect(adminManager.refreshAfterLogin).toHaveBeenCalled();
    });
});
```

## 🔍 **Debugging Events**

### **Enable Event Logging**
```javascript
// In development, log all events
if (process.env.NODE_ENV === 'development') {
    const originalEmit = eventManager.emit;
    eventManager.emit = function(eventName, data) {
        console.log(`🎯 Event emitted: ${eventName}`, data);
        return originalEmit.call(this, eventName, data);
    };
}
```

### **Event Listener Debugging**
```javascript
// Check what listeners are registered
console.log('Active listeners:', eventManager.listeners);

// Check specific event listeners
console.log('userLogin listeners:', eventManager.listeners.get('userLogin'));
```

### **Common Issues**
1. **Event not firing**: Check if `emit()` is being called
2. **Listener not receiving**: Check if `on()` was called with correct event name
3. **Data missing**: Verify data is being passed to `emit()`
4. **Memory leaks**: Ensure listeners are cleaned up

## 📚 **Reference**

### **Event Manager Methods**
- `on(eventName, callback)` - Register listener
- `emit(eventName, data)` - Fire event
- `off(eventName, callback)` - Remove listener
- `once(eventName, callback)` - One-time listener
- `init()` - Initialize the event manager
- `destroy()` - Clean up all listeners

### **Global Access**
```javascript
// Available globally after managers are created
window.eventManager.on('eventName', callback);
window.eventManager.emit('eventName', data);
```

### **Integration Points**
- **Managers**: Receive in constructor, use for communication
- **AppState**: Emit events on state changes
- **UI Components**: Listen for events to update display
- **Services**: Emit events on data changes

---

## 🔄 **Maintenance**

### **Regular Audits**
- **Monthly**: Check for unused events
- **Quarterly**: Review event contracts
- **Before releases**: Verify event flow
- **After bugs**: Document event-related issues

### **Documentation Updates**
- **New events**: Add to this guide
- **Data changes**: Update contracts
- **New patterns**: Document examples
- **Bug fixes**: Document solutions

This guide should be updated whenever the event system changes or new patterns emerge.
