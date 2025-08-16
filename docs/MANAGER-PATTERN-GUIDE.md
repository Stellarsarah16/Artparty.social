# 🧩 Manager Pattern Guide

## 📋 **Overview**
The Manager Pattern is the core architectural pattern used in StellarCollabApp. Each manager is responsible for a specific domain (users, canvases, tiles, etc.) and coordinates between the UI, business logic, and external services.

## 🏗️ **Architecture**

### **Manager Hierarchy**
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ AuthManager │ │CanvasManager│ │TileManager  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  AuthAPI    │ │ CanvasAPI   │ │  TileAPI    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    Event System                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                EventManager                         │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Backend API                            │
└─────────────────────────────────────────────────────────────┘
```

### **Manager Responsibilities**
- **State Management**: Maintain local state for their domain
- **Event Coordination**: Emit and listen for events
- **API Integration**: Coordinate with backend services
- **UI Updates**: Trigger UI changes when state changes
- **Business Logic**: Handle domain-specific operations

## 🔧 **Implementation Template**

### **Basic Manager Structure**
```javascript
/**
 * [Domain] Manager
 * Handles [domain] operations and state
 */
export class ExampleManager {
    constructor(dependencies) {
        // Store dependencies
        this.apiService = dependencies.apiService;
        this.eventManager = dependencies.eventManager;
        
        // Initialize state
        this.state = {
            items: [],
            loading: false,
            error: null
        };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the manager
     */
    async init() {
        try {
            this.setLoading(true);
            await this.loadInitialData();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Set up event listeners for communication with other managers
     */
    setupEventListeners() {
        // Listen for events from other components
        this.eventManager.on('userLogin', this.handleUserLogin.bind(this));
        this.eventManager.on('userLogout', this.handleUserLogout.bind(this));
        
        // Store unsubscribe functions for cleanup
        this.unsubscribers = [
            this.eventManager.on('appReady', this.handleAppReady.bind(this))
        ];
    }
    
    /**
     * Handle user login event
     */
    handleUserLogin(userData) {
        console.log('User logged in, updating manager state');
        this.currentUser = userData;
        this.refreshData();
    }
    
    /**
     * Handle user logout event
     */
    handleUserLogout() {
        console.log('User logged out, clearing manager state');
        this.currentUser = null;
        this.clearData();
    }
    
    /**
     * Load initial data for the manager
     */
    async loadInitialData() {
        if (!this.currentUser) {
            console.log('No user authenticated, skipping data load');
            return;
        }
        
        try {
            const data = await this.apiService.list();
            this.setState({ items: data });
            
            // Emit event for other components
            this.eventManager.emit('dataLoaded', { count: data.length });
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Create a new item
     */
    async createItem(itemData) {
        try {
            this.setLoading(true);
            
            // Validate data
            this.validateItemData(itemData);
            
            // Call API
            const newItem = await this.apiService.create(itemData);
            
            // Update local state
            this.setState({
                items: [...this.state.items, newItem]
            });
            
            // Emit event for other components
            this.eventManager.emit('itemCreated', newItem);
            
            return newItem;
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Update an existing item
     */
    async updateItem(itemId, updateData) {
        try {
            this.setLoading(true);
            
            // Call API
            const updatedItem = await this.apiService.update(itemId, updateData);
            
            // Update local state
            this.setState({
                items: this.state.items.map(item => 
                    item.id === itemId ? updatedItem : item
                )
            });
            
            // Emit event for other components
            this.eventManager.emit('itemUpdated', updatedItem);
            
            return updatedItem;
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Delete an item
     */
    async deleteItem(itemId) {
        try {
            this.setLoading(true);
            
            // Call API
            await this.apiService.delete(itemId);
            
            // Update local state
            this.setState({
                items: this.state.items.filter(item => item.id !== itemId)
            });
            
            // Emit event for other components
            this.eventManager.emit('itemDeleted', { id: itemId });
            
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    /**
     * Refresh data from the server
     */
    async refreshData() {
        await this.loadInitialData();
    }
    
    /**
     * Clear all data (e.g., on logout)
     */
    clearData() {
        this.setState({
            items: [],
            error: null
        });
    }
    
    /**
     * Set loading state
     */
    setLoading(loading) {
        this.setState({ loading });
    }
    
    /**
     * Handle errors
     */
    handleError(error) {
        console.error('Manager error:', error);
        this.setState({ error: error.message });
        
        // Emit error event for other components
        this.eventManager.emit('error', {
            source: this.constructor.name,
            error: error.message
        });
    }
    
    /**
     * Update state and notify listeners
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        
        // Emit state change event
        this.eventManager.emit('stateChanged', {
            manager: this.constructor.name,
            state: this.state
        });
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Get specific state property
     */
    get(property) {
        return this.state[property];
    }
    
    /**
     * Validate item data before sending to API
     */
    validateItemData(itemData) {
        if (!itemData.name) {
            throw new Error('Item name is required');
        }
        
        if (itemData.name.length < 3) {
            throw new Error('Item name must be at least 3 characters');
        }
    }
    
    /**
     * Clean up resources when manager is destroyed
     */
    destroy() {
        // Remove all event listeners
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        
        // Clear state
        this.clearData();
        
        console.log('Manager destroyed and cleaned up');
    }
}
```

## 🔌 **Dependency Injection**

### **Constructor Dependencies**
```javascript
export class ExampleManager {
    constructor(dependencies) {
        // Required dependencies
        this.apiService = dependencies.apiService;
        this.eventManager = dependencies.eventManager;
        
        // Optional dependencies with defaults
        this.config = dependencies.config || {};
        this.logger = dependencies.logger || console;
        
        // Validate required dependencies
        if (!this.apiService) {
            throw new Error('apiService is required');
        }
        
        if (!this.eventManager) {
            throw new Error('eventManager is required');
        }
    }
}
```

### **Dependency Types**
```javascript
// API Services
this.apiService = dependencies.apiService;        // REST API client
this.websocketService = dependencies.websocket;   // WebSocket client

// Event System
this.eventManager = dependencies.eventManager;    // Event bus

// Configuration
this.config = dependencies.config;                // Manager-specific config
this.appConfig = dependencies.appConfig;          // App-wide config

// Utilities
this.logger = dependencies.logger;                // Logging utility
this.validator = dependencies.validator;          // Data validation
this.cache = dependencies.cache;                  // Caching utility
```

## 📡 **Event Integration**

### **Event Emission Patterns**
```javascript
// State change events
this.eventManager.emit('itemCreated', newItem);
this.eventManager.emit('itemUpdated', updatedItem);
this.eventManager.emit('itemDeleted', { id: itemId });

// Status events
this.eventManager.emit('loadingStarted');
this.eventManager.emit('loadingFinished');
this.eventManager.emit('error', { message: 'Something went wrong' });

// Business events
this.eventManager.emit('userAction', { action: 'create', target: 'item' });
this.eventManager.emit('dataRefreshed', { count: this.state.items.length });
```

### **Event Listening Patterns**
```javascript
setupEventListeners() {
    // Authentication events
    this.eventManager.on('userLogin', this.handleUserLogin.bind(this));
    this.eventManager.on('userLogout', this.handleUserLogout.bind(this));
    
    // Related domain events
    this.eventManager.on('itemCreated', this.handleItemCreated.bind(this));
    this.eventManager.on('itemUpdated', this.handleItemUpdated.bind(this));
    
    // System events
    this.eventManager.on('appReady', this.handleAppReady.bind(this));
    this.eventManager.on('error', this.handleGlobalError.bind(this));
    
    // Store unsubscribe functions
    this.unsubscribers = [
        this.eventManager.on('websocketConnected', this.handleWebSocketConnected.bind(this))
    ];
}
```

## 🗃️ **State Management**

### **State Structure**
```javascript
this.state = {
    // Data
    items: [],              // Main data array
    currentItem: null,      // Currently selected item
    
    // UI State
    loading: false,         // Loading indicator
    error: null,            // Error message
    selectedIds: [],        // Selected item IDs
    
    // Pagination
    page: 1,               // Current page
    pageSize: 20,          // Items per page
    totalCount: 0,         // Total items available
    
    // Filters
    filters: {},            // Active filters
    sortBy: 'name',        // Sort field
    sortOrder: 'asc'       // Sort direction
};
```

### **State Update Methods**
```javascript
// Update single property
setState(property, value) {
    this.state[property] = value;
    this.emitStateChange();
}

// Update multiple properties
setState(updates) {
    this.state = { ...this.state, ...updates };
    this.emitStateChange();
}

// Reset to initial state
resetState() {
    this.state = this.getInitialState();
    this.emitStateChange();
}

// Get initial state
getInitialState() {
    return {
        items: [],
        loading: false,
        error: null,
        // ... other initial values
    };
}
```

## 🔄 **Lifecycle Management**

### **Initialization Flow**
```javascript
async init() {
    try {
        console.log('Initializing manager...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data if user is authenticated
        if (this.shouldLoadInitialData()) {
            await this.loadInitialData();
        }
        
        // Mark as initialized
        this.initialized = true;
        
        console.log('Manager initialized successfully');
    } catch (error) {
        console.error('Failed to initialize manager:', error);
        this.handleError(error);
    }
}

shouldLoadInitialData() {
    // Check if we have required dependencies
    return this.currentUser && this.apiService;
}
```

### **Cleanup Flow**
```javascript
destroy() {
    console.log('Destroying manager...');
    
    // Remove event listeners
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    
    // Clear timers/intervals
    if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
    }
    
    // Clear state
    this.clearData();
    
    // Mark as destroyed
    this.destroyed = true;
    
    console.log('Manager destroyed successfully');
}
```

## 🧪 **Testing Patterns**

### **Unit Testing**
```javascript
describe('ExampleManager', () => {
    let manager;
    let mockApiService;
    let mockEventManager;
    
    beforeEach(() => {
        // Create mocks
        mockApiService = {
            list: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };
        
        mockEventManager = {
            on: jest.fn(),
            emit: jest.fn(),
            off: jest.fn()
        };
        
        // Create manager instance
        manager = new ExampleManager({
            apiService: mockApiService,
            eventManager: mockEventManager
        });
    });
    
    afterEach(() => {
        if (manager && !manager.destroyed) {
            manager.destroy();
        }
    });
    
    test('should initialize with dependencies', () => {
        expect(manager.apiService).toBe(mockApiService);
        expect(manager.eventManager).toBe(mockEventManager);
    });
    
    test('should set up event listeners on init', () => {
        expect(mockEventManager.on).toHaveBeenCalledWith(
            'userLogin',
            expect.any(Function)
        );
    });
    
    test('should emit event when item is created', async () => {
        const itemData = { name: 'Test Item' };
        mockApiService.create.mockResolvedValue({ id: 1, ...itemData });
        
        await manager.createItem(itemData);
        
        expect(mockEventManager.emit).toHaveBeenCalledWith(
            'itemCreated',
            expect.objectContaining({ name: 'Test Item' })
        );
    });
    
    test('should handle API errors gracefully', async () => {
        const error = new Error('API Error');
        mockApiService.list.mockRejectedValue(error);
        
        await manager.loadInitialData();
        
        expect(manager.state.error).toBe('API Error');
        expect(mockEventManager.emit).toHaveBeenCalledWith(
            'error',
            expect.objectContaining({ error: 'API Error' })
        );
    });
});
```

### **Integration Testing**
```javascript
describe('Manager Integration', () => {
    test('should communicate via events', async () => {
        // Create real event manager
        const eventManager = new EventManager();
        eventManager.init();
        
        // Create managers
        const authManager = new AuthManager(mockApi, eventManager);
        const exampleManager = new ExampleManager({
            apiService: mockApi,
            eventManager: eventManager
        });
        
        // Set up listeners
        exampleManager.setupEventListeners();
        
        // Trigger event
        authManager.handleLoginSuccess(userData);
        
        // Verify event was received
        expect(exampleManager.currentUser).toEqual(userData);
    });
});
```

## 📚 **Manager Examples**

### **AuthManager**
```javascript
export class AuthManager {
    constructor(apiService, eventManager) {
        this.apiService = apiService;
        this.eventManager = eventManager;
        
        this.state = {
            currentUser: null,
            isAuthenticated: false,
            loading: false,
            error: null
        };
        
        this.setupEventListeners();
    }
    
    async login(credentials) {
        try {
            this.setLoading(true);
            
            const user = await this.apiService.login(credentials);
            
            this.setState({
                currentUser: user,
                isAuthenticated: true,
                error: null
            });
            
            // Emit login event
            this.eventManager.emit('userLogin', user);
            
            return user;
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    logout() {
        this.setState({
            currentUser: null,
            isAuthenticated: false
        });
        
        // Emit logout event
        this.eventManager.emit('userLogout');
    }
}
```

### **CanvasManager**
```javascript
export class CanvasManager {
    constructor(apiService, eventManager) {
        this.apiService = apiService;
        this.eventManager = eventManager;
        
        this.state = {
            canvases: [],
            currentCanvas: null,
            loading: false,
            error: null
        };
        
        this.setupEventListeners();
    }
    
    async loadCanvases() {
        try {
            this.setLoading(true);
            
            const canvases = await this.apiService.list();
            
            this.setState({ canvases });
            
            // Emit data loaded event
            this.eventManager.emit('canvasesLoaded', { count: canvases.length });
            
            return canvases;
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    async createCanvas(canvasData) {
        try {
            this.setLoading(true);
            
            const newCanvas = await this.apiService.create(canvasData);
            
            this.setState({
                canvases: [...this.state.canvases, newCanvas]
            });
            
            // Emit canvas created event
            this.eventManager.emit('canvasCreated', newCanvas);
            
            return newCanvas;
        } catch (error) {
            this.handleError(error);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
}
```

## ✅ **Best Practices**

### **✅ DO:**
- **Single Responsibility**: Each manager handles one domain
- **Dependency Injection**: Accept dependencies in constructor
- **Event-Driven**: Use events for cross-manager communication
- **Error Handling**: Always handle errors gracefully
- **State Management**: Maintain consistent state structure
- **Cleanup**: Always clean up resources on destroy
- **Testing**: Write comprehensive tests for all methods

### **❌ DON'T:**
- **Tight Coupling**: Don't directly call other managers
- **Global State**: Don't use global variables
- **Mixed Concerns**: Don't mix UI logic with business logic
- **Memory Leaks**: Don't forget to clean up event listeners
- **Hardcoded Dependencies**: Don't hardcode service dependencies
- **Silent Failures**: Don't ignore errors

## 🔄 **Maintenance**

### **Regular Reviews**
- **Monthly**: Check for unused methods/properties
- **Quarterly**: Review event usage and dependencies
- **Before releases**: Verify manager interactions
- **After bugs**: Document patterns and solutions

### **Refactoring Guidelines**
1. **Extract common patterns** into base classes
2. **Consolidate similar managers** when appropriate
3. **Update event contracts** when data structures change
4. **Maintain backward compatibility** for public methods
5. **Document breaking changes** clearly

This guide should be updated whenever the manager pattern evolves or new patterns emerge.
